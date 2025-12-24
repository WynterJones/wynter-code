use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, State};

use crate::commands::{create_chunk, parse_claude_chunk, PermissionMode};

/// Represents a running Claude CLI process
struct ClaudeProcessInstance {
    child: Child,
    stdin: Option<ChildStdin>,
    #[allow(dead_code)]
    session_id: String,
}

/// Manages multiple Claude CLI processes across sessions
pub struct ClaudeProcessManager {
    instances: Mutex<HashMap<String, ClaudeProcessInstance>>,
}

impl ClaudeProcessManager {
    pub fn new() -> Self {
        Self {
            instances: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for ClaudeProcessManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Start a new Claude CLI process for streaming
#[tauri::command]
pub async fn start_claude_streaming(
    window: tauri::Window,
    state: State<'_, Arc<ClaudeProcessManager>>,
    prompt: String,
    cwd: String,
    session_id: String,
    claude_session_id: Option<String>,
    permission_mode: Option<PermissionMode>,
) -> Result<String, String> {
    // Check if session is already running
    {
        let instances = state.instances.lock().unwrap();
        if instances.contains_key(&session_id) {
            return Err("Session already streaming".to_string());
        }
    }

    let mode = permission_mode.unwrap_or_default();

    let mut args = vec![
        "-p".to_string(),
        prompt,
        "--output-format".to_string(),
        "stream-json".to_string(),
        "--verbose".to_string(),
        "--permission-mode".to_string(),
        mode.as_str().to_string(),
    ];

    // If we have a Claude session ID, resume that conversation
    if let Some(ref claude_sid) = claude_session_id {
        args.push("--resume".to_string());
        args.push(claude_sid.clone());
    }

    let mut child = Command::new("claude")
        .args(&args)
        .current_dir(&cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Claude CLI: {}", e))?;

    let stdout = child
        .stdout
        .take()
        .ok_or("Failed to capture stdout")?;

    let stdin = child.stdin.take();

    // Store the process instance
    {
        let mut instances = state.instances.lock().unwrap();
        instances.insert(
            session_id.clone(),
            ClaudeProcessInstance {
                child,
                stdin,
                session_id: session_id.clone(),
            },
        );
    }

    // Spawn a thread to read stdout and emit events
    let window_clone = window.clone();
    let state_clone = state.inner().clone();
    let session_for_reader = session_id.clone();

    std::thread::spawn(move || {
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

                        // Only emit if we have a valid chunk
                        if let Some(mut chunk) = parse_claude_chunk(&json, &session_for_reader) {
                            // Include the claude session ID in init chunks
                            if chunk.chunk_type == "init" {
                                chunk.claude_session_id = captured_claude_session_id.clone();
                            }
                            let _ = window_clone.emit("claude-stream", &chunk);
                        }
                    }
                }
                Err(e) => {
                    let mut chunk = create_chunk("error", &session_for_reader);
                    chunk.content = Some(format!("Read error: {}", e));
                    let _ = window_clone.emit("claude-stream", &chunk);
                }
                _ => {}
            }
        }

        // Process has ended - send done event
        let mut chunk = create_chunk("done", &session_for_reader);
        chunk.content = Some("exit_code:0".to_string());
        chunk.claude_session_id = captured_claude_session_id;
        let _ = window_clone.emit("claude-stream", &chunk);

        // Clean up the instance
        let mut instances = state_clone.instances.lock().unwrap();
        instances.remove(&session_for_reader);
    });

    Ok(session_id)
}

/// Send input to a running Claude process (for tool approvals, questions, etc.)
#[tauri::command]
pub async fn send_claude_input(
    state: State<'_, Arc<ClaudeProcessManager>>,
    session_id: String,
    input: String,
) -> Result<(), String> {
    let mut instances = state.instances.lock().unwrap();

    if let Some(instance) = instances.get_mut(&session_id) {
        if let Some(ref mut stdin) = instance.stdin {
            stdin
                .write_all(input.as_bytes())
                .map_err(|e| format!("Failed to write to Claude stdin: {}", e))?;
            stdin
                .flush()
                .map_err(|e| format!("Failed to flush Claude stdin: {}", e))?;
            Ok(())
        } else {
            Err("Claude stdin not available".to_string())
        }
    } else {
        Err("Claude session not found".to_string())
    }
}

/// Terminate a running Claude process
#[tauri::command]
pub async fn terminate_claude_session(
    window: tauri::Window,
    state: State<'_, Arc<ClaudeProcessManager>>,
    session_id: String,
) -> Result<(), String> {
    let mut instances = state.instances.lock().unwrap();

    if let Some(mut instance) = instances.remove(&session_id) {
        // Try to kill the process
        let _ = instance.child.kill();

        // Emit a done event to notify the frontend
        let mut chunk = create_chunk("done", &session_id);
        chunk.content = Some("exit_code:-1".to_string()); // -1 indicates termination
        let _ = window.emit("claude-stream", &chunk);

        Ok(())
    } else {
        // Session might have already ended
        Ok(())
    }
}

/// Check if a Claude session is actively running
#[tauri::command]
pub async fn is_claude_session_active(
    state: State<'_, Arc<ClaudeProcessManager>>,
    session_id: String,
) -> Result<bool, String> {
    let instances = state.instances.lock().unwrap();
    Ok(instances.contains_key(&session_id))
}

/// Get list of all active Claude sessions
#[tauri::command]
pub async fn list_active_claude_sessions(
    state: State<'_, Arc<ClaudeProcessManager>>,
) -> Result<Vec<String>, String> {
    let instances = state.instances.lock().unwrap();
    Ok(instances.keys().cloned().collect())
}
