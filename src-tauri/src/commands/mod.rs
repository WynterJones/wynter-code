use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::Emitter;
use tauri_plugin_sql::Migration;
use ignore::gitignore::GitignoreBuilder;
use ignore::WalkBuilder;

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

        // Skip hidden files (but not .gitignore-ignored files, we show those dimmed)
        if file_name.starts_with('.') {
            continue;
        }

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
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file_content(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
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
        .hidden(true)           // Skip hidden files/dirs
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
}

#[tauri::command]
pub async fn run_claude(prompt: String, cwd: String) -> Result<CommandOutput, String> {
    let output = Command::new("claude")
        .args(["-p", &prompt, "--output-format", "json"])
        .current_dir(&cwd)
        .output()
        .map_err(|e| format!("Failed to execute Claude CLI: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        code: output.status.code().unwrap_or(-1),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PermissionMode {
    #[serde(rename = "default")]
    Default,
    #[serde(rename = "plan")]
    Plan,
    #[serde(rename = "acceptEdits")]
    AcceptEdits,
    #[serde(rename = "bypassPermissions")]
    BypassPermissions,
}

impl Default for PermissionMode {
    fn default() -> Self {
        PermissionMode::Default
    }
}

impl PermissionMode {
    fn as_str(&self) -> &'static str {
        match self {
            PermissionMode::Default => "default",
            PermissionMode::Plan => "plan",
            PermissionMode::AcceptEdits => "acceptEdits",
            PermissionMode::BypassPermissions => "bypassPermissions",
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
                        let _ = window.emit("claude-stream", &chunk);
                    }
                }
                // Skip raw text output - only use parsed JSON
            }
            Err(e) => {
                let mut chunk = create_chunk("error", &session_id);
                chunk.content = Some(format!("Read error: {}", e));
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
    let _ = window.emit("claude-stream", &chunk);

    // Return the claude session ID for future resumption
    Ok(captured_claude_session_id.unwrap_or_default())
}

fn create_chunk(chunk_type: &str, session_id: &str) -> StreamChunk {
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
    }
}

fn parse_claude_chunk(json: &serde_json::Value, session_id: &str) -> Option<StreamChunk> {
    let msg_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");
    let subtype = json.get("subtype").and_then(|v| v.as_str()).unwrap_or("");

    // Handle init message with model/session info
    if subtype == "init" || (msg_type.is_empty() && json.get("model").is_some()) {
        let mut chunk = create_chunk("init", session_id);
        chunk.model = json.get("model").and_then(|v| v.as_str()).map(|s| s.to_string());
        chunk.content = json.get("cwd").and_then(|v| v.as_str()).map(|s| s.to_string());
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
                    _ => {}
                }
            }
            None
        }

        // Handle content block start (for tool use and thinking)
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

        // Handle tool result
        "tool_result" => {
            let mut chunk = create_chunk("tool_result", session_id);
            chunk.tool_id = json.get("tool_use_id").and_then(|v| v.as_str()).map(|s| s.to_string());
            chunk.content = json.get("content").and_then(|v| v.as_str()).map(|s| s.to_string());
            Some(chunk)
        }

        // Handle assistant message
        "assistant" => {
            if let Some(message) = json.get("message") {
                if let Some(content) = message.get("content").and_then(|c| c.as_array()) {
                    for block in content {
                        if let Some(block_type) = block.get("type").and_then(|t| t.as_str()) {
                            match block_type {
                                "text" => {
                                    let mut chunk = create_chunk("text", session_id);
                                    chunk.content = block.get("text").and_then(|t| t.as_str()).map(|s| s.to_string());
                                    return Some(chunk);
                                }
                                "tool_use" => {
                                    let mut chunk = create_chunk("tool_use", session_id);
                                    chunk.tool_name = block.get("name").and_then(|n| n.as_str()).map(|s| s.to_string());
                                    chunk.tool_id = block.get("id").and_then(|n| n.as_str()).map(|s| s.to_string());
                                    chunk.tool_input = block.get("input").map(|i| i.to_string());
                                    return Some(chunk);
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
            None
        }

        // Handle result message
        "result" => {
            let mut chunk = create_chunk("result", session_id);
            chunk.content = json.get("result").and_then(|r| r.as_str()).map(|s| s.to_string());

            // Extract cost info if present
            if let Some(cost) = json.get("cost_usd").and_then(|v| v.as_f64()) {
                chunk.cost_usd = Some(cost);
            }
            if let Some(duration) = json.get("duration_ms").and_then(|v| v.as_u64()) {
                chunk.duration_ms = Some(duration);
            }
            if let Some(usage) = json.get("usage") {
                chunk.input_tokens = usage.get("input_tokens").and_then(|v| v.as_u64());
                chunk.output_tokens = usage.get("output_tokens").and_then(|v| v.as_u64());
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

        _ => None
    }
}

#[tauri::command]
pub async fn run_git(args: Vec<String>, cwd: String) -> Result<CommandOutput, String> {
    let output = Command::new("git")
        .args(&args)
        .current_dir(&cwd)
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

    // Calculate node_modules size separately
    let node_modules_path = project_path_obj.join("node_modules");
    if node_modules_path.exists() {
        stats.node_modules_size = calculate_dir_size(&node_modules_path);
    }

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

            // Skip hidden files/folders
            if file_name.starts_with('.') {
                continue;
            }

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

    walk_dir(project_path_obj, &mut stats, &code_extensions, &skip_dirs);

    Ok(stats)
}

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    path TEXT NOT NULL UNIQUE,
                    is_favorite INTEGER DEFAULT 0,
                    last_opened_at TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    name TEXT,
                    model TEXT DEFAULT 'claude-sonnet-4-20250514',
                    claude_session_id TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    tool_calls TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_subscription_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS subscription_groups (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    color TEXT,
                    sort_order INTEGER DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS subscriptions (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    url TEXT,
                    favicon_url TEXT,
                    monthly_cost REAL NOT NULL DEFAULT 0,
                    billing_cycle TEXT DEFAULT 'monthly',
                    currency TEXT DEFAULT 'USD',
                    group_id TEXT,
                    notes TEXT,
                    is_active INTEGER DEFAULT 1,
                    sort_order INTEGER DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (group_id) REFERENCES subscription_groups(id) ON DELETE SET NULL
                );

                CREATE INDEX IF NOT EXISTS idx_subscriptions_group_id ON subscriptions(group_id);
                CREATE INDEX IF NOT EXISTS idx_subscriptions_is_active ON subscriptions(is_active);
            "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ]
}
