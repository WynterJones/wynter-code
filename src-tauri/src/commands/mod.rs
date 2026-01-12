pub mod search;

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::Arc;
use tauri::{Emitter, State};
use ignore::gitignore::GitignoreBuilder;
use ignore::WalkBuilder;

use crate::process_registry::ProcessRegistry;
use crate::rate_limiter::{check_rate_limit, categories};

/// Validate a session ID (UUID format or similar safe identifiers)
fn validate_session_id(session_id: &str) -> Result<(), String> {
    if session_id.is_empty() || session_id.len() > 100 {
        return Err("Invalid session ID: must be 1-100 characters".to_string());
    }

    // Session IDs should be alphanumeric with hyphens (UUID-like)
    let session_regex = Regex::new(r"^[a-zA-Z0-9][a-zA-Z0-9\-]*$").unwrap();
    if !session_regex.is_match(session_id) {
        return Err("Invalid session ID: must be alphanumeric with optional hyphens".to_string());
    }

    Ok(())
}

/// Blocked system directories that should never be accessible
/// These are sensitive locations that could be exploited for privilege escalation or data theft
pub(crate) const BLOCKED_DIRECTORIES: &[&str] = &[
    // Unix/macOS sensitive directories
    "/etc",
    "/var",
    "/root",
    "/private/etc",
    "/private/var",
    "/System",
    "/Library/Keychains",
    "/usr/local/etc",
    // Windows sensitive directories (for cross-platform safety)
    "C:\\Windows",
    "C:\\Program Files",
    "C:\\ProgramData",
    // Common sensitive files patterns
    ".ssh",
    ".gnupg",
    ".aws",
    ".azure",
    ".kube",
];

/// Blocked file patterns that should never be accessible
pub(crate) const BLOCKED_FILE_PATTERNS: &[&str] = &[
    // SSH keys and credentials
    "id_rsa",
    "id_ed25519",
    "id_ecdsa",
    "id_dsa",
    "known_hosts",
    "authorized_keys",
    // Cloud credentials
    "credentials",
    ".netrc",
    // GPG keys
    "secring.gpg",
    "private-keys",
    // Environment files with secrets
    ".env.local",
    ".env.production",
];

/// Validate a file path for safe access
/// Returns Ok(canonicalized_path) if the path is safe, Err with reason otherwise
pub(crate) fn validate_file_path(path: &str) -> Result<std::path::PathBuf, String> {
    let path_obj = Path::new(path);

    // Must be an absolute path
    if !path_obj.is_absolute() {
        return Err("Path must be absolute".to_string());
    }

    // Check for path traversal attempts in the raw path
    if path.contains("..") {
        // Canonicalize to resolve any traversal
        let canonical = path_obj.canonicalize()
            .map_err(|e| format!("Failed to resolve path: {}", e))?;

        // After canonicalization, verify the path is still safe
        return validate_file_path(&canonical.to_string_lossy());
    }

    // Get the canonical path (resolves symlinks and ..)
    let canonical = if path_obj.exists() {
        path_obj.canonicalize()
            .map_err(|e| format!("Failed to resolve path: {}", e))?
    } else {
        // For non-existent files (new files), canonicalize the parent
        let parent = path_obj.parent()
            .ok_or_else(|| "Invalid path: no parent directory".to_string())?;

        if !parent.exists() {
            return Err("Parent directory does not exist".to_string());
        }

        let canonical_parent = parent.canonicalize()
            .map_err(|e| format!("Failed to resolve parent path: {}", e))?;

        let file_name = path_obj.file_name()
            .ok_or_else(|| "Invalid path: no file name".to_string())?;

        canonical_parent.join(file_name)
    };

    let canonical_str = canonical.to_string_lossy().to_lowercase();

    // Check against blocked directories
    for blocked in BLOCKED_DIRECTORIES {
        let blocked_lower = blocked.to_lowercase();
        if canonical_str.starts_with(&blocked_lower) ||
           canonical_str.contains(&format!("/{}/", blocked_lower)) ||
           canonical_str.contains(&format!("\\{}\\", blocked_lower)) {
            return Err(format!("Access denied: path contains blocked directory '{}'", blocked));
        }
    }

    // Check against blocked file patterns
    if let Some(file_name) = canonical.file_name().and_then(|n| n.to_str()) {
        let file_name_lower = file_name.to_lowercase();
        for pattern in BLOCKED_FILE_PATTERNS {
            if file_name_lower.contains(&pattern.to_lowercase()) {
                return Err(format!("Access denied: file matches blocked pattern '{}'", pattern));
            }
        }
    }

    // Ensure the path is within the user's home directory or common project directories
    if let Some(home) = dirs::home_dir() {
        let home_str = home.to_string_lossy().to_lowercase();

        // Allow paths within home directory
        if canonical_str.starts_with(&home_str) {
            return Ok(canonical);
        }

        // Also allow common development directories
        let allowed_prefixes = [
            "/tmp",
            "/private/tmp",  // macOS temp
            "/var/folders",  // macOS temp folders
            "/users",        // macOS users (for other user access if permitted)
            "/home",         // Linux home directories
        ];

        for prefix in allowed_prefixes {
            if canonical_str.starts_with(prefix) {
                return Ok(canonical);
            }
        }
    }

    // If we can't determine home dir, be more permissive but still block sensitive paths
    // The blocked directories check above provides protection
    Ok(canonical)
}

/// Validate an npm package name against npm naming rules
/// Returns Ok(()) if valid, Err with reason otherwise
fn validate_npm_package_name(name: &str) -> Result<(), String> {
    // Empty check
    if name.is_empty() {
        return Err("Package name cannot be empty".to_string());
    }

    // Length check (npm limit is 214 characters)
    if name.len() > 214 {
        return Err("Package name too long (max 214 characters)".to_string());
    }

    // Check for shell injection characters
    const DANGEROUS_CHARS: &[char] = &[
        ';', '&', '|', '$', '`', '(', ')', '{', '}', '[', ']',
        '<', '>', '!', '\\', '"', '\'', '\n', '\r', '\t', ' ',
    ];

    for c in DANGEROUS_CHARS {
        if name.contains(*c) {
            return Err(format!("Package name contains invalid character: '{}'", c));
        }
    }

    // npm package name rules:
    // - Can start with @ for scoped packages
    // - Scoped format: @scope/package-name
    // - Can contain: a-z, 0-9, -, _, .
    // - Cannot start with . or _

    if name.starts_with('@') {
        // Scoped package validation
        let parts: Vec<&str> = name[1..].splitn(2, '/').collect();
        if parts.len() != 2 {
            return Err("Invalid scoped package name: must be @scope/package".to_string());
        }

        let scope = parts[0];
        let package = parts[1];

        // Validate scope
        let scope_regex = Regex::new(r"^[a-z0-9][a-z0-9\-_.]*$").unwrap();
        if !scope_regex.is_match(scope) {
            return Err("Invalid scope name: must start with alphanumeric and contain only a-z, 0-9, -, _, .".to_string());
        }

        // Validate package part
        let package_regex = Regex::new(r"^[a-z0-9][a-z0-9\-_.]*$").unwrap();
        if !package_regex.is_match(package) {
            return Err("Invalid package name: must start with alphanumeric and contain only a-z, 0-9, -, _, .".to_string());
        }
    } else {
        // Non-scoped package validation
        if name.starts_with('.') || name.starts_with('_') {
            return Err("Package name cannot start with . or _".to_string());
        }

        let package_regex = Regex::new(r"^[a-z0-9][a-z0-9\-_.]*$").unwrap();
        if !package_regex.is_match(name) {
            return Err("Invalid package name: must start with alphanumeric and contain only a-z, 0-9, -, _, .".to_string());
        }
    }

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFile {
    pub name: String,
    pub file: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFileStatus {
    pub path: String,
    pub status: String, // "new", "modified", "deleted", "renamed", "untracked"
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatusResult {
    pub git_root: String,
    pub files: Vec<GitFileStatus>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub children: Option<Vec<FileNode>>,
    pub is_ignored: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeModule {
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub is_dev: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OutdatedInfo {
    pub current: String,
    pub wanted: String,
    pub latest: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NpmSearchResult {
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub date: Option<String>,
    pub keywords: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MarkdownFile {
    pub name: String,
    pub path: String,
    pub folder: String,
}

#[tauri::command]
pub fn get_file_tree(path: String, depth: Option<u32>) -> Result<Vec<FileNode>, String> {
    let max_depth = depth.unwrap_or(1);
    let project_path = Path::new(&path);

    // Build gitignore matcher from project root
    let gitignore = build_gitignore(project_path);

    read_directory(&path, max_depth, 0, project_path, &gitignore)
}

fn build_gitignore(project_path: &Path) -> Option<ignore::gitignore::Gitignore> {
    let gitignore_path = project_path.join(".gitignore");
    if !gitignore_path.exists() {
        return None;
    }

    let mut builder = GitignoreBuilder::new(project_path);
    builder.add(gitignore_path);
    builder.build().ok()
}

fn is_path_gitignored(
    file_path: &Path,
    is_dir: bool,
    gitignore: &Option<ignore::gitignore::Gitignore>,
) -> bool {
    match gitignore {
        Some(gi) => gi.matched_path_or_any_parents(file_path, is_dir).is_ignore(),
        None => false,
    }
}

fn read_directory(
    path: &str,
    max_depth: u32,
    current_depth: u32,
    project_path: &Path,
    gitignore: &Option<ignore::gitignore::Gitignore>,
) -> Result<Vec<FileNode>, String> {
    let path = Path::new(path);

    if !path.exists() {
        return Err(format!("Path does not exist: {:?}", path));
    }

    if !path.is_dir() {
        return Err(format!("Path is not a directory: {:?}", path));
    }

    let mut entries: Vec<FileNode> = Vec::new();

    let read_result = fs::read_dir(path).map_err(|e| e.to_string())?;

    for entry in read_result {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();


        let is_dir = file_path.is_dir();
        let metadata = fs::metadata(&file_path).ok();
        let size = metadata.and_then(|m| if !is_dir { Some(m.len()) } else { None });

        // Check if path is gitignored
        let is_ignored = is_path_gitignored(&file_path, is_dir, gitignore);

        let children = if is_dir && current_depth < max_depth {
            read_directory(
                &file_path.to_string_lossy(),
                max_depth,
                current_depth + 1,
                project_path,
                gitignore,
            ).ok()
        } else {
            None
        };

        entries.push(FileNode {
            name: file_name,
            path: file_path.to_string_lossy().to_string(),
            is_directory: is_dir,
            size,
            children,
            is_ignored,
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[tauri::command]
pub fn read_file_content(path: String) -> Result<String, String> {
    // Validate path for security
    let validated_path = validate_file_path(&path)?;
    fs::read_to_string(&validated_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file_base64(path: String) -> Result<String, String> {
    // Validate path for security
    let validated_path = validate_file_path(&path)?;
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    let bytes = fs::read(&validated_path).map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(&bytes))
}

#[tauri::command]
pub fn write_file_content(path: String, content: String) -> Result<(), String> {
    // Validate path for security
    let validated_path = validate_file_path(&path)?;
    fs::write(&validated_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_directory(path: String) -> Result<bool, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }
    Ok(path.is_dir())
}

#[tauri::command]
pub fn find_markdown_files(project_path: String) -> Result<Vec<MarkdownFile>, String> {
    let project_path_obj = Path::new(&project_path);

    if !project_path_obj.exists() {
        return Err(format!("Path does not exist: {}", project_path));
    }

    let mut files: Vec<MarkdownFile> = Vec::new();

    // Use WalkBuilder which respects .gitignore automatically
    let walker = WalkBuilder::new(&project_path)
        .hidden(false)          // Include hidden files/dirs
        .git_ignore(true)       // Respect .gitignore
        .git_global(true)       // Respect global gitignore
        .git_exclude(true)      // Respect .git/info/exclude
        .require_git(false)     // Don't require git repo
        .build();

    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();

        // Skip directories
        if path.is_dir() {
            continue;
        }

        // Check if it's a markdown file
        let ext = path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase());

        let is_markdown = matches!(ext.as_deref(), Some("md") | Some("mdx") | Some("markdown"));

        if !is_markdown {
            continue;
        }

        // Skip files in common ignored directories (extra safety)
        let path_str = path.to_string_lossy().to_lowercase();
        if path_str.contains("/node_modules/")
            || path_str.contains("/.git/")
            || path_str.contains("/dist/")
            || path_str.contains("/build/")
            || path_str.contains("/.next/")
            || path_str.contains("/target/") {
            continue;
        }

        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let relative_path = path.strip_prefix(&project_path)
            .unwrap_or(path)
            .to_string_lossy()
            .to_string();

        let folder = Path::new(&relative_path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        files.push(MarkdownFile {
            name,
            path: path.to_string_lossy().to_string(),
            folder,
        });
    }

    // Sort by folder then name
    files.sort_by(|a, b| {
        if a.folder != b.folder {
            if a.folder.is_empty() { return std::cmp::Ordering::Less; }
            if b.folder.is_empty() { return std::cmp::Ordering::Greater; }
            return a.folder.cmp(&b.folder);
        }
        a.name.to_lowercase().cmp(&b.name.to_lowercase())
    });

    Ok(files)
}

/// Lists all files in a project for @ file mention autocomplete
/// Returns relative paths, respects .gitignore, excludes common build/dependency dirs
#[tauri::command]
pub fn list_project_files(project_path: String) -> Result<Vec<String>, String> {
    let project_path_obj = Path::new(&project_path);

    if !project_path_obj.exists() {
        return Err(format!("Path does not exist: {}", project_path));
    }

    const MAX_FILES: usize = 10_000;
    const EXCLUDED_DIRS: &[&str] = &[
        "node_modules",
        ".git",
        "dist",
        "build",
        ".next",
        "target",
        ".turbo",
        ".cache",
        "coverage",
        ".pnpm",
        "vendor",
        ".svn",
        ".hg",
        "__pycache__",
        ".pytest_cache",
        ".mypy_cache",
        "venv",
        ".venv",
        "env",
        ".tox",
    ];

    let mut files: Vec<String> = Vec::new();

    let walker = WalkBuilder::new(&project_path)
        .hidden(false)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .require_git(false)
        .build();

    for entry in walker {
        if files.len() >= MAX_FILES {
            break;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();

        if path.is_dir() {
            continue;
        }

        let path_str = path.to_string_lossy().to_lowercase();
        let should_skip = EXCLUDED_DIRS.iter().any(|dir| {
            path_str.contains(&format!("/{}/", dir)) || path_str.contains(&format!("\\{}\\", dir))
        });

        if should_skip {
            continue;
        }

        let relative_path = path
            .strip_prefix(&project_path)
            .unwrap_or(path)
            .to_string_lossy()
            .to_string();

        if !relative_path.is_empty() {
            files.push(relative_path);
        }
    }

    files.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));

    Ok(files)
}

#[tauri::command]
pub fn get_node_modules(project_path: String) -> Result<Vec<NodeModule>, String> {
    let package_json_path = Path::new(&project_path).join("package.json");

    if !package_json_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&package_json_path).map_err(|e| e.to_string())?;
    let package: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let mut modules: Vec<NodeModule> = Vec::new();

    if let Some(deps) = package.get("dependencies").and_then(|d| d.as_object()) {
        for (name, version) in deps {
            modules.push(NodeModule {
                name: name.clone(),
                version: version.as_str().unwrap_or("unknown").to_string(),
                description: get_module_description(&project_path, name),
                is_dev: false,
            });
        }
    }

    if let Some(dev_deps) = package.get("devDependencies").and_then(|d| d.as_object()) {
        for (name, version) in dev_deps {
            modules.push(NodeModule {
                name: name.clone(),
                version: version.as_str().unwrap_or("unknown").to_string(),
                description: get_module_description(&project_path, name),
                is_dev: true,
            });
        }
    }

    modules.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(modules)
}

fn get_module_description(project_path: &str, module_name: &str) -> Option<String> {
    let module_package_path = Path::new(project_path)
        .join("node_modules")
        .join(module_name)
        .join("package.json");

    if !module_package_path.exists() {
        return None;
    }

    let content = fs::read_to_string(&module_package_path).ok()?;
    let package: serde_json::Value = serde_json::from_str(&content).ok()?;
    package.get("description").and_then(|d| d.as_str()).map(|s| s.to_string())
}

#[tauri::command]
pub async fn check_outdated_packages(project_path: String) -> Result<std::collections::HashMap<String, OutdatedInfo>, String> {
    use std::collections::HashMap;

    let output = Command::new("npm")
        .args(["outdated", "--json"])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run npm outdated: {}", e))?;

    // npm outdated returns exit code 1 when there are outdated packages, so we don't check status
    let stdout = String::from_utf8_lossy(&output.stdout);

    if stdout.trim().is_empty() {
        return Ok(HashMap::new());
    }

    let json: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse npm outdated output: {}", e))?;

    let mut result: HashMap<String, OutdatedInfo> = HashMap::new();

    if let Some(obj) = json.as_object() {
        for (name, info) in obj {
            result.insert(name.clone(), OutdatedInfo {
                current: info.get("current").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
                wanted: info.get("wanted").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
                latest: info.get("latest").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
            });
        }
    }

    Ok(result)
}

#[tauri::command]
pub async fn npm_search(query: String) -> Result<Vec<NpmSearchResult>, String> {
    let output = Command::new("npm")
        .args(["search", &query, "--json", "--long"])
        .output()
        .map_err(|e| format!("Failed to run npm search: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("npm search failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    if stdout.trim().is_empty() {
        return Ok(Vec::new());
    }

    let json: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse npm search output: {}", e))?;

    let mut results: Vec<NpmSearchResult> = Vec::new();

    if let Some(arr) = json.as_array() {
        for item in arr.iter().take(20) {
            results.push(NpmSearchResult {
                name: item.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                description: item.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()),
                version: item.get("version").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                date: item.get("date").and_then(|v| v.as_str()).map(|s| s.to_string()),
                keywords: item.get("keywords").and_then(|v| v.as_array()).map(|arr| {
                    arr.iter().filter_map(|k| k.as_str().map(|s| s.to_string())).collect()
                }),
            });
        }
    }

    Ok(results)
}

fn detect_package_manager(project_path: &str) -> &'static str {
    let path = Path::new(project_path);

    if path.join("pnpm-lock.yaml").exists() {
        "pnpm"
    } else if path.join("yarn.lock").exists() {
        "yarn"
    } else if path.join("bun.lockb").exists() {
        "bun"
    } else {
        "npm"
    }
}

#[tauri::command]
pub async fn npm_install(
    project_path: String,
    package_name: String,
    is_dev: bool
) -> Result<CommandOutput, String> {
    // Rate limit check
    check_rate_limit(categories::NPM)?;

    // Validate package name to prevent shell injection
    validate_npm_package_name(&package_name)?;

    let pkg_manager = detect_package_manager(&project_path);

    let mut args: Vec<&str> = match pkg_manager {
        "yarn" => vec!["add", &package_name],
        "pnpm" => vec!["add", &package_name],
        "bun" => vec!["add", &package_name],
        _ => vec!["install", &package_name],
    };

    if is_dev {
        match pkg_manager {
            "yarn" | "pnpm" | "bun" => args.push("-D"),
            _ => args.push("--save-dev"),
        }
    }

    let output = Command::new(pkg_manager)
        .args(&args)
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run {}: {}", pkg_manager, e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        code: output.status.code().unwrap_or(-1),
    })
}

#[tauri::command]
pub async fn npm_uninstall(project_path: String, package_name: String) -> Result<CommandOutput, String> {
    // Rate limit check
    check_rate_limit(categories::NPM)?;

    // Validate package name to prevent shell injection
    validate_npm_package_name(&package_name)?;

    let pkg_manager = detect_package_manager(&project_path);

    let args: Vec<&str> = match pkg_manager {
        "yarn" => vec!["remove", &package_name],
        "pnpm" => vec!["remove", &package_name],
        "bun" => vec!["remove", &package_name],
        _ => vec!["uninstall", &package_name],
    };

    let output = Command::new(pkg_manager)
        .args(&args)
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run {}: {}", pkg_manager, e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        code: output.status.code().unwrap_or(-1),
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandOutput {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

#[derive(Clone, Serialize)]
pub struct StreamChunk {
    pub chunk_type: String,
    pub content: Option<String>,
    pub tool_name: Option<String>,
    pub tool_input: Option<String>,
    pub session_id: Option<String>,
    // Additional fields for rich UI
    pub model: Option<String>,
    pub input_tokens: Option<u64>,
    pub output_tokens: Option<u64>,
    pub cache_read_tokens: Option<u64>,
    pub cache_write_tokens: Option<u64>,
    pub cost_usd: Option<f64>,
    pub duration_ms: Option<u64>,
    pub tool_id: Option<String>,
    // Claude's session ID for conversation continuity
    pub claude_session_id: Option<String>,
    // Codex thread ID for conversation continuity
    pub thread_id: Option<String>,
    // Result message fields
    pub subtype: Option<String>,      // success, error_max_turns, error_during_execution
    pub is_error: Option<bool>,       // Error flag for result/tool_result
    pub num_turns: Option<u32>,       // Turn count
    pub duration_api_ms: Option<u64>, // API call duration
    // Init message fields
    pub permission_mode: Option<String>,
    pub tools: Option<Vec<String>>,   // Available tools list
    // Tool result fields
    pub tool_is_error: Option<bool>,  // Tool execution error flag
}

#[tauri::command]
pub async fn run_claude(prompt: String, cwd: String) -> Result<CommandOutput, String> {
    let output = Command::new("claude")
        .args(["-p", &prompt, "--output-format", "json", "--permission-mode", "default"])
        .current_dir(&cwd)
        .env("PATH", crate::path_utils::get_enhanced_path())
        .output()
        .map_err(|e| format!("Failed to execute Claude CLI: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        code: output.status.code().unwrap_or(-1),
    })
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum PermissionMode {
    #[serde(rename = "default")]
    Default,
    #[serde(rename = "plan")]
    Plan,
    #[serde(rename = "acceptEdits")]
    AcceptEdits,
    #[serde(rename = "bypassPermissions")]
    BypassPermissions,
    #[serde(rename = "manual")]
    Manual,
}

impl Default for PermissionMode {
    fn default() -> Self {
        PermissionMode::Default
    }
}

impl PermissionMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            PermissionMode::Default => "default",
            PermissionMode::Plan => "plan",
            PermissionMode::AcceptEdits => "acceptEdits",
            PermissionMode::BypassPermissions => "bypassPermissions",
            PermissionMode::Manual => "manual",
        }
    }
}

#[tauri::command]
pub async fn run_claude_streaming(
    window: tauri::Window,
    prompt: String,
    cwd: String,
    session_id: String,
    claude_session_id: Option<String>,
    permission_mode: Option<PermissionMode>,
) -> Result<String, String> {
    use std::io::{BufRead, BufReader};
    use std::process::Stdio;

    // Validate session IDs
    validate_session_id(&session_id)?;
    if let Some(ref claude_sid) = claude_session_id {
        validate_session_id(claude_sid)?;
    }

    let mode = permission_mode.unwrap_or_default();

    let mut args = vec![
        "-p".to_string(), prompt,
        "--output-format".to_string(), "stream-json".to_string(),
        "--verbose".to_string(),
        "--permission-mode".to_string(), mode.as_str().to_string(),
    ];

    // If we have a Claude session ID, resume that conversation
    if let Some(ref claude_sid) = claude_session_id {
        args.push("--resume".to_string());
        args.push(claude_sid.clone());
    }

    let mut child = Command::new("claude")
        .args(&args)
        .current_dir(&cwd)
        .env("PATH", crate::path_utils::get_enhanced_path())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Claude CLI: {}", e))?;

    let stdout = child.stdout.take()
        .ok_or("Failed to capture stdout")?;

    let reader = BufReader::new(stdout);
    let mut captured_claude_session_id: Option<String> = claude_session_id.clone();

    for line in reader.lines() {
        match line {
            Ok(line) if !line.is_empty() => {
                // Try to parse as JSON
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                    // Capture session ID from init message
                    if let Some(sid) = json.get("session_id").and_then(|v| v.as_str()) {
                        captured_claude_session_id = Some(sid.to_string());
                    }

                    // Only emit if we have a valid chunk (not filtered out)
                    if let Some(mut chunk) = parse_claude_chunk(&json, &session_id) {
                        // Include the claude session ID in init chunks
                        if chunk.chunk_type == "init" {
                            chunk.claude_session_id = captured_claude_session_id.clone();
                        }
                        #[cfg(debug_assertions)]
                        if let Err(e) = window.emit("claude-stream", &chunk) {
                            eprintln!("[DEBUG] Failed to emit 'claude-stream': {}", e);
                        }
                        #[cfg(not(debug_assertions))]
                        let _ = window.emit("claude-stream", &chunk);
                    }
                }
                // Skip raw text output - only use parsed JSON
            }
            Err(e) => {
                let mut chunk = create_chunk("error", &session_id);
                chunk.content = Some(format!("Read error: {}", e));
                #[cfg(debug_assertions)]
                if let Err(e) = window.emit("claude-stream", &chunk) {
                    eprintln!("[DEBUG] Failed to emit 'claude-stream': {}", e);
                }
                #[cfg(not(debug_assertions))]
                let _ = window.emit("claude-stream", &chunk);
            }
            _ => {}
        }
    }

    // Wait for process to complete
    let status = child.wait().map_err(|e| e.to_string())?;

    // Send completion event with claude session ID
    let mut chunk = create_chunk("done", &session_id);
    chunk.content = Some(format!("exit_code:{}", status.code().unwrap_or(-1)));
    chunk.claude_session_id = captured_claude_session_id.clone();
    #[cfg(debug_assertions)]
    if let Err(e) = window.emit("claude-stream", &chunk) {
        eprintln!("[DEBUG] Failed to emit 'claude-stream': {}", e);
    }
    #[cfg(not(debug_assertions))]
    let _ = window.emit("claude-stream", &chunk);

    // Return the claude session ID for future resumption
    Ok(captured_claude_session_id.unwrap_or_default())
}

pub fn create_chunk(chunk_type: &str, session_id: &str) -> StreamChunk {
    StreamChunk {
        chunk_type: chunk_type.to_string(),
        content: None,
        tool_name: None,
        tool_input: None,
        session_id: Some(session_id.to_string()),
        model: None,
        input_tokens: None,
        output_tokens: None,
        cache_read_tokens: None,
        cache_write_tokens: None,
        cost_usd: None,
        duration_ms: None,
        tool_id: None,
        claude_session_id: None,
        thread_id: None,
        // New fields
        subtype: None,
        is_error: None,
        num_turns: None,
        duration_api_ms: None,
        permission_mode: None,
        tools: None,
        tool_is_error: None,
    }
}

pub fn parse_claude_chunk(json: &serde_json::Value, session_id: &str) -> Option<StreamChunk> {
    // Handle stream_event wrapper format from Claude Code CLI
    // Format: {"type":"stream_event","event":{...actual event...}}
    let original_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");
    let json = if original_type == "stream_event" {
        if let Some(inner_event) = json.get("event") {
            inner_event
        } else {
            json
        }
    } else {
        json
    };

    let msg_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");
    let subtype = json.get("subtype").and_then(|v| v.as_str()).unwrap_or("");

    // Handle init message with model/session info
    if subtype == "init" || (msg_type.is_empty() && json.get("model").is_some()) {
        let mut chunk = create_chunk("init", session_id);
        chunk.model = json.get("model").and_then(|v| v.as_str()).map(|s| s.to_string());
        chunk.content = json.get("cwd").and_then(|v| v.as_str()).map(|s| s.to_string());
        chunk.subtype = Some("init".to_string());
        chunk.permission_mode = json.get("permissionMode").and_then(|v| v.as_str()).map(|s| s.to_string());

        // Parse tools list
        if let Some(tools) = json.get("tools").and_then(|v| v.as_array()) {
            chunk.tools = Some(
                tools
                    .iter()
                    .filter_map(|t| t.as_str().map(|s| s.to_string()))
                    .collect()
            );
        }

        return Some(chunk);
    }

    match msg_type {
        // Handle streaming text deltas
        "content_block_delta" => {
            if let Some(delta) = json.get("delta") {
                let delta_type = delta.get("type").and_then(|t| t.as_str()).unwrap_or("");
                match delta_type {
                    "text_delta" => {
                        let mut chunk = create_chunk("text", session_id);
                        chunk.content = delta.get("text").and_then(|t| t.as_str()).map(|s| s.to_string());
                        return Some(chunk);
                    }
                    "thinking_delta" => {
                        let mut chunk = create_chunk("thinking", session_id);
                        chunk.content = delta.get("thinking").and_then(|t| t.as_str()).map(|s| s.to_string());
                        return Some(chunk);
                    }
                    "input_json_delta" => {
                        let mut chunk = create_chunk("tool_input_delta", session_id);
                        chunk.content = delta.get("partial_json").and_then(|p| p.as_str()).map(|s| s.to_string());
                        return Some(chunk);
                    }
                    "signature_delta" => {
                        // Signature deltas are metadata for thinking block verification
                        // Not visible content - skip silently
                        return None;
                    }
                    _ => {
                        // Unknown delta types - skip silently
                    }
                }
            }
            None
        }

        // Handle content block start (for tool use, thinking, and text)
        "content_block_start" => {
            if let Some(content_block) = json.get("content_block") {
                let block_type = content_block.get("type").and_then(|t| t.as_str()).unwrap_or("");
                match block_type {
                    "tool_use" => {
                        let mut chunk = create_chunk("tool_start", session_id);
                        chunk.tool_name = content_block.get("name").and_then(|n| n.as_str()).map(|s| s.to_string());
                        chunk.tool_id = content_block.get("id").and_then(|n| n.as_str()).map(|s| s.to_string());
                        return Some(chunk);
                    }
                    "thinking" => {
                        let chunk = create_chunk("thinking_start", session_id);
                        return Some(chunk);
                    }
                    "text" => {
                        // Text block start - if it has initial text, emit it
                        if let Some(text) = content_block.get("text").and_then(|t| t.as_str()) {
                            if !text.is_empty() {
                                let mut chunk = create_chunk("text", session_id);
                                chunk.content = Some(text.to_string());
                                return Some(chunk);
                            }
                        }
                    }
                    _ => {}
                }
            }
            None
        }

        // Handle content block stop
        "content_block_stop" => {
            let index = json.get("index").and_then(|i| i.as_u64()).unwrap_or(0);
            let mut chunk = create_chunk("block_end", session_id);
            chunk.content = Some(index.to_string());
            Some(chunk)
        }

        // Handle message start with usage info
        "message_start" => {
            if let Some(message) = json.get("message") {
                if let Some(usage) = message.get("usage") {
                    let mut chunk = create_chunk("usage", session_id);
                    chunk.input_tokens = usage.get("input_tokens").and_then(|v| v.as_u64());
                    chunk.output_tokens = usage.get("output_tokens").and_then(|v| v.as_u64());
                    chunk.cache_read_tokens = usage.get("cache_read_input_tokens").and_then(|v| v.as_u64());
                    chunk.cache_write_tokens = usage.get("cache_creation_input_tokens").and_then(|v| v.as_u64());
                    return Some(chunk);
                }
            }
            None
        }

        // Handle message delta with final usage
        "message_delta" => {
            if let Some(usage) = json.get("usage") {
                let mut chunk = create_chunk("usage", session_id);
                chunk.input_tokens = usage.get("input_tokens").and_then(|v| v.as_u64());
                chunk.output_tokens = usage.get("output_tokens").and_then(|v| v.as_u64());
                chunk.cache_read_tokens = usage.get("cache_read_input_tokens").and_then(|v| v.as_u64());
                chunk.cache_write_tokens = usage.get("cache_creation_input_tokens").and_then(|v| v.as_u64());
                return Some(chunk);
            }
            None
        }

        // Handle tool result (old format)
        "tool_result" => {
            let mut chunk = create_chunk("tool_result", session_id);
            chunk.tool_id = json.get("tool_use_id").and_then(|v| v.as_str()).map(|s| s.to_string());
            chunk.content = json.get("content").and_then(|v| v.as_str()).map(|s| s.to_string());
            chunk.tool_is_error = json.get("is_error").and_then(|v| v.as_bool());
            Some(chunk)
        }

        // Handle user message (contains tool_result in stream-json format)
        "user" => {
            if let Some(message) = json.get("message") {
                if let Some(content) = message.get("content").and_then(|c| c.as_array()) {
                    for block in content {
                        if let Some(block_type) = block.get("type").and_then(|t| t.as_str()) {
                            if block_type == "tool_result" {
                                let mut chunk = create_chunk("tool_result", session_id);
                                chunk.tool_id = block.get("tool_use_id").and_then(|v| v.as_str()).map(|s| s.to_string());
                                chunk.tool_is_error = block.get("is_error").and_then(|v| v.as_bool());
                                // The content can be a string or might be in tool_use_result
                                if let Some(content_str) = block.get("content").and_then(|v| v.as_str()) {
                                    chunk.content = Some(content_str.to_string());
                                }
                                return Some(chunk);
                            }
                        }
                    }
                }
            }
            None
        }

        // Handle assistant message - DO NOT emit text here!
        // Text was already streamed via content_block_delta events.
        // This message contains the complete text but emitting it again would cause doubling.
        "assistant" => {
            // We only extract tool_use blocks here since those aren't streamed via deltas
            // (tool_use is handled via content_block_start)
            // Text is intentionally NOT emitted to avoid doubling
            // Text already streamed via deltas, no action needed
            None
        }

        // Handle result message
        "result" => {
            let mut chunk = create_chunk("result", session_id);
            chunk.content = json.get("result").and_then(|r| r.as_str()).map(|s| s.to_string());

            // Parse result subtype (success, error_max_turns, error_during_execution)
            chunk.subtype = json.get("subtype").and_then(|v| v.as_str()).map(|s| s.to_string());
            chunk.is_error = json.get("is_error").and_then(|v| v.as_bool());
            chunk.num_turns = json.get("num_turns").and_then(|v| v.as_u64()).map(|n| n as u32);
            chunk.duration_api_ms = json.get("duration_api_ms").and_then(|v| v.as_u64());

            // Extract cost info if present
            if let Some(cost) = json.get("cost_usd").and_then(|v| v.as_f64()) {
                chunk.cost_usd = Some(cost);
            }
            // Also check total_cost_usd (SDK uses this field name)
            if chunk.cost_usd.is_none() {
                if let Some(cost) = json.get("total_cost_usd").and_then(|v| v.as_f64()) {
                    chunk.cost_usd = Some(cost);
                }
            }
            if let Some(duration) = json.get("duration_ms").and_then(|v| v.as_u64()) {
                chunk.duration_ms = Some(duration);
            }
            if let Some(usage) = json.get("usage") {
                chunk.input_tokens = usage.get("input_tokens").and_then(|v| v.as_u64());
                chunk.output_tokens = usage.get("output_tokens").and_then(|v| v.as_u64());
                chunk.cache_read_tokens = usage.get("cache_read_input_tokens").and_then(|v| v.as_u64());
                chunk.cache_write_tokens = usage.get("cache_creation_input_tokens").and_then(|v| v.as_u64());
            }

            Some(chunk)
        }

        // Skip message_stop - not useful
        "message_stop" => None,

        // Handle system messages
        "system" => {
            let mut chunk = create_chunk("system", session_id);
            chunk.content = json.get("message").and_then(|v| v.as_str()).map(|s| s.to_string());
            Some(chunk)
        }

        // Unknown types - return None (debug info already emitted via debug chunk)
        _ => None
    }
}

/// Check for shell injection patterns in git arguments
fn validate_git_argument(arg: &str) -> Result<(), String> {
    // Check for shell injection patterns
    const DANGEROUS_PATTERNS: &[&str] = &[
        "$(", "`",          // Command substitution
        "${", "$(",         // Variable expansion
        "|", ";", "&&",     // Command chaining (when not part of commit message)
        ">>", ">", "<",     // Redirection
        "\n", "\r",         // Newlines that could inject commands
        "\x00",             // Null bytes
    ];

    // Skip check for commit messages (they can contain special characters)
    // Commit messages are handled specially in the git command flow

    for pattern in DANGEROUS_PATTERNS {
        if arg.contains(pattern) {
            // Allow these in quoted contexts that won't be expanded
            // Since Command::new doesn't go through shell, most of these are safe
            // But we still block the most dangerous ones
            if *pattern == "$(" || *pattern == "`" || *pattern == "\x00" {
                return Err(format!(
                    "Git argument contains potentially dangerous pattern: '{}'",
                    pattern.escape_default()
                ));
            }
        }
    }

    // Block arguments that look like they're trying to execute external commands
    // e.g., --exec=malicious, --upload-pack=malicious
    const DANGEROUS_OPTIONS: &[&str] = &[
        "--exec=",
        "--upload-pack=",
        "--receive-pack=",
        "-c core.sshCommand=",
        "-c http.proxy=",
        "-c remote.",
        "--config=",
    ];

    for opt in DANGEROUS_OPTIONS {
        if arg.to_lowercase().starts_with(&opt.to_lowercase()) {
            return Err(format!(
                "Git option '{}' is blocked for security reasons",
                opt.trim_end_matches('=')
            ));
        }
    }

    Ok(())
}

/// Validate git subcommand against allowlist to prevent dangerous operations
fn validate_git_subcommand(args: &[String]) -> Result<(), String> {
    // Allowlist of safe git subcommands
    const ALLOWED_GIT_SUBCOMMANDS: &[&str] = &[
        // Read-only operations
        "status",
        "log",
        "diff",
        "show",
        "branch",
        "describe",
        "rev-parse",
        "rev-list",
        "remote",
        "config",
        "ls-files",
        "ls-tree",
        "cat-file",
        "blame",
        "shortlog",
        "tag",
        "reflog",
        "stash",
        // Common write operations
        "checkout",
        "switch",
        "add",
        "commit",
        "push",
        "pull",
        "fetch",
        "merge",
        "rebase",
        "init",
        "clone",
        "restore",
        "reset",
        "revert",
        // Branch management
        "worktree",
        // Cleanup (safe versions)
        "clean",
        "gc",
        // Submodules
        "submodule",
    ];

    // Blocked dangerous operations
    const BLOCKED_SUBCOMMANDS: &[&str] = &[
        "filter-branch", // Rewrites history destructively
        "prune",         // Can delete refs
        "fsck",          // Repository maintenance
        "pack-refs",     // Low-level operations
        "update-ref",    // Direct ref manipulation
        "write-tree",    // Low-level
        "read-tree",     // Low-level
        "commit-tree",   // Low-level
        "hash-object",   // Low-level
        "mktag",         // Low-level
        "unpack-objects", // Low-level
    ];

    if args.is_empty() {
        return Err("No git subcommand provided".to_string());
    }

    let subcommand = &args[0];

    // Block explicitly dangerous commands
    if BLOCKED_SUBCOMMANDS.contains(&subcommand.as_str()) {
        return Err(format!(
            "Git subcommand '{}' is blocked for security reasons",
            subcommand
        ));
    }

    // Allow only whitelisted commands
    if !ALLOWED_GIT_SUBCOMMANDS.contains(&subcommand.as_str()) {
        return Err(format!(
            "Git subcommand '{}' is not in the allowlist. Allowed: {:?}",
            subcommand,
            ALLOWED_GIT_SUBCOMMANDS
        ));
    }

    // Validate all arguments for injection patterns
    // Skip commit message content which is typically after -m or --message
    let mut skip_next = false;
    for (i, arg) in args.iter().enumerate() {
        if skip_next {
            skip_next = false;
            continue;
        }

        // Skip validation for commit messages
        if arg == "-m" || arg == "--message" {
            skip_next = true;
            continue;
        }

        // For arguments that look like -m=message, skip validation
        if arg.starts_with("-m=") || arg.starts_with("--message=") {
            continue;
        }

        // Skip the subcommand itself
        if i == 0 {
            continue;
        }

        validate_git_argument(arg)?;
    }

    // Additional safety: block dangerous flags for certain commands
    if subcommand == "push" && args.iter().any(|a| a == "--force" || a == "-f") {
        return Err("Force push is blocked for safety. Use --force-with-lease instead.".to_string());
    }

    if subcommand == "reset" && args.iter().any(|a| a == "--hard") {
        // Allow --hard but warn in logs (it's commonly needed but destructive)
        eprintln!("Warning: git reset --hard requested");
    }

    if subcommand == "clean" && args.iter().any(|a| a == "-f" || a == "--force") {
        // Clean with force is very destructive
        if !args.iter().any(|a| a == "-n" || a == "--dry-run") {
            return Err(
                "git clean -f without --dry-run is blocked. Use --dry-run first to preview."
                    .to_string(),
            );
        }
    }

    Ok(())
}

/// Validate git working directory path
fn validate_git_cwd(cwd: &str) -> Result<std::path::PathBuf, String> {
    let cwd_path = Path::new(cwd);

    // Must be an absolute path
    if !cwd_path.is_absolute() {
        return Err("Git working directory must be an absolute path".to_string());
    }

    // Must exist
    if !cwd_path.exists() {
        return Err("Git working directory does not exist".to_string());
    }

    // Must be a directory
    if !cwd_path.is_dir() {
        return Err("Git working directory path is not a directory".to_string());
    }

    // Canonicalize to prevent path traversal
    let canonical = cwd_path.canonicalize()
        .map_err(|e| format!("Failed to resolve git working directory: {}", e))?;

    let canonical_str = canonical.to_string_lossy().to_lowercase();

    // Block sensitive system directories
    const BLOCKED_GIT_DIRS: &[&str] = &[
        "/etc",
        "/var",
        "/root",
        "/System",
        "/Library",
        "/private/etc",
        "/private/var",
        "/usr",
        "C:\\Windows",
        "C:\\Program Files",
    ];

    for blocked in BLOCKED_GIT_DIRS {
        let blocked_lower = blocked.to_lowercase();
        if canonical_str.starts_with(&blocked_lower) {
            return Err(format!(
                "Git operations are not allowed in system directory: {}",
                blocked
            ));
        }
    }

    Ok(canonical)
}

#[tauri::command]
pub async fn run_git(args: Vec<String>, cwd: String) -> Result<CommandOutput, String> {
    // Rate limit check
    check_rate_limit(categories::GIT)?;

    // Validate working directory
    let validated_cwd = validate_git_cwd(&cwd)?;

    // Validate git subcommand against allowlist
    validate_git_subcommand(&args)?;

    let output = Command::new("git")
        .args(&args)
        .current_dir(&validated_cwd)
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        code: output.status.code().unwrap_or(-1),
    })
}

// File CRUD operations

#[tauri::command]
pub fn create_file(parent_path: String, name: String) -> Result<String, String> {
    let path = Path::new(&parent_path).join(&name);

    if path.exists() {
        return Err(format!("File already exists: {:?}", path));
    }

    fs::write(&path, "").map_err(|e| format!("Failed to create file: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn create_folder(parent_path: String, name: String) -> Result<String, String> {
    let path = Path::new(&parent_path).join(&name);

    if path.exists() {
        return Err(format!("Folder already exists: {:?}", path));
    }

    fs::create_dir(&path).map_err(|e| format!("Failed to create folder: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn rename_item(old_path: String, new_name: String) -> Result<String, String> {
    let old = Path::new(&old_path);

    if !old.exists() {
        return Err(format!("Path does not exist: {:?}", old));
    }

    let new_path = old.parent()
        .ok_or("Cannot get parent directory")?
        .join(&new_name);

    if new_path.exists() {
        return Err(format!("A file with that name already exists: {:?}", new_path));
    }

    fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename: {}", e))?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn delete_to_trash(path: String) -> Result<(), String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err(format!("Path does not exist: {:?}", path));
    }

    trash::delete(path).map_err(|e| format!("Failed to move to trash: {}", e))
}

#[tauri::command]
pub fn move_item(source_path: String, destination_folder: String) -> Result<String, String> {
    let source = Path::new(&source_path);

    if !source.exists() {
        return Err(format!("Source path does not exist: {:?}", source));
    }

    let dest = Path::new(&destination_folder);
    if !dest.exists() {
        return Err(format!("Destination folder does not exist: {:?}", dest));
    }

    if !dest.is_dir() {
        return Err(format!("Destination must be a directory: {:?}", dest));
    }

    let file_name = source
        .file_name()
        .ok_or("Cannot determine source filename")?;

    let target = dest.join(file_name);

    if target.exists() {
        return Err(format!("An item with that name already exists at destination: {:?}", target));
    }

    // Prevent moving a folder into itself or its descendants
    if source.is_dir() {
        let source_canonical = source.canonicalize().map_err(|e| format!("Failed to resolve source path: {}", e))?;
        let dest_canonical = dest.canonicalize().map_err(|e| format!("Failed to resolve destination path: {}", e))?;

        if dest_canonical.starts_with(&source_canonical) {
            return Err("Cannot move a folder into itself or its descendants".to_string());
        }
    }

    fs::rename(&source_path, &target).map_err(|e| format!("Failed to move: {}", e))?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine home directory".to_string())
}

#[tauri::command]
pub fn get_downloads_dir() -> Result<String, String> {
    dirs::download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine downloads directory".to_string())
}

#[tauri::command]
pub fn write_binary_file(path: String, base64_data: String) -> Result<(), String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let bytes = STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;
    fs::write(&path, bytes).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub fn scan_music_folder(folder_path: String) -> Result<Vec<AudioFile>, String> {
    let folder = Path::new(&folder_path);

    if !folder.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }

    if !folder.is_dir() {
        return Err(format!("Path is not a directory: {}", folder_path));
    }

    let mut files: Vec<AudioFile> = Vec::new();

    let entries = fs::read_dir(folder).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();

        if path.is_dir() {
            continue;
        }

        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase());

        if ext.as_deref() != Some("mp3") {
            continue;
        }

        let filename = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let display_name = filename
            .trim_end_matches(".mp3")
            .trim_end_matches(".MP3")
            .replace("-", " ")
            .replace("_", " ")
            .split_whitespace()
            .map(|word| {
                let mut chars = word.chars();
                match chars.next() {
                    Some(first) => {
                        first.to_uppercase().collect::<String>() + chars.as_str().to_lowercase().as_str()
                    }
                    None => String::new(),
                }
            })
            .collect::<Vec<_>>()
            .join(" ");

        files.push(AudioFile {
            name: display_name,
            file: filename,
            path: path.to_string_lossy().to_string(),
        });
    }

    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(files)
}

#[tauri::command]
pub fn get_git_status(directory_path: String) -> Result<GitStatusResult, String> {
    let dir_path = Path::new(&directory_path);

    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", directory_path));
    }

    // Find git root by running git rev-parse --show-toplevel
    let git_root_output = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(&directory_path)
        .output();

    let git_root = match git_root_output {
        Ok(output) if output.status.success() => {
            String::from_utf8_lossy(&output.stdout).trim().to_string()
        }
        _ => {
            // Not a git repository
            return Ok(GitStatusResult {
                git_root: String::new(),
                files: Vec::new(),
            });
        }
    };

    // Get git status with porcelain format
    let status_output = Command::new("git")
        .args(["status", "--porcelain", "-uall"])
        .current_dir(&git_root)
        .output()
        .map_err(|e| format!("Failed to run git status: {}", e))?;

    if !status_output.status.success() {
        return Ok(GitStatusResult {
            git_root,
            files: Vec::new(),
        });
    }

    let stdout = String::from_utf8_lossy(&status_output.stdout);
    let mut files: Vec<GitFileStatus> = Vec::new();

    for line in stdout.lines() {
        if line.len() < 4 {
            continue;
        }

        let status_chars = &line[0..2];
        let file_path = &line[3..];

        // Handle renamed files (format: "R  old -> new")
        let actual_path = if file_path.contains(" -> ") {
            file_path.split(" -> ").last().unwrap_or(file_path)
        } else {
            file_path
        };

        let full_path = Path::new(&git_root).join(actual_path);
        let full_path_str = full_path.to_string_lossy().to_string();

        let status = match status_chars {
            "??" => "untracked",
            "A " | "AM" | "AD" => "new",
            "M " | " M" | "MM" | "MD" => "modified",
            "D " | " D" => "deleted",
            "R " | "RM" | "RD" => "renamed",
            "C " | "CM" | "CD" => "copied",
            "UU" | "AA" | "DD" | "AU" | "UA" | "DU" | "UD" => "conflict",
            _ => "modified", // Default to modified for other statuses
        };

        files.push(GitFileStatus {
            path: full_path_str,
            status: status.to_string(),
        });
    }

    Ok(GitStatusResult { git_root, files })
}

#[tauri::command]
pub fn check_node_modules_exists(project_path: String) -> bool {
    Path::new(&project_path).join("node_modules").exists()
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryStats {
    pub file_count: u64,
    pub folder_count: u64,
    pub total_size: u64,
    pub node_modules_size: u64,
    pub lines_of_code: u64,
    pub file_type_counts: std::collections::HashMap<String, u64>,
}

#[tauri::command]
pub fn get_directory_stats(project_path: String) -> Result<DirectoryStats, String> {
    use std::collections::{HashMap, HashSet};

    let project_path_obj = Path::new(&project_path);
    if !project_path_obj.exists() {
        return Err(format!("Path does not exist: {}", project_path));
    }

    let mut stats = DirectoryStats {
        file_count: 0,
        folder_count: 0,
        total_size: 0,
        node_modules_size: 0,
        lines_of_code: 0,
        file_type_counts: HashMap::new(),
    };

    // Directories to skip entirely (not counted in any stats)
    let skip_dirs: HashSet<&str> = [
        "node_modules", "target", "dist", "build", ".next",
        ".nuxt", ".output", "coverage", ".cache", "__pycache__",
        "vendor", ".gradle", "out"
    ].iter().cloned().collect();

    // Code file extensions for LOC counting
    let code_extensions: HashSet<&str> = [
        "js", "jsx", "ts", "tsx", "vue", "svelte",
        "py", "rb", "rs", "go", "java", "kt", "swift",
        "c", "cpp", "h", "hpp", "cs",
        "php", "html", "css", "scss", "sass", "less",
        "json", "yaml", "yml", "toml", "xml",
        "sh", "bash", "zsh", "sql", "graphql", "gql",
        "md", "mdx"
    ].iter().cloned().collect();

    // Skip node_modules size calculation here - use get_node_modules_size command separately
    // This keeps the initial stats load fast
    stats.node_modules_size = 0;

    // Walk the directory tree, skipping excluded directories
    fn walk_dir(
        path: &Path,
        stats: &mut DirectoryStats,
        code_extensions: &HashSet<&str>,
        skip_dirs: &HashSet<&str>,
    ) {
        let entries = match fs::read_dir(path) {
            Ok(e) => e,
            Err(_) => return,
        };

        for entry in entries.flatten() {
            let entry_path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();


            let is_dir = entry_path.is_dir();

            if is_dir {
                // Skip excluded directories entirely
                if skip_dirs.contains(file_name.as_str()) {
                    continue;
                }
                stats.folder_count += 1;
                walk_dir(&entry_path, stats, code_extensions, skip_dirs);
            } else {
                stats.file_count += 1;

                // Get file size
                if let Ok(metadata) = fs::metadata(&entry_path) {
                    stats.total_size += metadata.len();
                }

                // Get file extension and count by type
                if let Some(ext) = entry_path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    *stats.file_type_counts.entry(ext_lower.clone()).or_insert(0) += 1;

                    // Count lines of code for code files
                    if code_extensions.contains(ext_lower.as_str()) {
                        if let Ok(content) = fs::read_to_string(&entry_path) {
                            stats.lines_of_code += content.lines().count() as u64;
                        }
                    }
                }
            }
        }
    }

    walk_dir(project_path_obj, &mut stats, &code_extensions, &skip_dirs);

    Ok(stats)
}

#[tauri::command]
pub async fn get_node_modules_size(project_path: String) -> Result<u64, String> {
    let node_modules_path = Path::new(&project_path).join("node_modules");

    if !node_modules_path.exists() {
        return Ok(0);
    }

    fn calculate_dir_size(path: &Path) -> u64 {
        let mut size: u64 = 0;
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.is_dir() {
                    size += calculate_dir_size(&entry_path);
                } else if let Ok(metadata) = fs::metadata(&entry_path) {
                    size += metadata.len();
                }
            }
        }
        size
    }

    Ok(calculate_dir_size(&node_modules_path))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemCheckResults {
    // JavaScript ecosystem
    pub node: Option<String>,
    pub npm: Option<String>,
    pub pnpm: Option<String>,
    pub yarn: Option<String>,
    pub bun: Option<String>,
    // Version control
    pub git: Option<String>,
    // AI tools
    pub claude: Option<String>,
    pub codex: Option<String>,
    pub gemini: Option<String>,
    // Ruby ecosystem
    pub ruby: Option<String>,
    pub rails: Option<String>,
    pub bundler: Option<String>,
    // Python ecosystem
    pub python: Option<String>,
    pub pip: Option<String>,
    // Systems languages
    pub go: Option<String>,
    pub rust: Option<String>,
    pub cargo: Option<String>,
    // Containers & Package managers
    pub docker: Option<String>,
    pub homebrew: Option<String>,
}

fn get_command_version(cmd: &str, args: &[&str]) -> Option<String> {
    let output = Command::new(cmd)
        .args(args)
        .env("PATH", crate::path_utils::get_enhanced_path())
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let version = stdout.trim().to_string();

    // Clean up version strings
    let version = if version.starts_with('v') {
        version[1..].to_string()
    } else if version.contains(' ') {
        // Handle different formats:
        // - "git version 2.42.0" -> take last word
        // - "1.0.48 (Claude Code)" -> take first word (version number)
        let first_word = version.split_whitespace().next().unwrap_or(&version);

        // If first word looks like a version number, use it; otherwise use last word
        if first_word.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false) {
            first_word.to_string()
        } else {
            version.split_whitespace()
                .last()
                .unwrap_or(&version)
                .to_string()
        }
    } else {
        version
    };

    if version.is_empty() {
        None
    } else {
        Some(version)
    }
}

#[tauri::command]
pub fn check_system_requirements() -> SystemCheckResults {
    SystemCheckResults {
        // JavaScript ecosystem
        node: get_command_version("node", &["--version"]),
        npm: get_command_version("npm", &["--version"]),
        pnpm: get_command_version("pnpm", &["--version"]),
        yarn: get_command_version("yarn", &["--version"]),
        bun: get_command_version("bun", &["--version"]),
        // Version control
        git: get_command_version("git", &["--version"]),
        // AI tools
        claude: get_command_version("claude", &["--version"]),
        codex: get_command_version("codex", &["--version"]),
        gemini: get_command_version("gemini", &["--version"]),
        // Ruby ecosystem
        ruby: get_command_version("ruby", &["--version"]),
        rails: get_command_version("rails", &["--version"]),
        bundler: get_command_version("bundler", &["--version"]),
        // Python ecosystem
        python: get_command_version("python3", &["--version"]),
        pip: get_command_version("pip3", &["--version"]),
        // Systems languages
        go: get_command_version("go", &["version"]),
        rust: get_command_version("rustc", &["--version"]),
        cargo: get_command_version("cargo", &["--version"]),
        // Containers & Package managers
        docker: get_command_version("docker", &["--version"]),
        homebrew: get_command_version("brew", &["--version"]),
    }
}

// System Resources types and commands

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub used_bytes: u64,
    pub usage_percent: f32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInfo {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub usage_percent: f32,
    pub swap_total_bytes: u64,
    pub swap_used_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    pub usage_percent: f32,
    pub core_count: usize,
    pub brand: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemResourcesInfo {
    pub memory: MemoryInfo,
    pub cpu: CpuInfo,
    pub disks: Vec<DiskInfo>,
}

#[tauri::command]
pub fn get_system_resources() -> Result<SystemResourcesInfo, String> {
    use sysinfo::{System, Disks};

    let mut sys = System::new_all();
    sys.refresh_all();

    // Memory info
    let memory = MemoryInfo {
        total_bytes: sys.total_memory(),
        used_bytes: sys.used_memory(),
        available_bytes: sys.available_memory(),
        usage_percent: if sys.total_memory() > 0 {
            (sys.used_memory() as f32 / sys.total_memory() as f32) * 100.0
        } else {
            0.0
        },
        swap_total_bytes: sys.total_swap(),
        swap_used_bytes: sys.used_swap(),
    };

    // CPU info
    let cpu = CpuInfo {
        usage_percent: sys.global_cpu_usage(),
        core_count: sys.cpus().len(),
        brand: sys.cpus().first()
            .map(|c| c.brand().to_string())
            .unwrap_or_else(|| "Unknown".to_string()),
    };

    // Disk info
    let disks_sys = Disks::new_with_refreshed_list();
    let disks: Vec<DiskInfo> = disks_sys.iter()
        .map(|disk| {
            let total = disk.total_space();
            let available = disk.available_space();
            let used = total.saturating_sub(available);
            DiskInfo {
                name: disk.name().to_string_lossy().to_string(),
                mount_point: disk.mount_point().to_string_lossy().to_string(),
                total_bytes: total,
                available_bytes: available,
                used_bytes: used,
                usage_percent: if total > 0 { (used as f32 / total as f32) * 100.0 } else { 0.0 },
            }
        })
        .collect();

    Ok(SystemResourcesInfo { memory, cpu, disks })
}

// Claude Code Manager types and commands

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeFile {
    pub name: String,
    pub path: String,
    pub scope: String,       // "user" or "project"
    pub file_type: String,   // "command", "skill", or "subagent"
    pub frontmatter: serde_json::Value,
    pub content: String,
    pub raw_content: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeVersionInfo {
    pub current: String,
    pub latest: Option<String>,
    pub update_available: bool,
    pub last_checked: Option<i64>,
}

fn parse_frontmatter(content: &str) -> (serde_json::Value, String) {
    let trimmed = content.trim();

    if !trimmed.starts_with("---") {
        return (serde_json::json!({}), content.to_string());
    }

    // Find the closing ---
    if let Some(end_idx) = trimmed[3..].find("\n---") {
        let yaml_content = &trimmed[3..3 + end_idx].trim();
        let body = trimmed[3 + end_idx + 4..].trim().to_string();

        // Parse YAML to JSON
        let frontmatter: serde_json::Value = serde_yaml::from_str(yaml_content)
            .unwrap_or(serde_json::json!({}));

        return (frontmatter, body);
    }

    (serde_json::json!({}), content.to_string())
}

#[tauri::command]
pub fn get_claude_files(
    scope: String,
    file_type: String,
    project_path: Option<String>,
) -> Result<Vec<ClaudeFile>, String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    let base_path = match scope.as_str() {
        "user" => home_dir.join(".claude"),
        "project" => {
            let project = project_path.ok_or("Project path required for project scope")?;
            Path::new(&project).join(".claude")
        }
        _ => return Err(format!("Invalid scope: {}", scope)),
    };

    let subdir = match file_type.as_str() {
        "command" => "commands",
        "skill" => "skills",
        "subagent" => "agents",
        _ => return Err(format!("Invalid file type: {}", file_type)),
    };

    let dir_path = base_path.join(subdir);

    if !dir_path.exists() {
        return Ok(Vec::new());
    }

    let mut files: Vec<ClaudeFile> = Vec::new();

    let entries = fs::read_dir(&dir_path).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        if ext != "md" {
            continue;
        }

        let name = path.file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let raw_content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let (frontmatter, content) = parse_frontmatter(&raw_content);

        files.push(ClaudeFile {
            name,
            path: path.to_string_lossy().to_string(),
            scope: scope.clone(),
            file_type: file_type.clone(),
            frontmatter,
            content,
            raw_content,
        });
    }

    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(files)
}

#[tauri::command]
pub fn write_claude_file(
    path: String,
    content: String,
) -> Result<(), String> {
    // Ensure parent directory exists
    let file_path = Path::new(&path);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub fn delete_claude_file(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
}

#[tauri::command]
pub fn get_claude_settings(
    scope: String,
    project_path: Option<String>,
) -> Result<serde_json::Value, String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    let settings_path = match scope.as_str() {
        "user" => home_dir.join(".claude").join("settings.json"),
        "project" => {
            let project = project_path.ok_or("Project path required for project scope")?;
            Path::new(&project).join(".claude").join("settings.json")
        }
        "local" => {
            let project = project_path.ok_or("Project path required for local scope")?;
            Path::new(&project).join(".claude").join("settings.local.json")
        }
        _ => return Err(format!("Invalid scope: {}", scope)),
    };

    if !settings_path.exists() {
        return Ok(serde_json::json!({}));
    }

    let content = fs::read_to_string(&settings_path).map_err(|e| e.to_string())?;
    let settings: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;

    Ok(settings)
}

#[tauri::command]
pub fn write_claude_settings(
    scope: String,
    project_path: Option<String>,
    settings: serde_json::Value,
) -> Result<(), String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    let settings_path = match scope.as_str() {
        "user" => home_dir.join(".claude").join("settings.json"),
        "project" => {
            let project = project_path.ok_or("Project path required for project scope")?;
            Path::new(&project).join(".claude").join("settings.json")
        }
        "local" => {
            let project = project_path.ok_or("Project path required for local scope")?;
            Path::new(&project).join(".claude").join("settings.local.json")
        }
        _ => return Err(format!("Invalid scope: {}", scope)),
    };

    // Ensure directory exists
    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&settings_path, content).map_err(|e| format!("Failed to write settings: {}", e))
}

#[tauri::command]
pub async fn get_claude_version() -> Result<ClaudeVersionInfo, String> {
    let current = get_command_version("claude", &["--version"])
        .unwrap_or_else(|| "unknown".to_string());

    Ok(ClaudeVersionInfo {
        current,
        latest: None,
        update_available: false,
        last_checked: None,
    })
}

#[tauri::command]
pub async fn check_claude_update() -> Result<ClaudeVersionInfo, String> {
    let current = get_command_version("claude", &["--version"])
        .unwrap_or_else(|| "unknown".to_string());

    // Check npm registry for latest version
    let output = Command::new("npm")
        .args(["view", "@anthropic-ai/claude-code", "version"])
        .output()
        .map_err(|e| format!("Failed to check npm: {}", e))?;

    let latest = if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        None
    };

    let update_available = match (&current, &latest) {
        (curr, Some(lat)) if curr != "unknown" => curr != lat,
        _ => false,
    };

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .ok();

    Ok(ClaudeVersionInfo {
        current,
        latest,
        update_available,
        last_checked: now,
    })
}

#[tauri::command]
pub fn create_claude_file(
    scope: String,
    file_type: String,
    name: String,
    project_path: Option<String>,
) -> Result<String, String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    let base_path = match scope.as_str() {
        "user" => home_dir.join(".claude"),
        "project" => {
            let project = project_path.ok_or("Project path required for project scope")?;
            Path::new(&project).join(".claude")
        }
        _ => return Err(format!("Invalid scope: {}", scope)),
    };

    let subdir = match file_type.as_str() {
        "command" => "commands",
        "skill" => "skills",
        "subagent" => "agents",
        _ => return Err(format!("Invalid file type: {}", file_type)),
    };

    let dir_path = base_path.join(subdir);
    fs::create_dir_all(&dir_path).map_err(|e| format!("Failed to create directory: {}", e))?;

    let file_path = dir_path.join(format!("{}.md", name));

    if file_path.exists() {
        return Err(format!("File already exists: {}", name));
    }

    // Create template content based on file type
    let template = match file_type.as_str() {
        "command" => format!(
            "---\ndescription: Description of what this command does\n---\n\n# {}\n\nYour command prompt here.\n",
            name
        ),
        "skill" => format!(
            "---\nname: {}\ndescription: Description of when this skill should be used\n---\n\nYour skill instructions here.\n",
            name
        ),
        "subagent" => format!(
            "---\nname: {}\ndescription: Description of when this subagent should be invoked\ntools: Read, Grep, Glob\nmodel: inherit\n---\n\nYou are a specialized agent for...\n\nWhen invoked:\n1. First step\n2. Second step\n3. Third step\n",
            name
        ),
        _ => String::new(),
    };

    fs::write(&file_path, template).map_err(|e| format!("Failed to create file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

// Port Manager Commands

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortInfo {
    pub port: u16,
    pub pid: u32,
    pub process_name: String,
    pub user: String,
    pub protocol: String,
}

#[tauri::command]
pub fn list_listening_ports() -> Result<Vec<PortInfo>, String> {
    let output = Command::new("lsof")
        .args(["-i", "-P", "-n"])
        .output()
        .map_err(|e| format!("Failed to run lsof: {}", e))?;

    if !output.status.success() {
        // lsof might return non-zero if no ports found, that's okay
        return Ok(Vec::new());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut ports: Vec<PortInfo> = Vec::new();
    let mut seen_ports: std::collections::HashSet<u16> = std::collections::HashSet::new();

    for line in stdout.lines().skip(1) {
        // Skip header line
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 9 {
            continue;
        }

        // Only include LISTEN state
        let state = parts.get(9).or(parts.get(8)).unwrap_or(&"");
        if !state.contains("LISTEN") {
            continue;
        }

        let process_name = parts[0].to_string();
        let pid: u32 = match parts[1].parse() {
            Ok(p) => p,
            Err(_) => continue,
        };
        let user = parts[2].to_string();

        // Parse the address:port from the NAME column (usually last or second to last)
        let addr_col = parts.iter()
            .find(|p| p.contains(':') && (p.contains("localhost") || p.contains("*") || p.contains("127.") || p.contains("0.0.0.0") || p.contains("[::]")))
            .unwrap_or(&"");

        if addr_col.is_empty() {
            continue;
        }

        // Extract port number
        let port_str = addr_col.rsplit(':').next().unwrap_or("");
        let port: u16 = match port_str.parse() {
            Ok(p) => p,
            Err(_) => continue,
        };

        // Skip if we've already seen this port (avoid duplicates)
        if seen_ports.contains(&port) {
            continue;
        }
        seen_ports.insert(port);

        // Determine protocol
        let protocol = if parts.iter().any(|p| p.contains("TCP")) {
            "TCP"
        } else if parts.iter().any(|p| p.contains("UDP")) {
            "UDP"
        } else {
            "TCP"
        };

        ports.push(PortInfo {
            port,
            pid,
            process_name,
            user,
            protocol: protocol.to_string(),
        });
    }

    // Sort by port number
    ports.sort_by_key(|p| p.port);
    Ok(ports)
}

/// Kill a process by PID.
/// Security: Only allows killing:
/// 1. Processes registered with the ProcessRegistry (our child processes)
/// 2. Known dev service processes (from KNOWN_SERVICES list)
/// 3. Processes listening on ports (dev servers)
/// This prevents arbitrary system process termination.
#[tauri::command]
pub fn kill_process(
    registry: State<'_, Arc<ProcessRegistry>>,
    pid: u32,
) -> Result<(), String> {
    // Block killing critical system PIDs
    if pid <= 1 {
        return Err("Security: Cannot kill system processes (PID <= 1)".to_string());
    }

    // Check 1: Is this our registered child process? (Always allowed)
    if registry.is_our_child(pid) {
        let result = execute_kill(pid);
        if result.is_ok() {
            registry.unregister(pid);
        }
        return result;
    }

    // Check 2: Is this a known dev service or listening on a port?
    if !is_killable_dev_process(pid)? {
        return Err(format!(
            "Security: Cannot kill PID {}. Only child processes or known dev services can be terminated.",
            pid
        ));
    }

    execute_kill(pid)
}

/// Check if a process is a known dev service or listening on a port
fn is_killable_dev_process(pid: u32) -> Result<bool, String> {
    use sysinfo::{System, Pid};

    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All);

    let sysinfo_pid = Pid::from(pid as usize);
    if let Some(process) = sys.process(sysinfo_pid) {
        let name = process.name().to_string_lossy().to_lowercase();

        // Check if it's a known dev service
        for (pattern, _category) in KNOWN_SERVICES {
            if name.contains(pattern) {
                return Ok(true);
            }
        }

        // Check if it's listening on a port (using lsof)
        let output = Command::new("lsof")
            .args(["-p", &pid.to_string(), "-i", "-P"])
            .output();

        if let Ok(output) = output {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                // If lsof shows LISTEN, it's a server process
                if stdout.contains("LISTEN") {
                    return Ok(true);
                }
            }
        }

        Ok(false)
    } else {
        // Process doesn't exist
        Err(format!("Process {} not found", pid))
    }
}

/// Execute the actual kill command
fn execute_kill(pid: u32) -> Result<(), String> {
    let output = Command::new("kill")
        .args(["-9", &pid.to_string()])
        .output()
        .map_err(|e| format!("Failed to kill process: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to kill process {}: {}", pid, stderr));
    }

    Ok(())
}

// Background Services Commands

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundService {
    pub pid: u32,
    pub name: String,
    pub category: String,
    pub memory_bytes: u64,
    pub cpu_percent: f32,
    pub port: Option<u16>,
    pub status: String,
    pub user: String,
}

const KNOWN_SERVICES: &[(&str, &str)] = &[
    // Databases
    ("postgres", "databases"),
    ("mysqld", "databases"),
    ("mysql", "databases"),
    ("mongod", "databases"),
    ("redis-server", "databases"),
    ("redis", "databases"),
    ("elasticsearch", "databases"),
    ("mariadbd", "databases"),
    ("memcached", "databases"),
    ("sqlite", "databases"),
    // Web Servers
    ("nginx", "web_servers"),
    ("httpd", "web_servers"),
    ("apache2", "web_servers"),
    ("caddy", "web_servers"),
    ("lighttpd", "web_servers"),
    // Dev Servers
    ("node", "dev_servers"),
    ("python", "dev_servers"),
    ("python3", "dev_servers"),
    ("ruby", "dev_servers"),
    ("rails", "dev_servers"),
    ("go", "dev_servers"),
    ("cargo", "dev_servers"),
    ("php", "dev_servers"),
    ("php-fpm", "dev_servers"),
    ("java", "dev_servers"),
    ("uvicorn", "dev_servers"),
    ("gunicorn", "dev_servers"),
    ("next-server", "dev_servers"),
    ("vite", "dev_servers"),
    ("webpack", "dev_servers"),
    ("esbuild", "dev_servers"),
    ("bun", "dev_servers"),
    ("deno", "dev_servers"),
    // Message Queues
    ("rabbitmq", "message_queues"),
    ("kafka", "message_queues"),
    ("beam.smp", "message_queues"),
    ("celery", "message_queues"),
];

fn get_service_category(process_name: &str) -> Option<&'static str> {
    let name_lower = process_name.to_lowercase();
    for (pattern, category) in KNOWN_SERVICES {
        if name_lower.contains(pattern) {
            return Some(category);
        }
    }
    None
}

#[tauri::command]
pub fn list_background_services() -> Result<Vec<BackgroundService>, String> {
    use sysinfo::System;
    use std::collections::HashMap;

    let mut sys = System::new_all();
    sys.refresh_all();

    // First, get port information to merge with services
    let port_info: HashMap<u32, u16> = list_listening_ports()
        .unwrap_or_default()
        .into_iter()
        .map(|p| (p.pid, p.port))
        .collect();

    let mut services: Vec<BackgroundService> = Vec::new();

    for (pid, process) in sys.processes() {
        let name = process.name().to_string_lossy().to_string();

        // Check if this is a known developer service
        if let Some(category) = get_service_category(&name) {
            let pid_u32 = pid.as_u32();

            services.push(BackgroundService {
                pid: pid_u32,
                name,
                category: category.to_string(),
                memory_bytes: process.memory(),
                cpu_percent: process.cpu_usage(),
                port: port_info.get(&pid_u32).copied(),
                status: format!("{:?}", process.status()),
                user: process.user_id()
                    .map(|u| u.to_string())
                    .unwrap_or_else(|| "unknown".to_string()),
            });
        }
    }

    // Sort by category, then by name
    services.sort_by(|a, b| {
        a.category.cmp(&b.category)
            .then_with(|| a.name.cmp(&b.name))
    });

    Ok(services)
}

// Node Modules Cleaner Commands

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeModulesFolder {
    pub path: String,
    pub project_path: String,
    pub project_name: String,
    pub size: u64,
    pub formatted_size: String,
    pub last_modified: i64,
    pub last_modified_formatted: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeModulesScanResult {
    pub folders: Vec<NodeModulesFolder>,
    pub total_size: u64,
    pub total_size_formatted: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeModulesDeleteResult {
    pub deleted_count: usize,
    pub failed_count: usize,
    pub space_recovered: u64,
    pub space_recovered_formatted: String,
    pub failed_paths: Vec<String>,
}

const BLOCKED_PATHS: &[&str] = &[
    "/usr",
    "/opt",
    "/bin",
    "/sbin",
    "/System",
    "/Library",
    "/Applications",
    "/private",
    "/var",
    "/etc",
    "/tmp",
    "/cores",
];

fn is_blocked_path(path: &Path) -> bool {
    let path_str = path.to_string_lossy();
    BLOCKED_PATHS.iter().any(|blocked| path_str.starts_with(blocked))
}

fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.1} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

fn calculate_folder_size(path: &Path) -> u64 {
    let mut size: u64 = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                size += calculate_folder_size(&entry_path);
            } else if let Ok(metadata) = fs::metadata(&entry_path) {
                size += metadata.len();
            }
        }
    }
    size
}

#[tauri::command]
pub async fn scan_node_modules(scan_path: String) -> Result<NodeModulesScanResult, String> {
    let scan_path_obj = Path::new(&scan_path);

    if !scan_path_obj.exists() {
        return Err(format!("Path does not exist: {}", scan_path));
    }

    if !scan_path_obj.is_dir() {
        return Err(format!("Path is not a directory: {}", scan_path));
    }

    if is_blocked_path(scan_path_obj) {
        return Err("Cannot scan system directories for safety".to_string());
    }

    let mut folders: Vec<NodeModulesFolder> = Vec::new();
    let mut total_size: u64 = 0;

    fn find_node_modules(
        dir: &Path,
        folders: &mut Vec<NodeModulesFolder>,
        total_size: &mut u64,
        depth: usize,
    ) {
        if depth > 10 {
            return;
        }

        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };

        for entry in entries.flatten() {
            let entry_path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();

            if !entry_path.is_dir() {
                continue;
            }

            if file_name.starts_with('.') {
                continue;
            }

            if is_blocked_path(&entry_path) {
                continue;
            }

            if file_name == "node_modules" {
                let size = calculate_folder_size(&entry_path);
                *total_size += size;

                let project_path = dir.to_string_lossy().to_string();
                let project_name = dir
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "Unknown".to_string());

                let last_modified = fs::metadata(&entry_path)
                    .and_then(|m| m.modified())
                    .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs() as i64)
                    .unwrap_or(0);

                let last_modified_formatted = if last_modified > 0 {
                    let datetime = chrono::DateTime::from_timestamp(last_modified, 0)
                        .unwrap_or_default();
                    datetime.format("%b %d, %Y").to_string()
                } else {
                    "Unknown".to_string()
                };

                folders.push(NodeModulesFolder {
                    path: entry_path.to_string_lossy().to_string(),
                    project_path,
                    project_name,
                    size,
                    formatted_size: format_size(size),
                    last_modified,
                    last_modified_formatted,
                });

                continue;
            }

            find_node_modules(&entry_path, folders, total_size, depth + 1);
        }
    }

    find_node_modules(scan_path_obj, &mut folders, &mut total_size, 0);

    folders.sort_by(|a, b| b.size.cmp(&a.size));

    Ok(NodeModulesScanResult {
        folders,
        total_size,
        total_size_formatted: format_size(total_size),
    })
}

#[tauri::command]
pub async fn delete_node_modules(paths: Vec<String>) -> Result<NodeModulesDeleteResult, String> {
    let mut deleted_count = 0;
    let mut failed_count = 0;
    let mut space_recovered: u64 = 0;
    let mut failed_paths: Vec<String> = Vec::new();

    for path_str in paths {
        let path = Path::new(&path_str);

        if !path_str.ends_with("node_modules") && !path_str.ends_with("node_modules/") {
            failed_paths.push(format!("{}: Not a node_modules folder", path_str));
            failed_count += 1;
            continue;
        }

        if is_blocked_path(path) {
            failed_paths.push(format!("{}: System path blocked", path_str));
            failed_count += 1;
            continue;
        }

        if !path.exists() {
            failed_paths.push(format!("{}: Does not exist", path_str));
            failed_count += 1;
            continue;
        }

        let size = calculate_folder_size(path);

        match fs::remove_dir_all(path) {
            Ok(_) => {
                deleted_count += 1;
                space_recovered += size;
            }
            Err(e) => {
                failed_paths.push(format!("{}: {}", path_str, e));
                failed_count += 1;
            }
        }
    }

    Ok(NodeModulesDeleteResult {
        deleted_count,
        failed_count,
        space_recovered,
        space_recovered_formatted: format_size(space_recovered),
        failed_paths,
    })
}

// ============================================
// Environment Variables Commands
// ============================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvVariable {
    pub key: String,
    pub value: String,
    pub is_sensitive: bool,
    pub comment: Option<String>,
    pub line_number: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvFile {
    pub filename: String,
    pub path: String,
    pub variables: Vec<EnvVariable>,
    pub exists: bool,
    pub is_gitignored: bool,
    pub last_modified: Option<i64>,
}

const SENSITIVE_PATTERNS: &[&str] = &[
    "API_KEY", "API-KEY", "APIKEY",
    "SECRET", "PASSWORD", "PASSWD", "PASS",
    "TOKEN", "PRIVATE_KEY", "PRIVATE-KEY",
    "AUTH", "CREDENTIAL", "CRED",
    "DATABASE_URL", "DATABASE-URL", "DB_URL",
    "CONNECTION_STRING", "CONN_STRING",
    "AWS_", "STRIPE_", "GITHUB_TOKEN", "NPM_TOKEN",
    "OPENAI", "ANTHROPIC", "SUPABASE",
    "REDIS", "MONGO", "POSTGRES", "MYSQL",
];

fn is_sensitive_key(key: &str) -> bool {
    let upper_key = key.to_uppercase();
    SENSITIVE_PATTERNS.iter().any(|pattern| upper_key.contains(pattern))
}

fn parse_env_content(content: &str) -> Vec<EnvVariable> {
    let mut variables = Vec::new();

    for (line_num, line) in content.lines().enumerate() {
        let trimmed = line.trim();

        // Skip empty lines and comments
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        // Parse KEY=value format
        if let Some(eq_pos) = trimmed.find('=') {
            let key = trimmed[..eq_pos].trim().to_string();
            let value_part = &trimmed[eq_pos + 1..];

            // Handle inline comments and quoted values
            let (value, comment) = parse_value_and_comment(value_part);

            variables.push(EnvVariable {
                key: key.clone(),
                value,
                is_sensitive: is_sensitive_key(&key),
                comment,
                line_number: Some(line_num + 1),
            });
        }
    }

    variables
}

fn parse_value_and_comment(value_part: &str) -> (String, Option<String>) {
    let trimmed = value_part.trim();

    // Handle quoted values
    if trimmed.starts_with('"') || trimmed.starts_with('\'') {
        let quote_char = trimmed.chars().next().unwrap();
        if let Some(end_quote) = trimmed[1..].find(quote_char) {
            let value = trimmed[1..=end_quote].to_string();
            let rest = trimmed[end_quote + 2..].trim();
            let comment = if rest.starts_with('#') {
                Some(rest[1..].trim().to_string())
            } else {
                None
            };
            return (value, comment);
        }
    }

    // Handle unquoted values with possible inline comments
    if let Some(hash_pos) = trimmed.find(" #") {
        let value = trimmed[..hash_pos].trim().to_string();
        let comment = trimmed[hash_pos + 2..].trim().to_string();
        return (value, Some(comment));
    }

    (trimmed.to_string(), None)
}

fn serialize_env_variables(variables: &[EnvVariable]) -> String {
    let mut content = String::new();

    for var in variables {
        let value_needs_quotes = var.value.contains(' ') ||
                                  var.value.contains('#') ||
                                  var.value.is_empty();

        let formatted_value = if value_needs_quotes {
            format!("\"{}\"", var.value.replace('\"', "\\\""))
        } else {
            var.value.clone()
        };

        let line = if let Some(ref comment) = var.comment {
            format!("{}={} # {}\n", var.key, formatted_value, comment)
        } else {
            format!("{}={}\n", var.key, formatted_value)
        };

        content.push_str(&line);
    }

    content
}

#[tauri::command]
pub fn list_env_files(project_path: String) -> Result<Vec<EnvFile>, String> {
    let project_dir = Path::new(&project_path);

    if !project_dir.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }

    let env_filenames = vec![
        ".env",
        ".env.local",
        ".env.development",
        ".env.development.local",
        ".env.test",
        ".env.test.local",
        ".env.production",
        ".env.production.local",
        ".env.staging",
        ".env.example",
    ];

    let gitignore = build_gitignore(project_dir);
    let mut env_files = Vec::new();

    for filename in env_filenames {
        let file_path = project_dir.join(filename);
        let exists = file_path.exists();

        let is_gitignored = if exists {
            is_path_gitignored(&file_path, false, &gitignore)
        } else {
            false
        };

        let (variables, last_modified) = if exists {
            let content = fs::read_to_string(&file_path).unwrap_or_default();
            let variables = parse_env_content(&content);
            let modified = fs::metadata(&file_path)
                .and_then(|m| m.modified())
                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs() as i64)
                .ok();
            (variables, modified)
        } else {
            (Vec::new(), None)
        };

        env_files.push(EnvFile {
            filename: filename.to_string(),
            path: file_path.to_string_lossy().to_string(),
            variables,
            exists,
            is_gitignored,
            last_modified,
        });
    }

    Ok(env_files)
}

#[tauri::command]
pub fn read_env_file(file_path: String) -> Result<EnvFile, String> {
    let path = Path::new(&file_path);
    let filename = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    if !path.exists() {
        return Ok(EnvFile {
            filename,
            path: file_path,
            variables: Vec::new(),
            exists: false,
            is_gitignored: false,
            last_modified: None,
        });
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let variables = parse_env_content(&content);

    let project_dir = path.parent();
    let is_gitignored = if let Some(proj_path) = project_dir {
        let gitignore = build_gitignore(proj_path);
        is_path_gitignored(path, false, &gitignore)
    } else {
        false
    };

    let last_modified = fs::metadata(path)
        .and_then(|m| m.modified())
        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs() as i64)
        .ok();

    Ok(EnvFile {
        filename,
        path: file_path,
        variables,
        exists: true,
        is_gitignored,
        last_modified,
    })
}

#[tauri::command]
pub fn write_env_file(file_path: String, variables: Vec<EnvVariable>) -> Result<(), String> {
    let content = serialize_env_variables(&variables);
    fs::write(&file_path, content).map_err(|e| format!("Failed to write env file: {}", e))
}

#[tauri::command]
pub fn create_env_file(project_path: String, filename: String) -> Result<String, String> {
    let file_path = Path::new(&project_path).join(&filename);

    if file_path.exists() {
        return Err(format!("File already exists: {}", filename));
    }

    // Create empty file with a comment header
    let content = format!("# Environment variables for {}\n# Created by Wynter Code\n\n", filename);
    fs::write(&file_path, content).map_err(|e| format!("Failed to create env file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn check_env_gitignore(project_path: String, filename: String) -> Result<bool, String> {
    let project_dir = Path::new(&project_path);
    let file_path = project_dir.join(&filename);
    let gitignore = build_gitignore(project_dir);

    Ok(is_path_gitignored(&file_path, false, &gitignore))
}

#[derive(Debug, Clone, Serialize)]
pub struct SystemEnvVar {
    pub key: String,
    pub value: String,
}

#[tauri::command]
pub fn get_system_env_vars() -> Vec<SystemEnvVar> {
    std::env::vars()
        .map(|(key, value)| SystemEnvVar { key, value })
        .collect()
}

#[tauri::command]
pub fn set_system_env_var(key: String, value: String) -> Result<(), String> {
    if key.is_empty() {
        return Err("Key cannot be empty".to_string());
    }
    std::env::set_var(&key, &value);
    Ok(())
}

#[tauri::command]
pub fn remove_system_env_var(key: String) -> Result<(), String> {
    if key.is_empty() {
        return Err("Key cannot be empty".to_string());
    }
    std::env::remove_var(&key);
    Ok(())
}

// ============================================
// File Compression Commands
// ============================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressionResult {
    pub success: bool,
    pub output_path: String,
    pub original_size: u64,
    pub compressed_size: u64,
    pub savings_percent: f32,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn create_zip_archive(
    paths: Vec<String>,
    output_path: Option<String>,
    overwrite: bool,
) -> Result<CompressionResult, String> {
    use std::io::{Read, Write};
    use walkdir::WalkDir;
    use zip::write::SimpleFileOptions;
    use zip::CompressionMethod;

    if paths.is_empty() {
        return Err("No paths provided".to_string());
    }

    // Calculate original size
    let mut original_size: u64 = 0;
    for path_str in &paths {
        let path = Path::new(path_str);
        if path.is_dir() {
            for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
                if entry.file_type().is_file() {
                    if let Ok(meta) = fs::metadata(entry.path()) {
                        original_size += meta.len();
                    }
                }
            }
        } else if let Ok(meta) = fs::metadata(path) {
            original_size += meta.len();
        }
    }

    // Determine output path
    let first_path = Path::new(&paths[0]);
    let archive_name = first_path
        .file_stem()
        .and_then(|n| n.to_str())
        .unwrap_or("archive");

    let parent_dir = first_path.parent().unwrap_or(Path::new("."));

    let zip_path = if let Some(ref out) = output_path {
        Path::new(out).to_path_buf()
    } else {
        let mut candidate = parent_dir.join(format!("{}.zip", archive_name));
        if !overwrite {
            let mut counter = 1;
            while candidate.exists() {
                candidate = parent_dir.join(format!("{}_{}.zip", archive_name, counter));
                counter += 1;
            }
        }
        candidate
    };

    if zip_path.exists() && !overwrite {
        return Err(format!("File already exists: {:?}", zip_path));
    }

    // Create zip file
    let file = fs::File::create(&zip_path)
        .map_err(|e| format!("Failed to create zip file: {}", e))?;

    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .compression_level(Some(6));

    for path_str in &paths {
        let path = Path::new(path_str);

        if path.is_dir() {
            // Add directory contents
            for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
                let entry_path = entry.path();
                let relative_path = entry_path
                    .strip_prefix(path.parent().unwrap_or(Path::new(".")))
                    .unwrap_or(entry_path);

                if entry.file_type().is_dir() {
                    let dir_name = format!("{}/", relative_path.to_string_lossy());
                    zip.add_directory(&dir_name, options)
                        .map_err(|e| format!("Failed to add directory: {}", e))?;
                } else {
                    let mut file = fs::File::open(entry_path)
                        .map_err(|e| format!("Failed to open file: {}", e))?;

                    let mut buffer = Vec::new();
                    file.read_to_end(&mut buffer)
                        .map_err(|e| format!("Failed to read file: {}", e))?;

                    zip.start_file(relative_path.to_string_lossy(), options)
                        .map_err(|e| format!("Failed to start file in zip: {}", e))?;

                    zip.write_all(&buffer)
                        .map_err(|e| format!("Failed to write to zip: {}", e))?;
                }
            }
        } else {
            // Add single file
            let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("file");

            let mut file = fs::File::open(path)
                .map_err(|e| format!("Failed to open file: {}", e))?;

            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer)
                .map_err(|e| format!("Failed to read file: {}", e))?;

            zip.start_file(file_name, options)
                .map_err(|e| format!("Failed to start file in zip: {}", e))?;

            zip.write_all(&buffer)
                .map_err(|e| format!("Failed to write to zip: {}", e))?;
        }
    }

    zip.finish().map_err(|e| format!("Failed to finish zip: {}", e))?;

    // Get compressed size
    let compressed_size = fs::metadata(&zip_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let savings_percent = if original_size > 0 {
        ((original_size as f32 - compressed_size as f32) / original_size as f32) * 100.0
    } else {
        0.0
    };

    Ok(CompressionResult {
        success: true,
        output_path: zip_path.to_string_lossy().to_string(),
        original_size,
        compressed_size,
        savings_percent,
        error: None,
    })
}

/// Zips a folder and returns the data as base64.
/// Used for Netlify FTP drop zone to auto-zip folders before deploying.
#[tauri::command]
pub fn zip_folder_to_base64(folder_path: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    use std::io::{Read, Write, Cursor};
    use walkdir::WalkDir;
    use zip::write::SimpleFileOptions;
    use zip::CompressionMethod;

    let path = Path::new(&folder_path);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", folder_path));
    }

    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", folder_path));
    }

    // Create zip in memory
    let mut buffer = Cursor::new(Vec::new());
    {
        let mut zip = zip::ZipWriter::new(&mut buffer);
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .compression_level(Some(6));

        // Walk the directory and add all files
        for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
            let entry_path = entry.path();
            // Get path relative to the folder being zipped (not its parent)
            let relative_path = entry_path
                .strip_prefix(path)
                .unwrap_or(entry_path);

            // Skip the root directory itself
            if relative_path.as_os_str().is_empty() {
                continue;
            }

            if entry.file_type().is_dir() {
                let dir_name = format!("{}/", relative_path.to_string_lossy());
                zip.add_directory(&dir_name, options)
                    .map_err(|e| format!("Failed to add directory: {}", e))?;
            } else {
                let mut file = fs::File::open(entry_path)
                    .map_err(|e| format!("Failed to open file: {}", e))?;

                let mut file_buffer = Vec::new();
                file.read_to_end(&mut file_buffer)
                    .map_err(|e| format!("Failed to read file: {}", e))?;

                zip.start_file(relative_path.to_string_lossy(), options)
                    .map_err(|e| format!("Failed to start file in zip: {}", e))?;

                zip.write_all(&file_buffer)
                    .map_err(|e| format!("Failed to write to zip: {}", e))?;
            }
        }

        zip.finish().map_err(|e| format!("Failed to finish zip: {}", e))?;
    }

    // Return as base64
    Ok(STANDARD.encode(buffer.into_inner()))
}

/// Result of zipping a folder for deploy
#[derive(Debug, Serialize, Deserialize)]
pub struct DeployZipResult {
    pub base64: String,
    pub folder_name: String,
    pub is_build_folder: bool,
}

/// Zips a project folder for Netlify deployment.
/// Auto-detects build folders (dist, build, out) and uses those if found.
/// Otherwise zips the entire project with smart exclusions.
#[tauri::command]
pub fn zip_folder_for_deploy(project_path: String) -> Result<DeployZipResult, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    use std::io::{Read, Write, Cursor};
    use walkdir::WalkDir;
    use zip::write::SimpleFileOptions;
    use zip::CompressionMethod;

    let project = Path::new(&project_path);

    if !project.exists() {
        return Err(format!("Path does not exist: {}", project_path));
    }

    if !project.is_dir() {
        return Err(format!("Path is not a directory: {}", project_path));
    }

    // Check for common build output folders in priority order
    let build_folders = ["dist", "build", "out", ".next/out"];
    let mut target_path = None;
    let mut is_build_folder = false;

    for folder in &build_folders {
        let candidate = project.join(folder);
        if candidate.exists() && candidate.is_dir() {
            // Make sure it's not empty
            if let Ok(mut entries) = fs::read_dir(&candidate) {
                if entries.next().is_some() {
                    target_path = Some(candidate);
                    is_build_folder = true;
                    break;
                }
            }
        }
    }

    // If no build folder found, use the project root
    let project_path_buf = project.to_path_buf();
    let path = target_path.as_ref().unwrap_or(&project_path_buf);
    let folder_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("deploy")
        .to_string();

    // Exclusion patterns for full project deploy (only used when is_build_folder is false)
    let excluded_dirs: std::collections::HashSet<&str> = [
        ".git",
        "node_modules",
        "target",
        ".next",
        "__pycache__",
        ".cache",
        ".turbo",
        "coverage",
        ".nyc_output",
        ".pytest_cache",
        "venv",
        ".venv",
        "vendor",
    ]
    .iter()
    .cloned()
    .collect();

    let excluded_files: &[&str] = &[
        ".DS_Store",
        "Thumbs.db",
        ".env",
        ".env.local",
        ".env.development.local",
        ".env.test.local",
        ".env.production.local",
    ];

    let excluded_extensions: &[&str] = &["log", "tmp", "swp", "swo"];

    // Create zip in memory
    let mut buffer = Cursor::new(Vec::new());
    {
        let mut zip = zip::ZipWriter::new(&mut buffer);
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .compression_level(Some(6));

        // Walk the directory and add files
        for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
            let entry_path = entry.path();
            let relative_path = entry_path.strip_prefix(path).unwrap_or(entry_path);

            // Skip the root directory itself
            if relative_path.as_os_str().is_empty() {
                continue;
            }

            // Apply exclusions only when zipping full project (not build folder)
            if !is_build_folder {
                // Check if any parent component matches excluded dirs
                let should_exclude = relative_path.components().any(|c| {
                    if let std::path::Component::Normal(name) = c {
                        if let Some(name_str) = name.to_str() {
                            return excluded_dirs.contains(name_str);
                        }
                    }
                    false
                });

                if should_exclude {
                    continue;
                }

                // Check file-specific exclusions
                if entry.file_type().is_file() {
                    if let Some(file_name) = entry_path.file_name().and_then(|n| n.to_str()) {
                        // Check excluded files
                        if excluded_files.iter().any(|f| file_name == *f) {
                            continue;
                        }
                        // Check excluded extensions
                        if let Some(ext) = entry_path.extension().and_then(|e| e.to_str()) {
                            if excluded_extensions.contains(&ext) {
                                continue;
                            }
                        }
                    }
                }
            }

            if entry.file_type().is_dir() {
                let dir_name = format!("{}/", relative_path.to_string_lossy());
                zip.add_directory(&dir_name, options)
                    .map_err(|e| format!("Failed to add directory: {}", e))?;
            } else {
                let mut file = fs::File::open(entry_path)
                    .map_err(|e| format!("Failed to open file: {}", e))?;

                let mut file_buffer = Vec::new();
                file.read_to_end(&mut file_buffer)
                    .map_err(|e| format!("Failed to read file: {}", e))?;

                zip.start_file(relative_path.to_string_lossy(), options)
                    .map_err(|e| format!("Failed to start file in zip: {}", e))?;

                zip.write_all(&file_buffer)
                    .map_err(|e| format!("Failed to write to zip: {}", e))?;
            }
        }

        zip.finish().map_err(|e| format!("Failed to finish zip: {}", e))?;
    }

    Ok(DeployZipResult {
        base64: STANDARD.encode(buffer.into_inner()),
        folder_name,
        is_build_folder,
    })
}

/// Result of image optimization estimation
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageEstimateResult {
    pub original_size: u64,
    pub estimated_size: u64,
    pub estimated_savings_percent: f32,
    pub format: String,
    pub target_format: String,
    pub supports_quality: bool,
    pub can_convert_to_webp: bool,
}

/// Encode image to WebP with quality setting
fn encode_to_webp_lossy(img: &image::DynamicImage, quality: f32) -> Result<Vec<u8>, String> {
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    let encoder = webp::Encoder::from_rgba(&rgba, width, height);
    let webp_data = encoder.encode(quality);

    Ok(webp_data.to_vec())
}

/// Estimate optimization savings without actually saving
#[tauri::command]
pub async fn estimate_image_optimization(
    path: String,
    quality: u8,
    convert_to_webp: Option<bool>,
) -> Result<ImageEstimateResult, String> {
    use image::codecs::jpeg::JpegEncoder;
    use std::io::Cursor;

    let input_path = Path::new(&path);
    let to_webp = convert_to_webp.unwrap_or(false);

    if !input_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    let original_size = fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let ext = input_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    // If converting to WebP, handle all formats uniformly
    if to_webp && ext != "webp" {
        let img = image::open(&input_path)
            .map_err(|e| format!("Failed to open image: {}", e))?;

        let webp_data = encode_to_webp_lossy(&img, quality as f32)
            .map_err(|e| format!("Failed to encode WebP: {}", e))?;

        let estimated_size = webp_data.len() as u64;
        let estimated_savings_percent = if original_size > 0 {
            ((original_size as f32 - estimated_size as f32) / original_size as f32) * 100.0
        } else {
            0.0
        };

        return Ok(ImageEstimateResult {
            original_size,
            estimated_size,
            estimated_savings_percent,
            format: ext.to_uppercase(),
            target_format: "WebP".to_string(),
            supports_quality: true,
            can_convert_to_webp: true,
        });
    }

    match ext.as_str() {
        "png" => {
            // For PNG, estimate using oxipng in memory
            let input_data = fs::read(&input_path)
                .map_err(|e| format!("Failed to read PNG: {}", e))?;

            let options = oxipng::Options::from_preset(3);
            let optimized = oxipng::optimize_from_memory(&input_data, &options)
                .map_err(|e| format!("PNG optimization failed: {}", e))?;

            let estimated_size = optimized.len() as u64;
            let estimated_savings_percent = if original_size > 0 {
                ((original_size as f32 - estimated_size as f32) / original_size as f32) * 100.0
            } else {
                0.0
            };

            Ok(ImageEstimateResult {
                original_size,
                estimated_size,
                estimated_savings_percent,
                format: "PNG".to_string(),
                target_format: "PNG".to_string(),
                supports_quality: false,
                can_convert_to_webp: true,
            })
        }
        "jpg" | "jpeg" => {
            // For JPEG, encode to memory buffer with specified quality
            let img = image::open(&input_path)
                .map_err(|e| format!("Failed to open JPEG: {}", e))?;

            let mut buffer = Cursor::new(Vec::new());
            let encoder = JpegEncoder::new_with_quality(&mut buffer, quality);
            img.write_with_encoder(encoder)
                .map_err(|e| format!("Failed to estimate JPEG: {}", e))?;

            let estimated_size = buffer.into_inner().len() as u64;
            let estimated_savings_percent = if original_size > 0 {
                ((original_size as f32 - estimated_size as f32) / original_size as f32) * 100.0
            } else {
                0.0
            };

            Ok(ImageEstimateResult {
                original_size,
                estimated_size,
                estimated_savings_percent,
                format: "JPEG".to_string(),
                target_format: "JPEG".to_string(),
                supports_quality: true,
                can_convert_to_webp: true,
            })
        }
        "webp" => {
            // WebP - re-encode with quality
            let img = image::open(&input_path)
                .map_err(|e| format!("Failed to open WebP: {}", e))?;

            let webp_data = encode_to_webp_lossy(&img, quality as f32)
                .map_err(|e| format!("Failed to encode WebP: {}", e))?;

            let estimated_size = webp_data.len() as u64;
            let estimated_savings_percent = if original_size > 0 {
                ((original_size as f32 - estimated_size as f32) / original_size as f32) * 100.0
            } else {
                0.0
            };

            Ok(ImageEstimateResult {
                original_size,
                estimated_size,
                estimated_savings_percent,
                format: "WebP".to_string(),
                target_format: "WebP".to_string(),
                supports_quality: true,
                can_convert_to_webp: false,
            })
        }
        "gif" => {
            // GIF - estimate by encoding to memory
            let img = image::open(&input_path)
                .map_err(|e| format!("Failed to open GIF: {}", e))?;

            let mut buffer = Cursor::new(Vec::new());
            img.write_to(&mut buffer, image::ImageFormat::Gif)
                .map_err(|e| format!("Failed to estimate GIF: {}", e))?;

            let estimated_size = buffer.into_inner().len() as u64;
            let estimated_savings_percent = if original_size > 0 {
                ((original_size as f32 - estimated_size as f32) / original_size as f32) * 100.0
            } else {
                0.0
            };

            Ok(ImageEstimateResult {
                original_size,
                estimated_size,
                estimated_savings_percent,
                format: "GIF".to_string(),
                target_format: "GIF".to_string(),
                supports_quality: false,
                can_convert_to_webp: true,
            })
        }
        _ => Err(format!("Unsupported image format: {}", ext)),
    }
}

#[tauri::command]
pub async fn optimize_image(
    path: String,
    overwrite: bool,
    quality: Option<u8>,
    convert_to_webp: Option<bool>,
) -> Result<CompressionResult, String> {
    use image::codecs::jpeg::JpegEncoder;

    let input_path = Path::new(&path);
    let to_webp = convert_to_webp.unwrap_or(false);

    if !input_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    let original_size = fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let ext = input_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    // Determine output extension based on conversion
    let output_ext = if to_webp && ext != "webp" { "webp" } else { &ext };

    // Determine output path
    let output_path = if overwrite && !to_webp {
        input_path.to_path_buf()
    } else {
        let stem = input_path.file_stem().and_then(|s| s.to_str()).unwrap_or("image");
        let parent = input_path.parent().unwrap_or(Path::new("."));
        if to_webp && ext != "webp" {
            parent.join(format!("{}.webp", stem))
        } else {
            parent.join(format!("{}_optimized.{}", stem, output_ext))
        }
    };

    // Handle WebP conversion for any format
    if to_webp && ext != "webp" {
        let img = image::open(&input_path)
            .map_err(|e| format!("Failed to open image: {}", e))?;

        let quality_value = quality.unwrap_or(85) as f32;
        let webp_data = encode_to_webp_lossy(&img, quality_value)
            .map_err(|e| format!("Failed to encode WebP: {}", e))?;

        fs::write(&output_path, &webp_data)
            .map_err(|e| format!("Failed to write WebP: {}", e))?;

        let compressed_size = webp_data.len() as u64;
        let savings_percent = if original_size > 0 {
            ((original_size as f32 - compressed_size as f32) / original_size as f32) * 100.0
        } else {
            0.0
        };

        return Ok(CompressionResult {
            success: true,
            output_path: output_path.to_string_lossy().to_string(),
            original_size,
            compressed_size,
            savings_percent,
            error: None,
        });
    }

    match ext.as_str() {
        "png" => {
            // Use oxipng for PNG optimization (lossless)
            let input_data = fs::read(&input_path)
                .map_err(|e| format!("Failed to read PNG: {}", e))?;

            let options = oxipng::Options::from_preset(3);
            let optimized = oxipng::optimize_from_memory(&input_data, &options)
                .map_err(|e| format!("PNG optimization failed: {}", e))?;

            fs::write(&output_path, &optimized)
                .map_err(|e| format!("Failed to write optimized PNG: {}", e))?;

            let compressed_size = optimized.len() as u64;
            let savings_percent = if original_size > 0 {
                ((original_size as f32 - compressed_size as f32) / original_size as f32) * 100.0
            } else {
                0.0
            };

            Ok(CompressionResult {
                success: true,
                output_path: output_path.to_string_lossy().to_string(),
                original_size,
                compressed_size,
                savings_percent,
                error: None,
            })
        }
        "jpg" | "jpeg" => {
            // Use image crate for JPEG with quality setting
            let img = image::open(&input_path)
                .map_err(|e| format!("Failed to open JPEG: {}", e))?;

            let quality_value = quality.unwrap_or(85);
            let file = fs::File::create(&output_path)
                .map_err(|e| format!("Failed to create output file: {}", e))?;
            let mut writer = std::io::BufWriter::new(file);
            let encoder = JpegEncoder::new_with_quality(&mut writer, quality_value);
            img.write_with_encoder(encoder)
                .map_err(|e| format!("Failed to save JPEG: {}", e))?;
            drop(writer);

            let compressed_size = fs::metadata(&output_path)
                .map(|m| m.len())
                .unwrap_or(0);

            let savings_percent = if original_size > 0 {
                ((original_size as f32 - compressed_size as f32) / original_size as f32) * 100.0
            } else {
                0.0
            };

            Ok(CompressionResult {
                success: true,
                output_path: output_path.to_string_lossy().to_string(),
                original_size,
                compressed_size,
                savings_percent,
                error: None,
            })
        }
        "webp" => {
            // Re-encode WebP with quality
            let img = image::open(&input_path)
                .map_err(|e| format!("Failed to open WebP: {}", e))?;

            let quality_value = quality.unwrap_or(85) as f32;
            let webp_data = encode_to_webp_lossy(&img, quality_value)
                .map_err(|e| format!("Failed to encode WebP: {}", e))?;

            fs::write(&output_path, &webp_data)
                .map_err(|e| format!("Failed to write WebP: {}", e))?;

            let compressed_size = webp_data.len() as u64;
            let savings_percent = if original_size > 0 {
                ((original_size as f32 - compressed_size as f32) / original_size as f32) * 100.0
            } else {
                0.0
            };

            Ok(CompressionResult {
                success: true,
                output_path: output_path.to_string_lossy().to_string(),
                original_size,
                compressed_size,
                savings_percent,
                error: None,
            })
        }
        "gif" => {
            // Use image crate for GIF
            let img = image::open(&input_path)
                .map_err(|e| format!("Failed to open image: {}", e))?;

            img.save(&output_path)
                .map_err(|e| format!("Failed to save image: {}", e))?;

            let compressed_size = fs::metadata(&output_path)
                .map(|m| m.len())
                .unwrap_or(0);

            let savings_percent = if original_size > 0 {
                ((original_size as f32 - compressed_size as f32) / original_size as f32) * 100.0
            } else {
                0.0
            };

            Ok(CompressionResult {
                success: true,
                output_path: output_path.to_string_lossy().to_string(),
                original_size,
                compressed_size,
                savings_percent,
                error: None,
            })
        }
        _ => Err(format!("Unsupported image format: {}", ext)),
    }
}

#[tauri::command]
pub async fn optimize_pdf(path: String, overwrite: bool) -> Result<CompressionResult, String> {
    use lopdf::Document;

    let input_path = Path::new(&path);

    if !input_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    let original_size = fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // Determine output path
    let output_path = if overwrite {
        input_path.to_path_buf()
    } else {
        let stem = input_path.file_stem().and_then(|s| s.to_str()).unwrap_or("document");
        let parent = input_path.parent().unwrap_or(Path::new("."));
        parent.join(format!("{}_optimized.pdf", stem))
    };

    // Load and optimize PDF
    let mut doc = Document::load(&input_path)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;

    // Remove unused objects
    doc.prune_objects();

    // Compress streams
    doc.compress();

    // Save optimized PDF
    doc.save(&output_path)
        .map_err(|e| format!("Failed to save optimized PDF: {}", e))?;

    let compressed_size = fs::metadata(&output_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let savings_percent = if original_size > 0 {
        ((original_size as f32 - compressed_size as f32) / original_size as f32) * 100.0
    } else {
        0.0
    };

    Ok(CompressionResult {
        success: true,
        output_path: output_path.to_string_lossy().to_string(),
        original_size,
        compressed_size,
        savings_percent,
        error: None,
    })
}

#[tauri::command]
pub fn check_ffmpeg_available() -> bool {
    Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[tauri::command]
pub async fn optimize_video(path: String, overwrite: bool) -> Result<CompressionResult, String> {
    let input_path = Path::new(&path);

    if !input_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    // Check if ffmpeg is available
    if !check_ffmpeg_available() {
        return Err("ffmpeg is not installed. Please install ffmpeg to optimize videos.".to_string());
    }

    let original_size = fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let ext = input_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("mp4");

    // Determine output path
    let output_path = if overwrite {
        // Use temp file then replace
        let temp_path = input_path.with_extension(format!("temp.{}", ext));
        temp_path
    } else {
        let stem = input_path.file_stem().and_then(|s| s.to_str()).unwrap_or("video");
        let parent = input_path.parent().unwrap_or(Path::new("."));
        parent.join(format!("{}_optimized.{}", stem, ext))
    };

    // Run ffmpeg with CRF 23 (good quality/size balance)
    let output = Command::new("ffmpeg")
        .args([
            "-i", &path,
            "-c:v", "libx264",
            "-crf", "23",
            "-preset", "medium",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            "-y",
            output_path.to_str().unwrap_or("output.mp4"),
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffmpeg failed: {}", stderr));
    }

    // If overwriting, replace original with temp
    let final_path = if overwrite {
        fs::rename(&output_path, &input_path)
            .map_err(|e| format!("Failed to replace original: {}", e))?;
        input_path.to_path_buf()
    } else {
        output_path
    };

    let compressed_size = fs::metadata(&final_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let savings_percent = if original_size > 0 {
        ((original_size as f32 - compressed_size as f32) / original_size as f32) * 100.0
    } else {
        0.0
    };

    Ok(CompressionResult {
        success: true,
        output_path: final_path.to_string_lossy().to_string(),
        original_size,
        compressed_size,
        savings_percent,
        error: None,
    })
}

// ============================================================================
// MCP Server Management
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServer {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: std::collections::HashMap<String, String>,
    pub scope: String, // "global", "project", or "project-local"
    pub is_enabled: bool,
    pub project_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerInput {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: std::collections::HashMap<String, String>,
    pub scope: String,
    pub project_path: Option<String>,
}

#[tauri::command]
pub fn get_mcp_servers(project_path: Option<String>) -> Result<Vec<McpServer>, String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    let mut servers: Vec<McpServer> = Vec::new();

    // Read ~/.claude.json for global and project MCPs
    let claude_json_path = home_dir.join(".claude.json");
    if claude_json_path.exists() {
        let content = fs::read_to_string(&claude_json_path)
            .map_err(|e| format!("Failed to read ~/.claude.json: {}", e))?;
        let config: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse ~/.claude.json: {}", e))?;

        // Get global mcpServers
        if let Some(mcp_servers) = config.get("mcpServers").and_then(|v| v.as_object()) {
            for (name, server_config) in mcp_servers {
                servers.push(parse_mcp_server(name, server_config, "global", None));
            }
        }

        // Get project-specific mcpServers if project_path is provided
        if let Some(ref project) = project_path {
            if let Some(projects) = config.get("projects").and_then(|v| v.as_object()) {
                if let Some(project_config) = projects.get(project) {
                    if let Some(mcp_servers) = project_config.get("mcpServers").and_then(|v| v.as_object()) {
                        for (name, server_config) in mcp_servers {
                            servers.push(parse_mcp_server(name, server_config, "project", Some(project.clone())));
                        }
                    }
                }
            }
        }
    }

    // Read project-local .mcp.json if it exists
    if let Some(ref project) = project_path {
        let mcp_json_path = Path::new(project).join(".mcp.json");
        if mcp_json_path.exists() {
            if let Ok(content) = fs::read_to_string(&mcp_json_path) {
                if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(mcp_servers) = config.get("mcpServers").and_then(|v| v.as_object()) {
                        for (name, server_config) in mcp_servers {
                            servers.push(parse_mcp_server(name, server_config, "project-local", Some(project.clone())));
                        }
                    }
                }
            }
        }
    }

    // Read ~/.claude/settings.json to determine enabled state
    let settings_path = home_dir.join(".claude").join("settings.json");
    let enabled_mcps: std::collections::HashSet<String> = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path).unwrap_or_default();
        if let Ok(settings) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(permissions) = settings.get("permissions").and_then(|v| v.as_object()) {
                if let Some(allow) = permissions.get("allow").and_then(|v| v.as_array()) {
                    allow
                        .iter()
                        .filter_map(|v| v.as_str())
                        .filter(|s| s.starts_with("mcp__"))
                        .map(|s| {
                            // Extract MCP name from "mcp__name__*" or "mcp__name__tool"
                            let parts: Vec<&str> = s.split("__").collect();
                            if parts.len() >= 2 {
                                parts[1].to_string()
                            } else {
                                s.to_string()
                            }
                        })
                        .collect()
                } else {
                    std::collections::HashSet::new()
                }
            } else {
                std::collections::HashSet::new()
            }
        } else {
            std::collections::HashSet::new()
        }
    } else {
        std::collections::HashSet::new()
    };

    // Update enabled state for each server
    for server in &mut servers {
        server.is_enabled = enabled_mcps.contains(&server.name);
    }

    Ok(servers)
}

fn parse_mcp_server(
    name: &str,
    config: &serde_json::Value,
    scope: &str,
    project_path: Option<String>,
) -> McpServer {
    let command = config
        .get("command")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let args = config
        .get("args")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    let env = config
        .get("env")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                .collect()
        })
        .unwrap_or_default();

    McpServer {
        name: name.to_string(),
        command,
        args,
        env,
        scope: scope.to_string(),
        is_enabled: false, // Will be updated later
        project_path,
    }
}

#[tauri::command]
pub fn save_mcp_server(server: McpServerInput) -> Result<(), String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    let server_config = serde_json::json!({
        "command": server.command,
        "args": server.args,
        "env": server.env,
    });

    match server.scope.as_str() {
        "global" => {
            let claude_json_path = home_dir.join(".claude.json");
            let mut config = if claude_json_path.exists() {
                let content = fs::read_to_string(&claude_json_path)
                    .map_err(|e| format!("Failed to read ~/.claude.json: {}", e))?;
                serde_json::from_str(&content)
                    .map_err(|e| format!("Failed to parse ~/.claude.json: {}", e))?
            } else {
                serde_json::json!({})
            };

            // Ensure mcpServers object exists
            if config.get("mcpServers").is_none() {
                config["mcpServers"] = serde_json::json!({});
            }

            config["mcpServers"][&server.name] = server_config;

            let content = serde_json::to_string_pretty(&config)
                .map_err(|e| format!("Failed to serialize config: {}", e))?;
            fs::write(&claude_json_path, content)
                .map_err(|e| format!("Failed to write ~/.claude.json: {}", e))?;
        }
        "project" => {
            let project_path = server.project_path
                .ok_or("Project path required for project scope")?;

            let claude_json_path = home_dir.join(".claude.json");
            let mut config = if claude_json_path.exists() {
                let content = fs::read_to_string(&claude_json_path)
                    .map_err(|e| format!("Failed to read ~/.claude.json: {}", e))?;
                serde_json::from_str(&content)
                    .map_err(|e| format!("Failed to parse ~/.claude.json: {}", e))?
            } else {
                serde_json::json!({})
            };

            // Ensure projects and project path exist
            if config.get("projects").is_none() {
                config["projects"] = serde_json::json!({});
            }
            if config["projects"].get(&project_path).is_none() {
                config["projects"][&project_path] = serde_json::json!({});
            }
            if config["projects"][&project_path].get("mcpServers").is_none() {
                config["projects"][&project_path]["mcpServers"] = serde_json::json!({});
            }

            config["projects"][&project_path]["mcpServers"][&server.name] = server_config;

            let content = serde_json::to_string_pretty(&config)
                .map_err(|e| format!("Failed to serialize config: {}", e))?;
            fs::write(&claude_json_path, content)
                .map_err(|e| format!("Failed to write ~/.claude.json: {}", e))?;
        }
        "project-local" => {
            let project_path = server.project_path
                .ok_or("Project path required for project-local scope")?;

            let mcp_json_path = Path::new(&project_path).join(".mcp.json");
            let mut config = if mcp_json_path.exists() {
                let content = fs::read_to_string(&mcp_json_path)
                    .map_err(|e| format!("Failed to read .mcp.json: {}", e))?;
                serde_json::from_str(&content)
                    .map_err(|e| format!("Failed to parse .mcp.json: {}", e))?
            } else {
                serde_json::json!({})
            };

            if config.get("mcpServers").is_none() {
                config["mcpServers"] = serde_json::json!({});
            }

            config["mcpServers"][&server.name] = server_config;

            let content = serde_json::to_string_pretty(&config)
                .map_err(|e| format!("Failed to serialize config: {}", e))?;
            fs::write(&mcp_json_path, content)
                .map_err(|e| format!("Failed to write .mcp.json: {}", e))?;
        }
        _ => return Err(format!("Invalid scope: {}", server.scope)),
    }

    Ok(())
}

#[tauri::command]
pub fn delete_mcp_server(
    name: String,
    scope: String,
    project_path: Option<String>,
) -> Result<(), String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    match scope.as_str() {
        "global" => {
            let claude_json_path = home_dir.join(".claude.json");
            if !claude_json_path.exists() {
                return Ok(());
            }

            let content = fs::read_to_string(&claude_json_path)
                .map_err(|e| format!("Failed to read ~/.claude.json: {}", e))?;
            let mut config: serde_json::Value = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse ~/.claude.json: {}", e))?;

            if let Some(mcp_servers) = config.get_mut("mcpServers").and_then(|v| v.as_object_mut()) {
                mcp_servers.remove(&name);
            }

            let content = serde_json::to_string_pretty(&config)
                .map_err(|e| format!("Failed to serialize config: {}", e))?;
            fs::write(&claude_json_path, content)
                .map_err(|e| format!("Failed to write ~/.claude.json: {}", e))?;
        }
        "project" => {
            let project = project_path.ok_or("Project path required for project scope")?;

            let claude_json_path = home_dir.join(".claude.json");
            if !claude_json_path.exists() {
                return Ok(());
            }

            let content = fs::read_to_string(&claude_json_path)
                .map_err(|e| format!("Failed to read ~/.claude.json: {}", e))?;
            let mut config: serde_json::Value = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse ~/.claude.json: {}", e))?;

            if let Some(projects) = config.get_mut("projects").and_then(|v| v.as_object_mut()) {
                if let Some(project_config) = projects.get_mut(&project).and_then(|v| v.as_object_mut()) {
                    if let Some(mcp_servers) = project_config.get_mut("mcpServers").and_then(|v| v.as_object_mut()) {
                        mcp_servers.remove(&name);
                    }
                }
            }

            let content = serde_json::to_string_pretty(&config)
                .map_err(|e| format!("Failed to serialize config: {}", e))?;
            fs::write(&claude_json_path, content)
                .map_err(|e| format!("Failed to write ~/.claude.json: {}", e))?;
        }
        "project-local" => {
            let project = project_path.ok_or("Project path required for project-local scope")?;

            let mcp_json_path = Path::new(&project).join(".mcp.json");
            if !mcp_json_path.exists() {
                return Ok(());
            }

            let content = fs::read_to_string(&mcp_json_path)
                .map_err(|e| format!("Failed to read .mcp.json: {}", e))?;
            let mut config: serde_json::Value = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse .mcp.json: {}", e))?;

            if let Some(mcp_servers) = config.get_mut("mcpServers").and_then(|v| v.as_object_mut()) {
                mcp_servers.remove(&name);
            }

            let content = serde_json::to_string_pretty(&config)
                .map_err(|e| format!("Failed to serialize config: {}", e))?;
            fs::write(&mcp_json_path, content)
                .map_err(|e| format!("Failed to write .mcp.json: {}", e))?;
        }
        _ => return Err(format!("Invalid scope: {}", scope)),
    }

    // Also remove from permissions
    let _ = toggle_mcp_server(name, false);

    Ok(())
}

#[tauri::command]
pub fn toggle_mcp_server(name: String, enabled: bool) -> Result<(), String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    let settings_path = home_dir.join(".claude").join("settings.json");

    let mut settings: serde_json::Value = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse settings: {}", e))?
    } else {
        serde_json::json!({})
    };

    // Ensure permissions.allow exists
    if settings.get("permissions").is_none() {
        settings["permissions"] = serde_json::json!({});
    }
    if settings["permissions"].get("allow").is_none() {
        settings["permissions"]["allow"] = serde_json::json!([]);
    }

    let permission_pattern = format!("mcp__{}__*", name);

    if let Some(allow) = settings["permissions"]["allow"].as_array_mut() {
        // Remove existing entries for this MCP
        allow.retain(|v| {
            if let Some(s) = v.as_str() {
                !s.starts_with(&format!("mcp__{}__", name))
            } else {
                true
            }
        });

        // Add if enabling
        if enabled {
            allow.push(serde_json::json!(permission_pattern));
        }
    }

    // Ensure directory exists
    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_path, content)
        .map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn validate_mcp_command(command: String) -> Result<bool, String> {
    // Use 'which' on Unix or 'where' on Windows to check if command exists
    #[cfg(target_os = "windows")]
    let check_cmd = "where";
    #[cfg(not(target_os = "windows"))]
    let check_cmd = "which";

    let output = Command::new(check_cmd)
        .arg(&command)
        .env("PATH", crate::path_utils::get_enhanced_path())
        .output()
        .map_err(|e| format!("Failed to check command: {}", e))?;

    Ok(output.status.success())
}

#[tauri::command]
pub fn read_claude_stats() -> Result<serde_json::Value, String> {
    let home = dirs::home_dir()
        .ok_or_else(|| "Could not find home directory".to_string())?;

    let stats_path = home.join(".claude").join("stats-cache.json");

    if !stats_path.exists() {
        return Err("Stats file not found. Claude Code CLI may not have generated stats yet.".to_string());
    }

    let content = fs::read_to_string(&stats_path)
        .map_err(|e| format!("Failed to read stats file: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse stats JSON: {}", e))
}

/// List files in a directory with a specific extension
/// Used for scanning custom slash commands in .claude/commands/
#[tauri::command]
pub fn list_directory_files(path: String, extension: String) -> Result<Vec<String>, String> {
    let dir = Path::new(&path);
    if !dir.exists() || !dir.is_dir() {
        return Ok(vec![]);
    }

    let mut files = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let file_path = entry.path();
            if file_path.is_file() {
                if let Some(ext) = file_path.extension() {
                    if ext == extension.as_str() {
                        if let Some(path_str) = file_path.to_str() {
                            files.push(path_str.to_string());
                        }
                    }
                }
            }
        }
    }

    Ok(files)
}

/// Read the first N lines of a file
/// Used for parsing YAML frontmatter in custom slash commands
#[tauri::command]
pub fn read_file_head(path: String, lines: usize) -> Result<String, String> {
    use std::io::{BufRead, BufReader};

    let file = fs::File::open(&path)
        .map_err(|e| format!("Failed to open file: {}", e))?;

    let reader = BufReader::new(file);
    let content: Vec<String> = reader
        .lines()
        .take(lines)
        .filter_map(|l| l.ok())
        .collect();

    Ok(content.join("\n"))
}

/// Save base64 image data to a temp file for Codex CLI -i flag
/// Returns the path to the temp file
#[tauri::command]
pub async fn save_temp_image(base64_data: String, media_type: String) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    use std::io::Write;

    // Determine extension from media type
    let ext = match media_type.as_str() {
        "image/png" => "png",
        "image/jpeg" | "image/jpg" => "jpg",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "png", // default
    };

    // Create temp file with unique name
    let temp_dir = std::env::temp_dir();
    let filename = format!("codex-image-{}.{}", uuid::Uuid::new_v4(), ext);
    let path = temp_dir.join(&filename);

    // Decode base64 and write to file
    let bytes = STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    let mut file =
        std::fs::File::create(&path).map_err(|e| format!("Failed to create temp file: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    Ok(path.to_string_lossy().to_string())
}

/// Create a symbolic link from source to target
/// Used for symlinking node_modules in git worktrees
#[tauri::command]
pub async fn create_symlink(source: String, target: String) -> Result<CreateSymlinkResult, String> {
    use std::path::Path;

    let source_path = Path::new(&source);
    let target_path = Path::new(&target);

    // Check if source exists
    if !source_path.exists() {
        return Ok(CreateSymlinkResult {
            success: false,
            error: Some(format!("Source path does not exist: {}", source)),
        });
    }

    // Remove target if it already exists
    if target_path.exists() || target_path.is_symlink() {
        if target_path.is_symlink() {
            std::fs::remove_file(&target_path)
                .map_err(|e| format!("Failed to remove existing symlink: {}", e))?;
        } else if target_path.is_dir() {
            std::fs::remove_dir_all(&target_path)
                .map_err(|e| format!("Failed to remove existing directory: {}", e))?;
        } else {
            std::fs::remove_file(&target_path)
                .map_err(|e| format!("Failed to remove existing file: {}", e))?;
        }
    }

    // Create the symlink
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(&source_path, &target_path)
            .map_err(|e| format!("Failed to create symlink: {}", e))?;
    }

    #[cfg(windows)]
    {
        if source_path.is_dir() {
            std::os::windows::fs::symlink_dir(&source_path, &target_path)
                .map_err(|e| format!("Failed to create directory symlink: {}", e))?;
        } else {
            std::os::windows::fs::symlink_file(&source_path, &target_path)
                .map_err(|e| format!("Failed to create file symlink: {}", e))?;
        }
    }

    Ok(CreateSymlinkResult {
        success: true,
        error: None,
    })
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateSymlinkResult {
    pub success: bool,
    pub error: Option<String>,
}
