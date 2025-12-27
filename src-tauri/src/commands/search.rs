use ignore::WalkBuilder;
use regex::{Regex, RegexBuilder};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::BufReader;
use std::path::Path;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
    pub context_before: Vec<String>,
    pub context_after: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSearchResult {
    pub file_path: String,
    pub relative_path: String,
    pub file_name: String,
    pub matches: Vec<SearchMatch>,
    pub total_matches: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SearchOptions {
    #[serde(default)]
    pub case_sensitive: bool,
    #[serde(default)]
    pub regex_mode: bool,
    #[serde(default)]
    pub whole_word: bool,
    #[serde(default)]
    pub include_hidden: bool,
    pub file_extensions: Option<Vec<String>>,
    pub exclude_patterns: Option<Vec<String>>,
    pub max_results: Option<usize>,
    pub context_lines: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub files: Vec<FileSearchResult>,
    pub total_files: usize,
    pub total_matches: usize,
    pub truncated: bool,
    pub search_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceResult {
    pub files_modified: usize,
    pub replacements_made: usize,
    pub errors: Vec<String>,
}

const MAX_FILE_SIZE: u64 = 1024 * 1024; // 1MB max file size
const DEFAULT_MAX_RESULTS: usize = 1000;
const DEFAULT_CONTEXT_LINES: usize = 1;

fn is_binary_file(path: &Path) -> bool {
    if let Ok(file) = fs::File::open(path) {
        let mut reader = BufReader::new(file);
        let mut buffer = [0u8; 8192];
        if let Ok(bytes_read) = std::io::Read::read(&mut reader, &mut buffer) {
            // Check for null bytes in first 8KB - indicates binary
            return buffer[..bytes_read].contains(&0);
        }
    }
    false
}

fn build_regex(query: &str, options: &SearchOptions) -> Result<Regex, String> {
    let pattern = if options.regex_mode {
        query.to_string()
    } else {
        // Escape special regex characters for literal search
        let escaped = regex::escape(query);
        if options.whole_word {
            format!(r"\b{}\b", escaped)
        } else {
            escaped
        }
    };

    RegexBuilder::new(&pattern)
        .case_insensitive(!options.case_sensitive)
        .build()
        .map_err(|e| format!("Invalid regex pattern: {}", e))
}

fn search_file(
    file_path: &Path,
    project_path: &Path,
    regex: &Regex,
    context_lines: usize,
) -> Option<FileSearchResult> {
    // Skip binary files
    if is_binary_file(file_path) {
        return None;
    }

    // Read file contents
    let content = match fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return None, // Skip files we can't read
    };

    let lines: Vec<&str> = content.lines().collect();
    let mut matches: Vec<SearchMatch> = Vec::new();

    for (line_idx, line) in lines.iter().enumerate() {
        let line_number = line_idx + 1;

        // Find all matches in this line
        for mat in regex.find_iter(line) {
            // Get context lines
            let context_before: Vec<String> = (line_idx.saturating_sub(context_lines)..line_idx)
                .map(|i| lines[i].to_string())
                .collect();

            let context_after: Vec<String> = ((line_idx + 1)
                ..std::cmp::min(line_idx + 1 + context_lines, lines.len()))
                .map(|i| lines[i].to_string())
                .collect();

            matches.push(SearchMatch {
                line_number,
                line_content: line.to_string(),
                match_start: mat.start(),
                match_end: mat.end(),
                context_before,
                context_after,
            });
        }
    }

    if matches.is_empty() {
        return None;
    }

    let total_matches = matches.len();
    let file_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let relative_path = file_path
        .strip_prefix(project_path)
        .unwrap_or(file_path)
        .to_string_lossy()
        .to_string();

    Some(FileSearchResult {
        file_path: file_path.to_string_lossy().to_string(),
        relative_path,
        file_name,
        matches,
        total_matches,
    })
}

fn should_include_file(path: &Path, options: &SearchOptions) -> bool {
    // Check file extension filter
    if let Some(ref extensions) = options.file_extensions {
        if !extensions.is_empty() {
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase())
                .unwrap_or_default();

            let matches_ext = extensions.iter().any(|allowed| {
                let allowed_lower = allowed.trim_start_matches('.').to_lowercase();
                ext == allowed_lower
            });

            if !matches_ext {
                return false;
            }
        }
    }

    // Check exclude patterns
    if let Some(ref excludes) = options.exclude_patterns {
        let path_str = path.to_string_lossy().to_lowercase();
        for pattern in excludes {
            if path_str.contains(&pattern.to_lowercase()) {
                return false;
            }
        }
    }

    true
}

#[tauri::command]
pub async fn grep_project(
    project_path: String,
    query: String,
    options: Option<SearchOptions>,
) -> Result<SearchResult, String> {
    let start_time = Instant::now();
    let options = options.unwrap_or_default();

    if query.is_empty() {
        return Ok(SearchResult {
            files: Vec::new(),
            total_files: 0,
            total_matches: 0,
            truncated: false,
            search_time_ms: 0,
        });
    }

    let project_path_obj = Path::new(&project_path);
    if !project_path_obj.exists() {
        return Err(format!("Path does not exist: {}", project_path));
    }

    let regex = build_regex(&query, &options)?;
    let max_results = options.max_results.unwrap_or(DEFAULT_MAX_RESULTS);
    let context_lines = options.context_lines.unwrap_or(DEFAULT_CONTEXT_LINES);

    let mut results: Vec<FileSearchResult> = Vec::new();
    let mut total_matches: usize = 0;
    let mut truncated = false;

    // Build walker that respects .gitignore
    let walker = WalkBuilder::new(&project_path)
        .hidden(!options.include_hidden)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .require_git(false)
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

        // Skip files that are too large
        if let Ok(metadata) = path.metadata() {
            if metadata.len() > MAX_FILE_SIZE {
                continue;
            }
        }

        // Skip common build/dependency directories
        let path_str = path.to_string_lossy().to_lowercase();
        if path_str.contains("/node_modules/")
            || path_str.contains("/.git/")
            || path_str.contains("/dist/")
            || path_str.contains("/build/")
            || path_str.contains("/.next/")
            || path_str.contains("/target/")
            || path_str.contains("/.turbo/")
            || path_str.contains("/.cache/")
            || path_str.contains("/coverage/")
        {
            continue;
        }

        // Apply file extension and exclude filters
        if !should_include_file(path, &options) {
            continue;
        }

        // Search the file
        if let Some(file_result) = search_file(path, project_path_obj, &regex, context_lines) {
            total_matches += file_result.total_matches;
            results.push(file_result);

            // Check if we've hit the max results limit
            if total_matches >= max_results {
                truncated = true;
                break;
            }
        }
    }

    // Sort results by file path
    results.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));

    let search_time_ms = start_time.elapsed().as_millis() as u64;
    let total_files = results.len();

    Ok(SearchResult {
        files: results,
        total_files,
        total_matches,
        truncated,
        search_time_ms,
    })
}

#[tauri::command]
pub async fn replace_in_files(
    project_path: String,
    search: String,
    replace: String,
    file_paths: Vec<String>,
    options: Option<SearchOptions>,
) -> Result<ReplaceResult, String> {
    let options = options.unwrap_or_default();
    let regex = build_regex(&search, &options)?;

    let mut files_modified = 0;
    let mut replacements_made = 0;
    let mut errors: Vec<String> = Vec::new();

    for file_path in file_paths {
        let path = Path::new(&file_path);

        // Verify the file is within the project path for security
        if !path.starts_with(&project_path) {
            errors.push(format!("File outside project: {}", file_path));
            continue;
        }

        // Read file content
        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(e) => {
                errors.push(format!("Failed to read {}: {}", file_path, e));
                continue;
            }
        };

        // Count replacements
        let count = regex.find_iter(&content).count();
        if count == 0 {
            continue;
        }

        // Perform replacement
        let new_content = regex.replace_all(&content, replace.as_str()).to_string();

        // Write back
        match fs::write(path, &new_content) {
            Ok(_) => {
                files_modified += 1;
                replacements_made += count;
            }
            Err(e) => {
                errors.push(format!("Failed to write {}: {}", file_path, e));
            }
        }
    }

    Ok(ReplaceResult {
        files_modified,
        replacements_made,
        errors,
    })
}
