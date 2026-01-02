use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

use crate::path_utils::get_enhanced_path;

lazy_static! {
    /// Compiled regex for validating issue IDs - alphanumeric with hyphens and dots
    static ref ISSUE_ID_REGEX: Regex = Regex::new(r"^[a-zA-Z0-9][a-zA-Z0-9\-\.]*$")
        .expect("invalid issue ID regex pattern");
}

/// Validate a beads issue ID to prevent command injection
/// Format: alphanumeric with optional hyphens and dots (e.g., "project-123", "project-123.1")
fn validate_issue_id(id: &str) -> Result<(), String> {
    if id.is_empty() || id.len() > 100 {
        return Err("Invalid issue ID: must be 1-100 characters".to_string());
    }

    if !ISSUE_ID_REGEX.is_match(id) {
        return Err("Invalid issue ID: contains invalid characters".to_string());
    }

    // No shell metacharacters
    let forbidden_chars = [
        '|', '&', ';', '$', '`', '(', ')', '{', '}', '[', ']', '<', '>', '!', '\\', '"', '\'',
        '\n', '\r', '\t', ' ',
    ];
    if id.chars().any(|c| forbidden_chars.contains(&c)) {
        return Err("Invalid issue ID: contains forbidden characters".to_string());
    }

    Ok(())
}

/// Validate issue status against allowlist
fn validate_status(status: &str) -> Result<(), String> {
    const ALLOWED_STATUSES: &[&str] = &["open", "in_progress", "blocked", "closed", "deferred"];
    if !ALLOWED_STATUSES.contains(&status) {
        return Err(format!(
            "Invalid status: {}. Allowed: {:?}",
            status, ALLOWED_STATUSES
        ));
    }
    Ok(())
}

/// Validate issue type against allowlist
fn validate_issue_type(issue_type: &str) -> Result<(), String> {
    const ALLOWED_TYPES: &[&str] = &[
        "bug",
        "feature",
        "task",
        "epic",
        "chore",
        "merge-request",
        "molecule",
    ];
    if !ALLOWED_TYPES.contains(&issue_type) {
        return Err(format!(
            "Invalid issue type: {}. Allowed: {:?}",
            issue_type, ALLOWED_TYPES
        ));
    }
    Ok(())
}

/// Validate priority (0-4)
fn validate_priority(priority: u8) -> Result<(), String> {
    if priority > 4 {
        return Err("Invalid priority: must be 0-4".to_string());
    }
    Ok(())
}

/// Sanitize text input (title, description, reason) to prevent injection
/// Removes shell metacharacters that could be dangerous when passed to CLI
fn sanitize_text(text: &str) -> String {
    // Replace dangerous characters with safe alternatives
    text.chars()
        .map(|c| match c {
            '`' | '$' => ' ', // Could enable command substitution
            '\n' | '\r' => ' ', // Newlines could break CLI parsing
            _ => c,
        })
        .collect()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BeadsDependency {
    pub issue_id: String,
    pub depends_on_id: String,
    #[serde(rename = "type")]
    pub dep_type: String,
    pub created_at: String,
    pub created_by: String,
    #[serde(default)]
    pub metadata: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BeadsIssue {
    pub id: String,
    pub title: String,
    pub status: String,
    pub priority: u8,
    pub issue_type: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub closed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub close_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assignee: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub labels: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dependencies: Option<Vec<BeadsDependency>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phase: Option<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BeadsStats {
    pub total: u32,
    pub open: u32,
    pub in_progress: u32,
    pub blocked: u32,
    pub closed: u32,
    pub ready: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BeadsUpdate {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assignee: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phase: Option<u8>,
}

fn run_bd_command(project_path: &str, args: &[&str]) -> Result<String, String> {
    // Check if beads is initialized first
    let beads_path = Path::new(project_path).join(".beads");
    if !beads_path.exists() {
        return Err("beads_not_installed: Issue tracking is not set up for this project. Run 'bd init' to initialize.".to_string());
    }

    let output = Command::new("bd")
        .args(args)
        .current_dir(project_path)
        .env("PATH", get_enhanced_path())
        .output()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                "beads_not_installed: The 'bd' command is not installed. Please install beads CLI.".to_string()
            } else {
                format!("Failed to run bd command: {}", e)
            }
        })?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.is_empty() {
            Ok(String::new())
        } else {
            Err(stderr.to_string())
        }
    }
}

#[tauri::command]
pub async fn beads_has_init(project_path: String) -> Result<bool, String> {
    let beads_path = Path::new(&project_path).join(".beads");
    Ok(beads_path.exists() && beads_path.is_dir())
}

#[tauri::command]
pub async fn beads_list(project_path: String) -> Result<Vec<BeadsIssue>, String> {
    let output = run_bd_command(&project_path, &["export"])?;

    let mut issues: Vec<BeadsIssue> = Vec::new();
    for line in output.lines() {
        if line.trim().is_empty() {
            continue;
        }
        match serde_json::from_str::<BeadsIssue>(line) {
            Ok(issue) => issues.push(issue),
            Err(e) => {
                eprintln!("Failed to parse issue: {} - Line: {}", e, line);
            }
        }
    }

    Ok(issues)
}

#[tauri::command]
pub async fn beads_stats(project_path: String) -> Result<BeadsStats, String> {
    let issues = beads_list(project_path).await?;

    let mut stats = BeadsStats {
        total: issues.len() as u32,
        open: 0,
        in_progress: 0,
        blocked: 0,
        closed: 0,
        ready: 0,
    };

    for issue in &issues {
        match issue.status.as_str() {
            "open" => stats.open += 1,
            "in_progress" => stats.in_progress += 1,
            "blocked" => stats.blocked += 1,
            "closed" => stats.closed += 1,
            _ => {}
        }
    }

    // Ready = open issues with no blockers
    stats.ready = stats.open;

    Ok(stats)
}

#[tauri::command]
pub async fn beads_create(
    project_path: String,
    title: String,
    issue_type: String,
    priority: u8,
    description: Option<String>,
) -> Result<String, String> {
    // Validate inputs
    validate_issue_type(&issue_type)?;
    validate_priority(priority)?;

    // Sanitize text inputs
    let safe_title = sanitize_text(&title);
    let priority_str = priority.to_string();
    let mut args = vec!["create", &safe_title, "-t", &issue_type, "-p", &priority_str];

    let desc_owned;
    if let Some(ref d) = description {
        if !d.trim().is_empty() {
            desc_owned = sanitize_text(d);
            args.push("-d");
            args.push(&desc_owned);
        }
    }

    let output = run_bd_command(&project_path, &args)?;

    // bd create outputs the created issue ID
    let id = output.trim().to_string();
    if id.is_empty() {
        return Err("No issue ID returned".to_string());
    }

    Ok(id)
}

#[tauri::command]
pub async fn beads_update(
    project_path: String,
    id: String,
    updates: BeadsUpdate,
) -> Result<(), String> {
    // Validate issue ID
    validate_issue_id(&id)?;

    let mut args = vec!["update", &id];

    let title_owned;
    let status_owned;
    let priority_owned;
    let assignee_owned;

    if let Some(ref t) = updates.title {
        title_owned = sanitize_text(t);
        args.push("--title");
        args.push(&title_owned);
    }

    if let Some(ref s) = updates.status {
        validate_status(s)?;
        status_owned = s.clone();
        args.push("--status");
        args.push(&status_owned);
    }

    if let Some(p) = updates.priority {
        validate_priority(p)?;
        priority_owned = p.to_string();
        args.push("-p");
        args.push(&priority_owned);
    }

    if let Some(ref a) = updates.assignee {
        // Sanitize assignee (could be a username)
        assignee_owned = sanitize_text(a);
        args.push("--assignee");
        args.push(&assignee_owned);
    }

    run_bd_command(&project_path, &args)?;
    Ok(())
}

#[tauri::command]
pub async fn beads_close(project_path: String, id: String, reason: String) -> Result<(), String> {
    validate_issue_id(&id)?;
    let safe_reason = sanitize_text(&reason);
    let args = vec!["close", &id, "--reason", &safe_reason];
    run_bd_command(&project_path, &args)?;
    Ok(())
}

#[tauri::command]
pub async fn beads_reopen(project_path: String, id: String) -> Result<(), String> {
    validate_issue_id(&id)?;
    let args = vec!["reopen", &id];
    run_bd_command(&project_path, &args)?;
    Ok(())
}

#[tauri::command]
pub async fn beads_show(project_path: String, id: String) -> Result<BeadsIssue, String> {
    validate_issue_id(&id)?;
    // Export all and find the specific issue
    let issues = beads_list(project_path).await?;
    issues
        .into_iter()
        .find(|i| i.id == id)
        .ok_or_else(|| format!("Issue {} not found", id))
}

#[tauri::command]
pub async fn beads_update_phase(
    project_path: String,
    id: String,
    phase: Option<u8>,
) -> Result<(), String> {
    validate_issue_id(&id)?;
    // Validate phase if provided (0-10 is reasonable for planning phases)
    if let Some(p) = phase {
        if p > 10 {
            return Err("Invalid phase: must be 0-10".to_string());
        }
    }

    use std::fs;
    use std::io::{BufRead, BufReader, Write};

    let issues_path = Path::new(&project_path).join(".beads").join("issues.jsonl");
    if !issues_path.exists() {
        return Err("Issues file not found".to_string());
    }

    // Read all issues
    let file = fs::File::open(&issues_path)
        .map_err(|e| format!("Failed to open issues file: {}", e))?;
    let reader = BufReader::new(file);

    let mut updated_lines: Vec<String> = Vec::new();
    let mut found = false;

    for line in reader.lines() {
        let line = line.map_err(|e| format!("Failed to read line: {}", e))?;
        if line.trim().is_empty() {
            updated_lines.push(line);
            continue;
        }

        match serde_json::from_str::<serde_json::Value>(&line) {
            Ok(mut issue) => {
                if issue.get("id").and_then(|v| v.as_str()) == Some(&id) {
                    found = true;
                    if let Some(p) = phase {
                        issue["phase"] = serde_json::json!(p);
                    } else {
                        if let Some(obj) = issue.as_object_mut() {
                            obj.remove("phase");
                        }
                    }
                    updated_lines.push(serde_json::to_string(&issue).unwrap());
                } else {
                    updated_lines.push(line);
                }
            }
            Err(_) => {
                updated_lines.push(line);
            }
        }
    }

    if !found {
        return Err(format!("Issue {} not found", id));
    }

    // Write back
    let mut file = fs::File::create(&issues_path)
        .map_err(|e| format!("Failed to create issues file: {}", e))?;
    for line in updated_lines {
        writeln!(file, "{}", line).map_err(|e| format!("Failed to write line: {}", e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // validate_issue_id tests
    #[test]
    fn test_validate_issue_id_valid_simple() {
        assert!(validate_issue_id("project-123").is_ok());
    }

    #[test]
    fn test_validate_issue_id_valid_with_dot() {
        assert!(validate_issue_id("project-123.1").is_ok());
    }

    #[test]
    fn test_validate_issue_id_valid_alphanumeric() {
        assert!(validate_issue_id("abc123").is_ok());
    }

    #[test]
    fn test_validate_issue_id_empty() {
        assert!(validate_issue_id("").is_err());
    }

    #[test]
    fn test_validate_issue_id_too_long() {
        let long_id = "a".repeat(101);
        assert!(validate_issue_id(&long_id).is_err());
    }

    #[test]
    fn test_validate_issue_id_max_length() {
        let max_id = "a".repeat(100);
        assert!(validate_issue_id(&max_id).is_ok());
    }

    #[test]
    fn test_validate_issue_id_shell_metachar_pipe() {
        assert!(validate_issue_id("test|rm").is_err());
    }

    #[test]
    fn test_validate_issue_id_shell_metachar_ampersand() {
        assert!(validate_issue_id("test&cmd").is_err());
    }

    #[test]
    fn test_validate_issue_id_shell_metachar_semicolon() {
        assert!(validate_issue_id("test;rm").is_err());
    }

    #[test]
    fn test_validate_issue_id_shell_metachar_dollar() {
        assert!(validate_issue_id("test$VAR").is_err());
    }

    #[test]
    fn test_validate_issue_id_shell_metachar_backtick() {
        assert!(validate_issue_id("test`cmd`").is_err());
    }

    #[test]
    fn test_validate_issue_id_space() {
        assert!(validate_issue_id("test id").is_err());
    }

    #[test]
    fn test_validate_issue_id_newline() {
        assert!(validate_issue_id("test\nid").is_err());
    }

    // validate_status tests
    #[test]
    fn test_validate_status_open() {
        assert!(validate_status("open").is_ok());
    }

    #[test]
    fn test_validate_status_in_progress() {
        assert!(validate_status("in_progress").is_ok());
    }

    #[test]
    fn test_validate_status_blocked() {
        assert!(validate_status("blocked").is_ok());
    }

    #[test]
    fn test_validate_status_closed() {
        assert!(validate_status("closed").is_ok());
    }

    #[test]
    fn test_validate_status_deferred() {
        assert!(validate_status("deferred").is_ok());
    }

    #[test]
    fn test_validate_status_invalid() {
        assert!(validate_status("invalid").is_err());
    }

    #[test]
    fn test_validate_status_empty() {
        assert!(validate_status("").is_err());
    }

    #[test]
    fn test_validate_status_case_sensitive() {
        assert!(validate_status("Open").is_err());
        assert!(validate_status("CLOSED").is_err());
    }

    // validate_issue_type tests
    #[test]
    fn test_validate_issue_type_bug() {
        assert!(validate_issue_type("bug").is_ok());
    }

    #[test]
    fn test_validate_issue_type_feature() {
        assert!(validate_issue_type("feature").is_ok());
    }

    #[test]
    fn test_validate_issue_type_task() {
        assert!(validate_issue_type("task").is_ok());
    }

    #[test]
    fn test_validate_issue_type_epic() {
        assert!(validate_issue_type("epic").is_ok());
    }

    #[test]
    fn test_validate_issue_type_chore() {
        assert!(validate_issue_type("chore").is_ok());
    }

    #[test]
    fn test_validate_issue_type_merge_request() {
        assert!(validate_issue_type("merge-request").is_ok());
    }

    #[test]
    fn test_validate_issue_type_molecule() {
        assert!(validate_issue_type("molecule").is_ok());
    }

    #[test]
    fn test_validate_issue_type_invalid() {
        assert!(validate_issue_type("invalid").is_err());
    }

    #[test]
    fn test_validate_issue_type_empty() {
        assert!(validate_issue_type("").is_err());
    }

    // validate_priority tests
    #[test]
    fn test_validate_priority_zero() {
        assert!(validate_priority(0).is_ok());
    }

    #[test]
    fn test_validate_priority_max() {
        assert!(validate_priority(4).is_ok());
    }

    #[test]
    fn test_validate_priority_mid() {
        assert!(validate_priority(2).is_ok());
    }

    #[test]
    fn test_validate_priority_over_max() {
        assert!(validate_priority(5).is_err());
    }

    #[test]
    fn test_validate_priority_way_over() {
        assert!(validate_priority(255).is_err());
    }

    // sanitize_text tests
    #[test]
    fn test_sanitize_text_clean() {
        assert_eq!(sanitize_text("Hello World"), "Hello World");
    }

    #[test]
    fn test_sanitize_text_backtick() {
        assert_eq!(sanitize_text("test`cmd`"), "test cmd ");
    }

    #[test]
    fn test_sanitize_text_dollar() {
        assert_eq!(sanitize_text("test$VAR"), "test VAR");
    }

    #[test]
    fn test_sanitize_text_newline() {
        assert_eq!(sanitize_text("line1\nline2"), "line1 line2");
    }

    #[test]
    fn test_sanitize_text_carriage_return() {
        assert_eq!(sanitize_text("line1\rline2"), "line1 line2");
    }

    #[test]
    fn test_sanitize_text_preserves_safe_chars() {
        assert_eq!(
            sanitize_text("Title: My Issue (v1.0) - Fixed!"),
            "Title: My Issue (v1.0) - Fixed!"
        );
    }

    #[test]
    fn test_sanitize_text_empty() {
        assert_eq!(sanitize_text(""), "");
    }
}
