use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

use crate::path_utils::get_enhanced_path;

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
    let output = Command::new("bd")
        .args(args)
        .current_dir(project_path)
        .env("PATH", get_enhanced_path())
        .output()
        .map_err(|e| format!("Failed to run bd command: {}", e))?;

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
    let priority_str = priority.to_string();
    let mut args = vec![
        "create",
        &title,
        "-t",
        &issue_type,
        "-p",
        &priority_str,
    ];

    let desc_owned;
    if let Some(ref d) = description {
        if !d.trim().is_empty() {
            desc_owned = d.clone();
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
    let mut args = vec!["update", &id];

    let title_owned;
    let status_owned;
    let priority_owned;
    let assignee_owned;

    if let Some(ref t) = updates.title {
        title_owned = t.clone();
        args.push("--title");
        args.push(&title_owned);
    }

    if let Some(ref s) = updates.status {
        status_owned = s.clone();
        args.push("--status");
        args.push(&status_owned);
    }

    if let Some(p) = updates.priority {
        priority_owned = p.to_string();
        args.push("-p");
        args.push(&priority_owned);
    }

    if let Some(ref a) = updates.assignee {
        assignee_owned = a.clone();
        args.push("--assignee");
        args.push(&assignee_owned);
    }

    run_bd_command(&project_path, &args)?;
    Ok(())
}

#[tauri::command]
pub async fn beads_close(project_path: String, id: String, reason: String) -> Result<(), String> {
    let args = vec!["close", &id, "--reason", &reason];
    run_bd_command(&project_path, &args)?;
    Ok(())
}

#[tauri::command]
pub async fn beads_reopen(project_path: String, id: String) -> Result<(), String> {
    let args = vec!["reopen", &id];
    run_bd_command(&project_path, &args)?;
    Ok(())
}

#[tauri::command]
pub async fn beads_show(project_path: String, id: String) -> Result<BeadsIssue, String> {
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
