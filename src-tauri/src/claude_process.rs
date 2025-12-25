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

/// Start a persistent Claude CLI session (interactive mode, no -p flag)
/// User sends prompts via send_claude_input, receives responses via events
#[tauri::command]
pub async fn start_claude_session(
    window: tauri::Window,
    state: State<'_, Arc<ClaudeProcessManager>>,
    cwd: String,
    session_id: String,
    permission_mode: Option<PermissionMode>,
    resume_session_id: Option<String>,
) -> Result<String, String> {
    // Check if session is already running
    {
        let instances = state.instances.lock().unwrap();
        if instances.contains_key(&session_id) {
            return Err("Session already running".to_string());
        }
    }

    let mode = permission_mode.unwrap_or_default();

    // Build args for INTERACTIVE mode (no -p flag)
    let mut args = vec![
        "--output-format".to_string(),
        "stream-json".to_string(),
        "--verbose".to_string(),
        "--permission-mode".to_string(),
        mode.as_str().to_string(),
    ];

    // If we have a Claude session ID to resume, add it
    if let Some(ref claude_sid) = resume_session_id {
        args.push("--resume".to_string());
        args.push(claude_sid.clone());
    }

    // Build enhanced environment for Claude CLI
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users".to_string());
    let current_path = std::env::var("PATH").unwrap_or_default();

    let enhanced_path = format!(
        "{}/.local/bin:/usr/local/bin:/opt/homebrew/bin:{}/.nvm/versions/node/v22.11.0/bin:{}/.nvm/versions/node/v20.18.0/bin:{}/.nvm/versions/node/v18.20.0/bin:{}",
        home, home, home, home, current_path
    );

    eprintln!("[Claude] Starting persistent session with args: {:?}", args);
    eprintln!("[Claude] Working directory: {}", cwd);

    let mut child = Command::new("claude")
        .args(&args)
        .current_dir(&cwd)
        .env("HOME", &home)
        .env("PATH", &enhanced_path)
        .env("TERM", "xterm-256color")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Claude CLI: {} (PATH={})", e, enhanced_path))?;

    let stdout = child
        .stdout
        .take()
        .ok_or("Failed to capture stdout")?;

    let stderr = child
        .stderr
        .take()
        .ok_or("Failed to capture stderr")?;

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

    // Emit a "session_starting" event
    {
        let mut chunk = create_chunk("session_starting", &session_id);
        chunk.content = Some(format!("Starting Claude session in {}", cwd));
        let _ = window.emit("claude-stream", &chunk);
    }

    // Spawn stderr reader thread
    let window_for_stderr = window.clone();
    let session_for_stderr = session_id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                eprintln!("[Claude STDERR] {}", line);
                if !line.is_empty() {
                    let mut chunk = create_chunk("stderr", &session_for_stderr);
                    chunk.content = Some(line);
                    let _ = window_for_stderr.emit("claude-stream", &chunk);
                }
            }
        }
    });

    // Spawn stdout reader thread
    let window_clone = window.clone();
    let state_clone = state.inner().clone();
    let session_for_reader = session_id.clone();

    std::thread::spawn(move || {
        eprintln!("[Claude] Stdout reader thread started for session: {}", session_for_reader);
        let reader = BufReader::new(stdout);
        let mut captured_claude_session_id: Option<String> = resume_session_id.clone();
        let mut line_count = 0;
        let mut session_ready = false;

        for line in reader.lines() {
            match line {
                Ok(line) if !line.is_empty() => {
                    line_count += 1;
                    eprintln!("[Claude STDOUT #{}] {}", line_count, &line[..std::cmp::min(200, line.len())]);

                    // Try to parse as JSON
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                        // Capture session ID from init message
                        if let Some(sid) = json.get("session_id").and_then(|v| v.as_str()) {
                            captured_claude_session_id = Some(sid.to_string());
                        }

                        // Check for init message - marks session as ready
                        let msg_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");
                        let subtype = json.get("subtype").and_then(|v| v.as_str()).unwrap_or("");

                        if subtype == "init" || (msg_type == "system" && subtype == "init") {
                            session_ready = true;
                            eprintln!("[Claude] Session ready! Claude session ID: {:?}", captured_claude_session_id);

                            // Emit session_ready event with full init info
                            let mut chunk = create_chunk("session_ready", &session_for_reader);
                            chunk.model = json.get("model").and_then(|v| v.as_str()).map(|s| s.to_string());
                            chunk.content = Some(line.clone()); // Include full init JSON
                            chunk.claude_session_id = captured_claude_session_id.clone();
                            let _ = window_clone.emit("claude-stream", &chunk);
                        }

                        // Parse and emit the chunk
                        if let Some(mut chunk) = parse_claude_chunk(&json, &session_for_reader) {
                            if chunk.chunk_type == "init" {
                                chunk.claude_session_id = captured_claude_session_id.clone();
                            }
                            let _ = window_clone.emit("claude-stream", &chunk);
                        }
                    } else {
                        // Non-JSON line - emit as raw
                        let mut raw_chunk = create_chunk("raw", &session_for_reader);
                        raw_chunk.content = Some(line);
                        let _ = window_clone.emit("claude-stream", &raw_chunk);
                    }
                }
                Err(e) => {
                    eprintln!("[Claude] Read error: {}", e);
                    let mut chunk = create_chunk("error", &session_for_reader);
                    chunk.content = Some(format!("Read error: {}", e));
                    let _ = window_clone.emit("claude-stream", &chunk);
                }
                _ => {}
            }
        }

        // Process has ended
        eprintln!("[Claude] Stdout reader finished. Total lines: {}. Session ready: {}", line_count, session_ready);

        let mut chunk = create_chunk("session_ended", &session_for_reader);
        chunk.content = Some(format!("Session ended after {} lines", line_count));
        chunk.claude_session_id = captured_claude_session_id;
        let _ = window_clone.emit("claude-stream", &chunk);

        // Clean up the instance
        let mut instances = state_clone.instances.lock().unwrap();
        instances.remove(&session_for_reader);
    });

    Ok(session_id)
}

/// Send input to a running Claude session (prompts, tool approvals, etc.)
#[tauri::command]
pub async fn send_claude_input(
    state: State<'_, Arc<ClaudeProcessManager>>,
    session_id: String,
    input: String,
) -> Result<(), String> {
    let mut instances = state.instances.lock().unwrap();

    if let Some(instance) = instances.get_mut(&session_id) {
        if let Some(ref mut stdin) = instance.stdin {
            eprintln!("[Claude] Sending input to session {}: {}", session_id, &input[..std::cmp::min(50, input.len())]);
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

/// Stop a running Claude session gracefully
#[tauri::command]
pub async fn stop_claude_session(
    window: tauri::Window,
    state: State<'_, Arc<ClaudeProcessManager>>,
    session_id: String,
) -> Result<(), String> {
    let mut instances = state.instances.lock().unwrap();

    if let Some(mut instance) = instances.remove(&session_id) {
        // Try to send /exit command first for graceful shutdown
        if let Some(ref mut stdin) = instance.stdin {
            let _ = stdin.write_all(b"/exit\n");
            let _ = stdin.flush();
        }

        // Give it a moment, then force kill if still running
        std::thread::sleep(std::time::Duration::from_millis(500));
        let _ = instance.child.kill();

        // Emit session_ended event
        let mut chunk = create_chunk("session_ended", &session_id);
        chunk.content = Some("Session stopped by user".to_string());
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

// Keep the old function for backwards compatibility but mark as deprecated
/// Start a new Claude CLI process for streaming (DEPRECATED - use start_claude_session instead)
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
    // Start a session
    start_claude_session(
        window.clone(),
        state.clone(),
        cwd,
        session_id.clone(),
        permission_mode,
        claude_session_id,
    ).await?;

    // Send the prompt
    send_claude_input(state, session_id.clone(), format!("{}\n", prompt)).await?;

    Ok(session_id)
}

/// Terminate a running Claude session (alias for stop_claude_session)
#[tauri::command]
pub async fn terminate_claude_session(
    window: tauri::Window,
    state: State<'_, Arc<ClaudeProcessManager>>,
    session_id: String,
) -> Result<(), String> {
    stop_claude_session(window, state, session_id).await
}
