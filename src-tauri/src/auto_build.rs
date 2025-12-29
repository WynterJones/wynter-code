use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

use crate::path_utils::get_enhanced_path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutoBuildSession {
    pub session_id: String,
    pub status: String,
    pub queue: Vec<String>,
    pub completed: Vec<String>,
    pub human_review: Vec<String>,  // IDs awaiting human review
    pub current_issue_id: Option<String>,
    pub current_phase: Option<String>,
    pub retry_count: u8,
    pub started_at: String,
    pub last_activity_at: String,
    pub settings: AutoBuildSettings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutoBuildSettings {
    pub auto_commit: bool,
    pub run_lint: bool,
    pub run_tests: bool,
    pub run_build: bool,
    pub max_retries: u8,
    pub priority_threshold: u8,
    pub require_human_review: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AutoBuildResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerificationResult {
    pub success: bool,
    pub lint: CommandResult,
    pub tests: CommandResult,
    pub build: CommandResult,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub success: bool,
    pub output: String,
}

fn get_session_path(project_path: &str) -> std::path::PathBuf {
    Path::new(project_path)
        .join(".beads")
        .join(".autobuild-session.json")
}

fn get_silo_path(project_path: &str) -> std::path::PathBuf {
    Path::new(project_path).join("_SILO")
}

fn get_silo_file_path(project_path: &str, issue_id: &str) -> std::path::PathBuf {
    get_silo_path(project_path).join(format!("{}.md", issue_id))
}

#[tauri::command]
pub async fn auto_build_save_session(
    project_path: String,
    session: AutoBuildSession,
) -> Result<(), String> {
    let session_path = get_session_path(&project_path);

    // Ensure .beads directory exists
    if let Some(parent) = session_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let json = serde_json::to_string_pretty(&session)
        .map_err(|e| format!("Failed to serialize session: {}", e))?;

    fs::write(&session_path, json)
        .map_err(|e| format!("Failed to write session file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn auto_build_load_session(project_path: String) -> Result<Option<AutoBuildSession>, String> {
    let session_path = get_session_path(&project_path);

    if !session_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&session_path)
        .map_err(|e| format!("Failed to read session file: {}", e))?;

    let session: AutoBuildSession = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse session file: {}", e))?;

    Ok(Some(session))
}

#[tauri::command]
pub async fn auto_build_clear_session(project_path: String) -> Result<(), String> {
    let session_path = get_session_path(&project_path);

    if session_path.exists() {
        fs::remove_file(&session_path)
            .map_err(|e| format!("Failed to remove session file: {}", e))?;
    }

    Ok(())
}

// SILO progress file management
#[tauri::command]
pub async fn auto_build_read_silo(
    project_path: String,
    issue_id: String,
) -> Result<Option<String>, String> {
    let silo_path = get_silo_file_path(&project_path, &issue_id);

    if silo_path.exists() {
        fs::read_to_string(&silo_path)
            .map(Some)
            .map_err(|e| format!("Failed to read SILO file: {}", e))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn auto_build_write_silo(
    project_path: String,
    issue_id: String,
    content: String,
) -> Result<(), String> {
    let silo_dir = get_silo_path(&project_path);

    // Ensure _SILO directory exists
    fs::create_dir_all(&silo_dir)
        .map_err(|e| format!("Failed to create _SILO directory: {}", e))?;

    let file_path = get_silo_file_path(&project_path, &issue_id);
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write SILO file: {}", e))
}

#[tauri::command]
pub async fn auto_build_run_claude(
    project_path: String,
    issue_id: String,
    issue_title: String,
    issue_description: String,
    issue_type: String,
) -> Result<AutoBuildResult, String> {
    // Build the prompt for Claude
    let prompt = format!(
        r#"You are working on a beads issue in this project.

Issue ID: {}
Type: {}
Title: {}
Description: {}

Please:
1. Understand what needs to be done
2. Implement the changes
3. Keep code mergeable at all times
4. Do NOT commit - I will handle that

When done, your last message should confirm what was completed."#,
        issue_id, issue_type, issue_title,
        if issue_description.is_empty() { "No description provided" } else { &issue_description }
    );

    // Run claude CLI with explicit default permission mode to avoid plan mode
    let output = Command::new("claude")
        .arg("-p")
        .arg(&prompt)
        .arg("--allowedTools")
        .arg("Edit,Write,Bash,Read,Glob,Grep")
        .arg("--permission-mode")
        .arg("default")
        .current_dir(&project_path)
        .env("PATH", get_enhanced_path())
        .output()
        .map_err(|e| format!("Failed to run claude: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(AutoBuildResult {
            success: true,
            output: stdout,
            error: None,
        })
    } else {
        Ok(AutoBuildResult {
            success: false,
            output: stdout,
            error: Some(if stderr.is_empty() { "Unknown error".to_string() } else { stderr }),
        })
    }
}

#[tauri::command]
pub async fn auto_build_run_verification(
    project_path: String,
    run_lint: bool,
    run_tests: bool,
    run_build: bool,
) -> Result<VerificationResult, String> {
    let mut result = VerificationResult {
        success: true,
        lint: CommandResult { success: true, output: String::new() },
        tests: CommandResult { success: true, output: String::new() },
        build: CommandResult { success: true, output: String::new() },
    };

    // Run lint
    if run_lint {
        let lint_output = Command::new("npm")
            .args(["run", "lint"])
            .current_dir(&project_path)
            .env("PATH", get_enhanced_path())
            .output()
            .map_err(|e| format!("Failed to run lint: {}", e))?;

        result.lint = CommandResult {
            success: lint_output.status.success(),
            output: String::from_utf8_lossy(&lint_output.stdout).to_string()
                + &String::from_utf8_lossy(&lint_output.stderr),
        };

        if !result.lint.success {
            result.success = false;
        }
    }

    // Run tests
    if run_tests {
        let test_output = Command::new("npm")
            .args(["run", "test"])
            .current_dir(&project_path)
            .env("PATH", get_enhanced_path())
            .output()
            .map_err(|e| format!("Failed to run tests: {}", e))?;

        result.tests = CommandResult {
            success: test_output.status.success(),
            output: String::from_utf8_lossy(&test_output.stdout).to_string()
                + &String::from_utf8_lossy(&test_output.stderr),
        };

        if !result.tests.success {
            result.success = false;
        }
    }

    // Run build
    if run_build {
        let build_output = Command::new("npm")
            .args(["run", "build"])
            .current_dir(&project_path)
            .env("PATH", get_enhanced_path())
            .output()
            .map_err(|e| format!("Failed to run build: {}", e))?;

        result.build = CommandResult {
            success: build_output.status.success(),
            output: String::from_utf8_lossy(&build_output.stdout).to_string()
                + &String::from_utf8_lossy(&build_output.stderr),
        };

        if !result.build.success {
            result.success = false;
        }
    }

    Ok(result)
}

#[tauri::command]
pub async fn auto_build_commit(
    project_path: String,
    message: String,
    issue_id: String,
) -> Result<(), String> {
    // Stage all changes
    let add_output = Command::new("git")
        .args(["add", "-A"])
        .current_dir(&project_path)
        .env("PATH", get_enhanced_path())
        .output()
        .map_err(|e| format!("Failed to stage changes: {}", e))?;

    if !add_output.status.success() {
        return Err(format!(
            "Failed to stage changes: {}",
            String::from_utf8_lossy(&add_output.stderr)
        ));
    }

    // Create commit message with footer
    let full_message = format!(
        "{}\n\nIssue: {}\n\nGenerated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>",
        message, issue_id
    );

    // Commit
    let commit_output = Command::new("git")
        .args(["commit", "-m", &full_message])
        .current_dir(&project_path)
        .env("PATH", get_enhanced_path())
        .output()
        .map_err(|e| format!("Failed to commit: {}", e))?;

    if !commit_output.status.success() {
        let stderr = String::from_utf8_lossy(&commit_output.stderr);
        // "nothing to commit" is not an error
        if !stderr.contains("nothing to commit") {
            return Err(format!("Failed to commit: {}", stderr));
        }
    }

    Ok(())
}

// File-based audit results from _AUDIT/*.md files
#[derive(Debug, Serialize, Deserialize)]
pub struct AuditFileResults {
    pub success: bool,
    pub security: Option<String>,
    pub performance: Option<String>,
    pub code_quality: Option<String>,
    pub accessibility: Option<String>,
    pub has_issues: bool,
}

#[tauri::command]
pub async fn auto_build_read_audit_files(project_path: String) -> Result<AuditFileResults, String> {
    let audit_dir = Path::new(&project_path).join("_AUDIT");

    let read_file = |name: &str| -> Option<String> {
        let path = audit_dir.join(name);
        fs::read_to_string(&path).ok()
    };

    let security = read_file("SECURITY.md");
    let performance = read_file("PERFORMANCE.md");
    let code_quality = read_file("CODE_QUALITY.md");
    let accessibility = read_file("ACCESSIBILITY.md");

    // Check if any file contains issues (look for markers like "FAIL", "Issue", severity indicators)
    let has_issues = [&security, &performance, &code_quality, &accessibility]
        .iter()
        .any(|content| {
            content.as_ref().map_or(false, |c| {
                c.contains("## Issues") ||
                c.contains("### Critical") ||
                c.contains("### High") ||
                c.contains("### Medium") ||
                c.contains("FAIL") ||
                c.contains("❌")
            })
        });

    Ok(AuditFileResults {
        success: true,
        security,
        performance,
        code_quality,
        accessibility,
        has_issues,
    })
}
