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
    safe_mode: Option<bool>,
    mcp_permission_port: Option<u16>,
) -> Result<String, String> {
    // Check if session is already running
    {
        let instances = state.instances.lock().unwrap();
        if instances.contains_key(&session_id) {
            return Err("Session already running".to_string());
        }
    }

    let mut mode = permission_mode.unwrap_or_default();
    let is_safe_mode = safe_mode.unwrap_or(true);

    // Safe mode: prevent bypassPermissions to protect against destructive operations
    // outside the project directory. Downgrade to acceptEdits which still allows
    // file edits but rejects arbitrary bash commands.
    if is_safe_mode && mode == PermissionMode::BypassPermissions {
        eprintln!("[Claude] Safe mode enabled: downgrading bypassPermissions to acceptEdits");
        mode = PermissionMode::AcceptEdits;
    }

    // For Manual mode, we use permission-prompt-tool with our MCP server
    // This requires setting up MCP config and passing the port
    let is_manual_mode = mode == PermissionMode::Manual;

    // Build args for streaming JSON mode with persistent stdin
    // Note: In stream-json mode, there's no interactive tool approval.
    // Tools are either auto-approved (based on permission-mode) or auto-rejected.
    // The result message includes `permission_denials` for rejected tools.
    // For Manual mode, we use permission-prompt-tool to intercept all tool calls.
    let effective_mode = if is_manual_mode {
        // In manual mode, we use "default" permission mode but intercept via MCP
        PermissionMode::Default
    } else {
        mode.clone()
    };

    let mut args = vec![
        "-p".to_string(),              // Print mode (required for stream-json)
        "--input-format".to_string(),
        "stream-json".to_string(),     // JSON input via stdin
        "--output-format".to_string(),
        "stream-json".to_string(),     // JSON output via stdout
        "--verbose".to_string(),       // Required for stream-json
        "--permission-mode".to_string(),
        effective_mode.as_str().to_string(),
    ];

    // For manual mode, add permission-prompt-tool flag
    if is_manual_mode {
        args.push("--permission-prompt-tool".to_string());
        args.push("mcp__wynter__approve_tool".to_string());
    }

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
    if is_manual_mode {
        eprintln!("[Claude] Manual mode enabled with MCP permission server");
    }

    // Create MCP config for manual mode
    let mcp_config_path = if is_manual_mode {
        let port = mcp_permission_port.ok_or("MCP permission port required for manual mode")?;

        // Get the path to our MCP script
        let exe_path = std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
        let app_dir = exe_path.parent().ok_or("Failed to get app directory")?;

        // For development, the script is in the project root's scripts folder
        // For production, it should be bundled with the app
        let script_path = if cfg!(debug_assertions) {
            // Development: use project scripts folder
            std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .parent()
                .unwrap()
                .join("scripts")
                .join("mcp-permission-server.mjs")
        } else {
            // Production: use bundled script
            app_dir.join("scripts").join("mcp-permission-server.mjs")
        };

        let mcp_config = serde_json::json!({
            "mcpServers": {
                "wynter": {
                    "command": "node",
                    "args": [script_path.to_string_lossy()],
                    "env": {
                        "WYNTER_MCP_PORT": port.to_string()
                    }
                }
            }
        });

        // Write config to temp file
        let config_path = std::env::temp_dir().join(format!("wynter-mcp-config-{}.json", session_id));
        std::fs::write(&config_path, serde_json::to_string_pretty(&mcp_config).unwrap())
            .map_err(|e| format!("Failed to write MCP config: {}", e))?;

        Some(config_path)
    } else {
        None
    };

    // Add MCP config path if in manual mode
    if let Some(ref config_path) = mcp_config_path {
        args.push("--mcp-config".to_string());
        args.push(config_path.to_string_lossy().to_string());
    }

    let mut child = Command::new("claude")
        .args(&args)
        .current_dir(&cwd)
        .env("HOME", &home)
        .env("PATH", &enhanced_path)
        .env("TERM", "xterm-256color")
        .env("CLAUDE_CODE_MAX_OUTPUT_TOKENS", "200000")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Claude CLI: {} (PATH={})", e, enhanced_path))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;

    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

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

    // In stream-json mode, Claude CLI doesn't output init JSON until the first message is received.
    // So we emit session_ready immediately after spawning - the session IS ready to receive messages.
    {
        let mut chunk = create_chunk("session_ready", &session_id);
        chunk.content = Some(format!("Session ready in {}", cwd));
        chunk.model = Some("claude".to_string()); // Will be updated when we get actual init
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
        eprintln!(
            "[Claude] Stdout reader thread started for session: {}",
            session_for_reader
        );
        eprintln!("[Claude] About to create BufReader...");
        let reader = BufReader::new(stdout);
        eprintln!("[Claude] BufReader created, starting to read lines...");
        let mut captured_claude_session_id: Option<String> = resume_session_id.clone();
        let mut line_count = 0;
        let mut session_ready = false;

        for line in reader.lines() {
            eprintln!("[Claude] Got a line from reader...");
            match line {
                Ok(line) if !line.is_empty() => {
                    line_count += 1;
                    // Safely truncate at char boundary for logging
                    let log_preview: String = line.chars().take(200).collect();
                    eprintln!("[Claude STDOUT #{}] {}", line_count, log_preview);

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
                            eprintln!(
                                "[Claude] Session ready! Claude session ID: {:?}",
                                captured_claude_session_id
                            );

                            // Emit session_ready event with full init info
                            let mut chunk = create_chunk("session_ready", &session_for_reader);
                            chunk.model = json
                                .get("model")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string());
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
        eprintln!(
            "[Claude] Stdout reader finished. Total lines: {}. Session ready: {}",
            line_count, session_ready
        );

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

/// Send input to a running Claude session (prompts)
/// We format as JSON: {"type":"user","message":{"role":"user","content":"..."}}
#[tauri::command]
pub async fn send_claude_input(
    state: State<'_, Arc<ClaudeProcessManager>>,
    session_id: String,
    input: String,
) -> Result<(), String> {
    let mut instances = state.instances.lock().unwrap();

    if let Some(instance) = instances.get_mut(&session_id) {
        if let Some(ref mut stdin) = instance.stdin {
            // Format as streaming JSON user message
            let json_input = serde_json::json!({
                "type": "user",
                "message": {
                    "role": "user",
                    "content": input.trim_end_matches('\n')
                }
            });
            let formatted = format!("{}\n", json_input);

            eprintln!(
                "[Claude] Sending JSON input to session {}: {}",
                session_id,
                &formatted[..std::cmp::min(100, formatted.len())]
            );
            stdin
                .write_all(formatted.as_bytes())
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

/// Send raw input to Claude session (for tool approvals like "y" or "n")
/// This doesn't wrap in JSON - sends directly to stdin
#[tauri::command]
pub async fn send_claude_raw_input(
    state: State<'_, Arc<ClaudeProcessManager>>,
    session_id: String,
    input: String,
) -> Result<(), String> {
    let mut instances = state.instances.lock().unwrap();

    if let Some(instance) = instances.get_mut(&session_id) {
        if let Some(ref mut stdin) = instance.stdin {
            eprintln!(
                "[Claude] Sending RAW input to session {}: {:?}",
                session_id,
                &input
            );
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
        // In stream-json mode, we can't send /exit - just close stdin and kill
        // Drop stdin to close it
        drop(instance.stdin.take());

        // Give it a moment to exit gracefully, then force kill
        std::thread::sleep(std::time::Duration::from_millis(200));
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
        None, // safe_mode defaults to true
        None, // mcp_permission_port not used in deprecated function
    )
    .await?;

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
