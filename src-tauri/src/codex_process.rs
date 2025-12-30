use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, State};

use crate::commands::{create_chunk, PermissionMode, StreamChunk};
use crate::path_utils::get_enhanced_path;

/// Represents a running Codex CLI process
struct CodexProcessInstance {
    child: Child,
    stdin: Option<ChildStdin>,
    #[allow(dead_code)]
    session_id: String,
    thread_id: Option<String>,
    cwd: String,
}

/// Manages multiple Codex CLI processes across sessions
pub struct CodexProcessManager {
    instances: Mutex<HashMap<String, CodexProcessInstance>>,
}

impl CodexProcessManager {
    pub fn new() -> Self {
        Self {
            instances: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for CodexProcessManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Parse Codex JSONL event into our StreamChunk format
fn parse_codex_chunk(json: &serde_json::Value, session_id: &str) -> Option<StreamChunk> {
    let event_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");

    match event_type {
        "thread.started" => {
            let mut chunk = create_chunk("init", session_id);
            chunk.thread_id = json
                .get("thread_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            chunk.subtype = Some("init".to_string());
            Some(chunk)
        }

        "turn.started" => {
            let mut chunk = create_chunk("turn_start", session_id);
            chunk.content = Some("Turn started".to_string());
            Some(chunk)
        }

        "turn.completed" => {
            let mut chunk = create_chunk("usage", session_id);
            // Extract usage from turn events
            if let Some(usage) = json.get("usage") {
                chunk.input_tokens = usage.get("input_tokens").and_then(|v| v.as_u64());
                chunk.output_tokens = usage.get("output_tokens").and_then(|v| v.as_u64());
                chunk.cache_read_tokens = usage.get("cached_input_tokens").and_then(|v| v.as_u64());
            }
            Some(chunk)
        }

        "turn.failed" => {
            let mut chunk = create_chunk("error", session_id);
            chunk.is_error = Some(true);
            chunk.content = json
                .get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
                .map(|s| s.to_string())
                .or_else(|| Some("Turn failed".to_string()));
            Some(chunk)
        }

        "item.started" => {
            if let Some(item) = json.get("item") {
                let item_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");
                match item_type {
                    "command_execution" => {
                        let mut chunk = create_chunk("tool_start", session_id);
                        chunk.tool_name = Some("Bash".to_string());
                        chunk.tool_id = item
                            .get("id")
                            .and_then(|i| i.as_str())
                            .map(|s| s.to_string());
                        chunk.tool_input = item
                            .get("command")
                            .and_then(|c| c.as_str())
                            .map(|s| format!(r#"{{"command": "{}"}}"#, s));
                        return Some(chunk);
                    }
                    "file_change" | "file_read" | "file_write" => {
                        let mut chunk = create_chunk("tool_start", session_id);
                        chunk.tool_name = Some(match item_type {
                            "file_read" => "Read",
                            "file_write" => "Write",
                            _ => "Edit",
                        }.to_string());
                        chunk.tool_id = item
                            .get("id")
                            .and_then(|i| i.as_str())
                            .map(|s| s.to_string());
                        chunk.tool_input = item
                            .get("path")
                            .and_then(|p| p.as_str())
                            .map(|s| format!(r#"{{"file_path": "{}"}}"#, s));
                        return Some(chunk);
                    }
                    "agent_message" | "message" => {
                        let mut chunk = create_chunk("text", session_id);
                        chunk.content = item
                            .get("content")
                            .and_then(|c| c.as_str())
                            .map(|s| s.to_string());
                        return Some(chunk);
                    }
                    "reasoning" => {
                        let mut chunk = create_chunk("thinking", session_id);
                        chunk.content = item
                            .get("content")
                            .and_then(|c| c.as_str())
                            .map(|s| s.to_string());
                        return Some(chunk);
                    }
                    _ => {}
                }
            }
            None
        }

        "item.completed" => {
            if let Some(item) = json.get("item") {
                let item_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");

                // Handle different item types
                match item_type {
                    "agent_message" | "message" => {
                        // Text response - use "text" field from Codex
                        let mut chunk = create_chunk("text", session_id);
                        chunk.content = item
                            .get("text")
                            .and_then(|t| t.as_str())
                            .map(|s| s.to_string());
                        return Some(chunk);
                    }
                    "reasoning" => {
                        // Thinking/reasoning - use "text" field
                        let mut chunk = create_chunk("thinking", session_id);
                        chunk.content = item
                            .get("text")
                            .and_then(|t| t.as_str())
                            .map(|s| s.to_string());
                        return Some(chunk);
                    }
                    _ => {
                        // Tool result or other
                        let mut chunk = create_chunk("tool_result", session_id);
                        chunk.tool_id = item
                            .get("id")
                            .and_then(|i| i.as_str())
                            .map(|s| s.to_string());
                        let status = item
                            .get("status")
                            .and_then(|s| s.as_str())
                            .unwrap_or("");
                        chunk.tool_is_error = Some(status == "failed" || status == "error");
                        chunk.content = item
                            .get("output")
                            .and_then(|o| o.as_str())
                            .map(|s| s.to_string());
                        return Some(chunk);
                    }
                }
            }
            None
        }

        "error" => {
            let mut chunk = create_chunk("error", session_id);
            chunk.is_error = Some(true);
            chunk.content = json
                .get("message")
                .and_then(|m| m.as_str())
                .map(|s| s.to_string())
                .or_else(|| {
                    json.get("error")
                        .and_then(|e| e.as_str())
                        .map(|s| s.to_string())
                });
            Some(chunk)
        }

        _ => None,
    }
}

/// Start a persistent Codex CLI session
/// User sends prompts via send_codex_input, receives responses via events
#[tauri::command]
pub async fn start_codex_session(
    window: tauri::Window,
    state: State<'_, Arc<CodexProcessManager>>,
    cwd: String,
    session_id: String,
    resume_thread_id: Option<String>,
    model: Option<String>,
    initial_prompt: Option<String>,
    permission_mode: Option<PermissionMode>,
    safe_mode: Option<bool>,
) -> Result<String, String> {
    // Check if session is already running
    {
        let instances = state.instances.lock().unwrap();
        if instances.contains_key(&session_id) {
            return Err("Session already running".to_string());
        }
    }

    // Handle permission mode mapping
    let mut mode = permission_mode.unwrap_or_default();
    let is_safe_mode = safe_mode.unwrap_or(true);

    // Safe mode: prevent bypassPermissions (--yolo) for safety
    if is_safe_mode && mode == PermissionMode::BypassPermissions {
        eprintln!("[Codex] Safe mode enabled: downgrading bypassPermissions to acceptEdits (--full-auto)");
        mode = PermissionMode::AcceptEdits;
    }

    // Build args for Codex exec mode with JSON output
    let mut args = vec![
        "exec".to_string(),
        "--json".to_string(),
        "--skip-git-repo-check".to_string(),
    ];

    // Map permission modes to Codex CLI flags
    match mode {
        PermissionMode::Default => {
            // Default behavior: use --full-auto for sandboxed execution with approvals
            args.push("--full-auto".to_string());
        }
        PermissionMode::Plan => {
            args.push("--sandbox".to_string());
            args.push("read-only".to_string());
        }
        PermissionMode::AcceptEdits => {
            args.push("--full-auto".to_string());
        }
        PermissionMode::BypassPermissions => {
            args.push("--dangerously-bypass-approvals-and-sandbox".to_string());
        }
        PermissionMode::Manual => {
            // Manual mode: use read-only sandbox for maximum safety
            eprintln!("[Codex] Manual mode: using read-only sandbox");
            args.push("--sandbox".to_string());
            args.push("read-only".to_string());
        }
    }

    // Add model flag if specified
    if let Some(ref model_name) = model {
        args.push("--model".to_string());
        args.push(model_name.clone());
    }

    // Resume with thread_id if provided
    if let Some(ref tid) = resume_thread_id {
        args.push("resume".to_string());
        args.push(tid.clone());
        eprintln!("[Codex] Resuming thread: {}", tid);
    }

    // Add initial prompt (required for exec mode)
    if let Some(ref prompt) = initial_prompt {
        args.push(prompt.clone());
    } else {
        // Codex exec needs a prompt - we'll send the real prompt via stdin
        // Using a minimal placeholder that will be replaced
        args.push("Hello, ready for instructions.".to_string());
    }

    // Build enhanced environment for Codex CLI
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users".to_string());
    let enhanced_path = get_enhanced_path();

    eprintln!("[Codex] Starting session with args: {:?}", args);
    eprintln!("[Codex] Working directory: {}", cwd);
    if let Some(ref m) = model {
        eprintln!("[Codex] Model: {}", m);
    }

    let mut child = Command::new("codex")
        .args(&args)
        .current_dir(&cwd)
        .env("HOME", &home)
        .env("PATH", &enhanced_path)
        .env("TERM", "xterm-256color")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Codex CLI: {} (PATH={})", e, enhanced_path))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;
    let stdin = child.stdin.take();

    // Store the process instance
    {
        let mut instances = state.instances.lock().unwrap();
        instances.insert(
            session_id.clone(),
            CodexProcessInstance {
                child,
                stdin,
                session_id: session_id.clone(),
                thread_id: resume_thread_id.clone(),
                cwd: cwd.clone(),
            },
        );
    }

    // Emit a "session_starting" event
    {
        let mut chunk = create_chunk("session_starting", &session_id);
        chunk.content = Some(format!("Starting Codex session in {}", cwd));
        let _ = window.emit("codex-stream", &chunk);
    }

    // Spawn stderr reader thread
    let window_for_stderr = window.clone();
    let session_for_stderr = session_id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                eprintln!("[Codex STDERR] {}", line);
                if !line.is_empty() {
                    let mut chunk = create_chunk("stderr", &session_for_stderr);
                    chunk.content = Some(line);
                    let _ = window_for_stderr.emit("codex-stream", &chunk);
                }
            }
        }
    });

    // Spawn stdout reader thread
    let window_clone = window.clone();
    let session_for_reader = session_id.clone();

    std::thread::spawn(move || {
        eprintln!(
            "[Codex] Stdout reader thread started for session: {}",
            session_for_reader
        );
        let reader = BufReader::new(stdout);
        let mut captured_thread_id: Option<String> = resume_thread_id;
        let mut line_count = 0;
        let mut session_ready = false;

        for line in reader.lines() {
            match line {
                Ok(line) if !line.is_empty() => {
                    line_count += 1;
                    // Safely truncate at char boundary for logging
                    let log_preview: String = line.chars().take(200).collect();
                    eprintln!("[Codex STDOUT #{}] {}", line_count, log_preview);

                    // Try to parse as JSON
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                        // Capture thread ID from thread.started message
                        let event_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");
                        if event_type == "thread.started" {
                            if let Some(tid) = json.get("thread_id").and_then(|v| v.as_str()) {
                                captured_thread_id = Some(tid.to_string());
                                eprintln!("[Codex] Thread started! Thread ID: {}", tid);

                                // Emit session_ready event
                                let mut chunk = create_chunk("session_ready", &session_for_reader);
                                chunk.thread_id = Some(tid.to_string());
                                chunk.content = Some(line.clone());
                                let _ = window_clone.emit("codex-stream", &chunk);
                                session_ready = true;
                            }
                        }

                        // Parse and emit the chunk
                        if let Some(mut chunk) = parse_codex_chunk(&json, &session_for_reader) {
                            chunk.thread_id = captured_thread_id.clone();
                            let _ = window_clone.emit("codex-stream", &chunk);
                        }
                    } else {
                        // Non-JSON line - emit as raw
                        let mut raw_chunk = create_chunk("raw", &session_for_reader);
                        raw_chunk.content = Some(line);
                        let _ = window_clone.emit("codex-stream", &raw_chunk);
                    }
                }
                Err(e) => {
                    eprintln!("[Codex] Read error: {}", e);
                    let mut chunk = create_chunk("error", &session_for_reader);
                    chunk.content = Some(format!("Read error: {}", e));
                    let _ = window_clone.emit("codex-stream", &chunk);
                }
                _ => {}
            }
        }

        // Process has ended - but for Codex this is normal (each prompt is a new process)
        // Don't emit session_ended or clean up - session stays active for more prompts
        eprintln!(
            "[Codex] Stdout reader finished. Total lines: {}. Session ready: {}",
            line_count, session_ready
        );

        // Emit turn_completed instead of session_ended
        let mut chunk = create_chunk("result", &session_for_reader);
        chunk.content = Some("Turn completed".to_string());
        chunk.thread_id = captured_thread_id;
        let _ = window_clone.emit("codex-stream", &chunk);

        // DON'T remove the instance - we need it for thread_id on next prompt
    });

    Ok(session_id)
}

/// Send input to a Codex session
/// Since Codex exec is single-shot, we spawn a NEW process for each prompt
/// using the thread_id to maintain conversation context
#[tauri::command]
pub async fn send_codex_input(
    window: tauri::Window,
    state: State<'_, Arc<CodexProcessManager>>,
    session_id: String,
    input: String,
    model: Option<String>,
    images: Option<Vec<String>>,
) -> Result<(), String> {
    // Get the thread_id and cwd from the existing session
    let (thread_id, cwd) = {
        let instances = state.instances.lock().unwrap();
        match instances.get(&session_id) {
            Some(instance) => (instance.thread_id.clone(), instance.cwd.clone()),
            None => return Err("Session not found".to_string()),
        }
    };

    eprintln!(
        "[Codex] send_codex_input: session={}, thread_id={:?}, cwd={}, input={}",
        session_id,
        thread_id,
        cwd,
        &input[..std::cmp::min(100, input.len())]
    );

    // Build args for new exec process
    let mut args = vec![
        "exec".to_string(),
        "--json".to_string(),
        "--skip-git-repo-check".to_string(),
    ];

    // Add model if specified
    if let Some(ref model_name) = model {
        args.push("--model".to_string());
        args.push(model_name.clone());
    }

    // Add images with -i flag
    if let Some(ref image_paths) = images {
        for path in image_paths {
            args.push("-i".to_string());
            args.push(path.clone());
        }
    }

    // If we have a thread_id, use resume to continue the conversation
    if let Some(ref tid) = thread_id {
        args.push("resume".to_string());
        args.push(tid.clone());
    }

    // Add the prompt
    args.push(input.trim().to_string());

    // Build environment
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users".to_string());
    let enhanced_path = get_enhanced_path();

    eprintln!("[Codex] Starting new exec process with args: {:?}", args);

    let mut child = std::process::Command::new("codex")
        .args(&args)
        .current_dir(&cwd)
        .env("HOME", &home)
        .env("PATH", &enhanced_path)
        .env("TERM", "xterm-256color")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Codex CLI: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    // Update instance with new child process
    {
        let mut instances = state.instances.lock().unwrap();
        if let Some(instance) = instances.get_mut(&session_id) {
            // Kill old process if still running
            let _ = instance.child.kill();
            instance.child = child;
            instance.stdin = None; // exec mode doesn't use stdin for follow-up
        }
    }

    // Spawn stderr reader
    let window_for_stderr = window.clone();
    let session_for_stderr = session_id.clone();
    std::thread::spawn(move || {
        let reader = std::io::BufReader::new(stderr);
        use std::io::BufRead;
        for line in reader.lines() {
            if let Ok(line) = line {
                eprintln!("[Codex STDERR] {}", line);
                if !line.is_empty() {
                    let mut chunk = create_chunk("stderr", &session_for_stderr);
                    chunk.content = Some(line);
                    let _ = window_for_stderr.emit("codex-stream", &chunk);
                }
            }
        }
    });

    // Spawn stdout reader
    let window_clone = window.clone();
    let state_clone = state.inner().clone();
    let session_for_reader = session_id.clone();
    let existing_thread_id = thread_id.clone();

    std::thread::spawn(move || {
        let reader = std::io::BufReader::new(stdout);
        use std::io::BufRead;
        let mut captured_thread_id = existing_thread_id;
        let mut line_count = 0;

        for line in reader.lines() {
            match line {
                Ok(line) if !line.is_empty() => {
                    line_count += 1;
                    let log_preview: String = line.chars().take(200).collect();
                    eprintln!("[Codex STDOUT #{}] {}", line_count, log_preview);

                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                        let event_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");

                        // Capture thread_id
                        if event_type == "thread.started" {
                            if let Some(tid) = json.get("thread_id").and_then(|v| v.as_str()) {
                                captured_thread_id = Some(tid.to_string());
                                eprintln!("[Codex] Thread ID: {}", tid);

                                // Update stored thread_id
                                let mut instances = state_clone.instances.lock().unwrap();
                                if let Some(instance) = instances.get_mut(&session_for_reader) {
                                    instance.thread_id = Some(tid.to_string());
                                }
                            }
                        }

                        if let Some(mut chunk) = parse_codex_chunk(&json, &session_for_reader) {
                            chunk.thread_id = captured_thread_id.clone();
                            let _ = window_clone.emit("codex-stream", &chunk);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[Codex] Read error: {}", e);
                }
                _ => {}
            }
        }

        eprintln!("[Codex] Prompt completed. Lines: {}", line_count);

        // Emit turn completed
        let mut chunk = create_chunk("result", &session_for_reader);
        chunk.content = Some("Turn completed".to_string());
        chunk.thread_id = captured_thread_id;
        let _ = window_clone.emit("codex-stream", &chunk);
    });

    Ok(())
}

/// Stop a running Codex session gracefully
#[tauri::command]
pub async fn stop_codex_session(
    window: tauri::Window,
    state: State<'_, Arc<CodexProcessManager>>,
    session_id: String,
) -> Result<(), String> {
    let mut instances = state.instances.lock().unwrap();

    if let Some(mut instance) = instances.remove(&session_id) {
        // Drop stdin to close it
        drop(instance.stdin.take());

        // Give it a moment to exit gracefully, then force kill
        std::thread::sleep(std::time::Duration::from_millis(200));
        let _ = instance.child.kill();

        // Emit session_ended event
        let mut chunk = create_chunk("session_ended", &session_id);
        chunk.content = Some("Session stopped by user".to_string());
        chunk.thread_id = instance.thread_id;
        let _ = window.emit("codex-stream", &chunk);

        Ok(())
    } else {
        // Session might have already ended
        Ok(())
    }
}

/// Check if a Codex session is actively running
#[tauri::command]
pub async fn is_codex_session_active(
    state: State<'_, Arc<CodexProcessManager>>,
    session_id: String,
) -> Result<bool, String> {
    let instances = state.instances.lock().unwrap();
    Ok(instances.contains_key(&session_id))
}

/// Get list of all active Codex sessions
#[tauri::command]
pub async fn list_active_codex_sessions(
    state: State<'_, Arc<CodexProcessManager>>,
) -> Result<Vec<String>, String> {
    let instances = state.instances.lock().unwrap();
    Ok(instances.keys().cloned().collect())
}
