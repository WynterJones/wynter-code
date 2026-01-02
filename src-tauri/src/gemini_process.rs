use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, State};

use crate::commands::{create_chunk, PermissionMode, StreamChunk};

/// Represents a running Gemini CLI session
/// Note: Gemini CLI is stateless - no session resume support
struct GeminiProcessInstance {
    child: Child,
    #[allow(dead_code)]
    session_id: String,
    cwd: String,
    model: Option<String>,
    yolo_mode: bool,
}

/// Manages multiple Gemini CLI sessions
pub struct GeminiProcessManager {
    instances: Mutex<HashMap<String, GeminiProcessInstance>>,
}

impl GeminiProcessManager {
    pub fn new() -> Self {
        Self {
            instances: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for GeminiProcessManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Parse Gemini stream-json event into our StreamChunk format
fn parse_gemini_chunk(json: &serde_json::Value, session_id: &str) -> Option<StreamChunk> {
    let event_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");

    match event_type {
        "init" => {
            let mut chunk = create_chunk("init", session_id);
            chunk.model = json
                .get("model")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            chunk.subtype = Some("init".to_string());
            Some(chunk)
        }

        "message" => {
            let role = json.get("role").and_then(|v| v.as_str()).unwrap_or("");
            if role == "assistant" {
                let mut chunk = create_chunk("text", session_id);
                chunk.content = json
                    .get("content")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                return Some(chunk);
            }
            None
        }

        "tool_use" => {
            let mut chunk = create_chunk("tool_start", session_id);
            let raw_tool_name = json.get("tool_name").and_then(|v| v.as_str()).unwrap_or("");
            let params = json.get("parameters"); // Gemini uses "parameters" not "arguments"

            // Map Gemini CLI tool names to UI tool names and format input
            let (tool_name, tool_input) = match raw_tool_name {
                "run_shell_command" => {
                    let cmd = params
                        .and_then(|p| p.get("command"))
                        .and_then(|c| c.as_str())
                        .unwrap_or("");
                    ("Bash", serde_json::json!({"command": cmd}).to_string())
                }
                "read_file" => {
                    let path = params
                        .and_then(|p| p.get("file_path"))
                        .and_then(|f| f.as_str())
                        .unwrap_or("");
                    ("Read", serde_json::json!({"file_path": path}).to_string())
                }
                "write_file" => {
                    let path = params
                        .and_then(|p| p.get("file_path"))
                        .and_then(|f| f.as_str())
                        .unwrap_or("");
                    ("Write", serde_json::json!({"file_path": path}).to_string())
                }
                "replace" => {
                    // Pass all edit fields for diff display
                    let file_path = params
                        .and_then(|p| p.get("file_path"))
                        .and_then(|f| f.as_str())
                        .unwrap_or("");
                    let old_string = params
                        .and_then(|p| p.get("old_string"))
                        .and_then(|s| s.as_str())
                        .unwrap_or("");
                    let new_string = params
                        .and_then(|p| p.get("new_string"))
                        .and_then(|s| s.as_str())
                        .unwrap_or("");
                    (
                        "Edit",
                        serde_json::json!({
                            "file_path": file_path,
                            "old_string": old_string,
                            "new_string": new_string
                        })
                        .to_string(),
                    )
                }
                "write_todos" => {
                    // Pass todos array for TodoWriteDisplay
                    let todos = params.and_then(|p| p.get("todos")).cloned();
                    (
                        "TodoWrite",
                        serde_json::json!({ "todos": todos }).to_string(),
                    )
                }
                "delegate_to_agent" => {
                    let agent = params
                        .and_then(|p| p.get("agent_name"))
                        .and_then(|a| a.as_str())
                        .unwrap_or("");
                    let objective = params
                        .and_then(|p| p.get("objective"))
                        .and_then(|o| o.as_str())
                        .unwrap_or("");
                    (
                        "Task",
                        serde_json::json!({"prompt": objective, "subagent_type": agent}).to_string(),
                    )
                }
                _ => {
                    // Fallback: use raw name and pass parameters as-is
                    let tool_input = params.map(|v| v.to_string()).unwrap_or_default();
                    chunk.tool_name = json
                        .get("tool_name")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    chunk.tool_id = json
                        .get("tool_id")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    chunk.tool_input = Some(tool_input);
                    return Some(chunk);
                }
            };

            chunk.tool_name = Some(tool_name.to_string());
            chunk.tool_id = json
                .get("tool_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            chunk.tool_input = Some(tool_input);
            Some(chunk)
        }

        "tool_result" => {
            let mut chunk = create_chunk("tool_result", session_id);
            chunk.tool_id = json
                .get("tool_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            chunk.content = json
                .get("content")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let success = json.get("success").and_then(|v| v.as_bool()).unwrap_or(true);
            chunk.tool_is_error = Some(!success);
            Some(chunk)
        }

        "error" => {
            let mut chunk = create_chunk("error", session_id);
            chunk.is_error = Some(true);
            chunk.content = json
                .get("message")
                .and_then(|m| m.as_str())
                .map(|s| s.to_string());
            Some(chunk)
        }

        "result" => {
            let mut chunk = create_chunk("result", session_id);
            chunk.content = json
                .get("response")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            // Extract stats if present
            if let Some(stats) = json.get("stats") {
                chunk.input_tokens = stats.get("input_tokens").and_then(|v| v.as_u64());
                chunk.output_tokens = stats.get("output_tokens").and_then(|v| v.as_u64());
                chunk.model = stats
                    .get("model")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
            }
            Some(chunk)
        }

        _ => None,
    }
}

/// Start a Gemini CLI session
/// Note: Gemini is stateless - each prompt spawns a new process
#[tauri::command]
pub async fn start_gemini_session(
    window: tauri::Window,
    state: State<'_, Arc<GeminiProcessManager>>,
    cwd: String,
    session_id: String,
    model: Option<String>,
    permission_mode: Option<PermissionMode>,
    safe_mode: Option<bool>,
) -> Result<String, String> {
    // Check if session is already running
    {
        let instances = state.instances.lock().expect("Process instances mutex poisoned");
        if instances.contains_key(&session_id) {
            return Err("Session already running".to_string());
        }
    }

    // Handle permission mode mapping
    // Gemini only supports default (ask) or --yolo (auto-approve all)
    let mode = permission_mode.unwrap_or_default();
    let is_safe_mode = safe_mode.unwrap_or(true);

    let yolo_mode = match mode {
        PermissionMode::BypassPermissions => {
            if is_safe_mode {
                eprintln!("[Gemini] Safe mode enabled: downgrading bypassPermissions to acceptEdits (--yolo)");
            }
            !is_safe_mode // Only enable yolo if NOT in safe mode
        }
        PermissionMode::AcceptEdits => true,
        _ => false,
    };

    eprintln!(
        "[Gemini] Starting session: id={}, cwd={}, model={:?}, yolo={}",
        session_id, cwd, model, yolo_mode
    );

    // Create a placeholder child process - actual process is spawned per prompt
    // We use a simple 'true' command as placeholder
    let child = Command::new("true")
        .spawn()
        .map_err(|e| format!("Failed to create placeholder process: {}", e))?;

    // Store the session info
    {
        let mut instances = state.instances.lock().expect("Process instances mutex poisoned");
        instances.insert(
            session_id.clone(),
            GeminiProcessInstance {
                child,
                session_id: session_id.clone(),
                cwd: cwd.clone(),
                model: model.clone(),
                yolo_mode,
            },
        );
    }

    // Emit session_ready immediately (Gemini is stateless, always ready)
    {
        let mut chunk = create_chunk("session_ready", &session_id);
        chunk.content = Some(format!("Gemini session ready in {}", cwd));
        chunk.model = model;
        #[cfg(debug_assertions)]
        if let Err(e) = window.emit("gemini-stream", &chunk) {
            eprintln!("[DEBUG] Failed to emit 'gemini-stream': {}", e);
        }
        #[cfg(not(debug_assertions))]
        let _ = window.emit("gemini-stream", &chunk);
    }

    Ok(session_id)
}

/// Send input to a Gemini session
/// Spawns a NEW process for each prompt (Gemini CLI is stateless)
#[tauri::command]
pub async fn send_gemini_input(
    window: tauri::Window,
    state: State<'_, Arc<GeminiProcessManager>>,
    session_id: String,
    input: String,
    model: Option<String>,
    images: Option<Vec<String>>,
) -> Result<(), String> {
    // Get session config
    let (cwd, stored_model, yolo_mode) = {
        let instances = state.instances.lock().expect("Process instances mutex poisoned");
        match instances.get(&session_id) {
            Some(instance) => (
                instance.cwd.clone(),
                instance.model.clone(),
                instance.yolo_mode,
            ),
            None => return Err("Session not found".to_string()),
        }
    };

    // Use provided model or fall back to stored model
    let effective_model = model.or(stored_model);

    eprintln!(
        "[Gemini] send_gemini_input: session={}, model={:?}, yolo={}, input={}",
        session_id,
        effective_model,
        yolo_mode,
        &input[..std::cmp::min(100, input.len())]
    );

    // Build args for Gemini CLI
    // Use positional prompt (not deprecated -p flag) with stream-json output
    let mut args = vec![
        "--output-format".to_string(),
        "stream-json".to_string(),
    ];

    // Add model if specified
    if let Some(ref model_name) = effective_model {
        args.push("-m".to_string());
        args.push(model_name.clone());
    }

    // Add yolo flag if enabled
    if yolo_mode {
        args.push("--yolo".to_string());
    }

    // Add images with -i flag (Gemini CLI supports image inputs)
    if let Some(ref image_paths) = images {
        for path in image_paths {
            args.push("-i".to_string());
            args.push(path.clone());
        }
    }

    // Add the prompt as positional argument (must be last)
    args.push(input.trim().to_string());

    // Build environment
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users".to_string());
    let current_path = std::env::var("PATH").unwrap_or_default();
    let enhanced_path = format!(
        "{}/.local/bin:/usr/local/bin:/opt/homebrew/bin:{}/.nvm/versions/node/v22.11.0/bin:{}/.nvm/versions/node/v20.18.0/bin:{}",
        home, home, home, current_path
    );

    eprintln!("[Gemini] Starting process with args: {:?}", args);

    let mut child = Command::new("gemini")
        .args(&args)
        .current_dir(&cwd)
        .env("HOME", &home)
        .env("PATH", &enhanced_path)
        .env("TERM", "xterm-256color")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Gemini CLI: {} (PATH={})", e, enhanced_path))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    // Update instance with new child process
    {
        let mut instances = state.instances.lock().expect("Process instances mutex poisoned");
        if let Some(instance) = instances.get_mut(&session_id) {
            // Kill old process if still running
            let _ = instance.child.kill();
            instance.child = child;
        }
    }

    // Spawn stderr reader
    let window_for_stderr = window.clone();
    let session_for_stderr = session_id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                eprintln!("[Gemini STDERR] {}", line);
                if !line.is_empty() {
                    let mut chunk = create_chunk("stderr", &session_for_stderr);
                    chunk.content = Some(line);
                    #[cfg(debug_assertions)]
                    if let Err(e) = window_for_stderr.emit("gemini-stream", &chunk) {
                        eprintln!("[DEBUG] Failed to emit 'gemini-stream': {}", e);
                    }
                    #[cfg(not(debug_assertions))]
                    let _ = window_for_stderr.emit("gemini-stream", &chunk);
                }
            }
        }
    });

    // Spawn stdout reader
    let window_clone = window.clone();
    let session_for_reader = session_id.clone();
    let effective_model_for_reader = effective_model.clone();

    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let mut line_count = 0;

        // Dev mode only: Create JSONL log file for debugging stream output
        let mut log_file = if cfg!(debug_assertions) {
            let log_dir = std::env::temp_dir().join("wynter-code");
            if let Err(e) = std::fs::create_dir_all(&log_dir) {
                eprintln!("[Gemini] Failed to create log dir: {}", e);
            }
            let log_path = log_dir.join(format!("gemini-{}.jsonl", session_for_reader));
            eprintln!("[Gemini] JSONL log enabled: {:?}", log_path);
            std::fs::OpenOptions::new()
                .create(true)
                .write(true)
                .truncate(true)
                .open(&log_path)
                .ok()
        } else {
            None
        };

        for line in reader.lines() {
            match line {
                Ok(line) if !line.is_empty() => {
                    line_count += 1;
                    let log_preview: String = line.chars().take(200).collect();
                    eprintln!("[Gemini STDOUT #{}] {}", line_count, log_preview);

                    // Write raw line to JSONL log file
                    if let Some(ref mut file) = log_file {
                        use std::io::Write as IoWrite;
                        let _ = writeln!(file, "{}", line);
                    }

                    // Try to parse as JSON (stream-json format)
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                        if let Some(mut chunk) = parse_gemini_chunk(&json, &session_for_reader) {
                            // Ensure model is set
                            if chunk.model.is_none() {
                                chunk.model = effective_model_for_reader.clone();
                            }
                            #[cfg(debug_assertions)]
                            if let Err(e) = window_clone.emit("gemini-stream", &chunk) {
                                eprintln!("[DEBUG] Failed to emit 'gemini-stream': {}", e);
                            }
                            #[cfg(not(debug_assertions))]
                            let _ = window_clone.emit("gemini-stream", &chunk);
                        }
                    } else {
                        // Non-JSON line - might be plain text output
                        // Emit as text chunk
                        let mut chunk = create_chunk("text", &session_for_reader);
                        chunk.content = Some(line);
                        #[cfg(debug_assertions)]
                        if let Err(e) = window_clone.emit("gemini-stream", &chunk) {
                            eprintln!("[DEBUG] Failed to emit 'gemini-stream': {}", e);
                        }
                        #[cfg(not(debug_assertions))]
                        let _ = window_clone.emit("gemini-stream", &chunk);
                    }
                }
                Err(e) => {
                    eprintln!("[Gemini] Read error: {}", e);
                    let mut chunk = create_chunk("error", &session_for_reader);
                    chunk.content = Some(format!("Read error: {}", e));
                    #[cfg(debug_assertions)]
                    if let Err(e) = window_clone.emit("gemini-stream", &chunk) {
                        eprintln!("[DEBUG] Failed to emit 'gemini-stream': {}", e);
                    }
                    #[cfg(not(debug_assertions))]
                    let _ = window_clone.emit("gemini-stream", &chunk);
                }
                _ => {}
            }
        }

        eprintln!("[Gemini] Prompt completed. Lines: {}", line_count);

        // Emit turn completed
        let mut chunk = create_chunk("result", &session_for_reader);
        chunk.content = Some("Turn completed".to_string());
        chunk.model = effective_model_for_reader;
        #[cfg(debug_assertions)]
        if let Err(e) = window_clone.emit("gemini-stream", &chunk) {
            eprintln!("[DEBUG] Failed to emit 'gemini-stream': {}", e);
        }
        #[cfg(not(debug_assertions))]
        let _ = window_clone.emit("gemini-stream", &chunk);
    });

    Ok(())
}

/// Stop a running Gemini session
#[tauri::command]
pub async fn stop_gemini_session(
    window: tauri::Window,
    state: State<'_, Arc<GeminiProcessManager>>,
    session_id: String,
) -> Result<(), String> {
    let mut instances = state.instances.lock().expect("Process instances mutex poisoned");

    if let Some(mut instance) = instances.remove(&session_id) {
        // Kill the process
        let _ = instance.child.kill();

        // Emit session_ended event
        let mut chunk = create_chunk("session_ended", &session_id);
        chunk.content = Some("Session stopped by user".to_string());
        #[cfg(debug_assertions)]
        if let Err(e) = window.emit("gemini-stream", &chunk) {
            eprintln!("[DEBUG] Failed to emit 'gemini-stream': {}", e);
        }
        #[cfg(not(debug_assertions))]
        let _ = window.emit("gemini-stream", &chunk);

        Ok(())
    } else {
        // Session might have already ended
        Ok(())
    }
}

/// Check if a Gemini session is active
#[tauri::command]
pub async fn is_gemini_session_active(
    state: State<'_, Arc<GeminiProcessManager>>,
    session_id: String,
) -> Result<bool, String> {
    let instances = state.instances.lock().expect("Process instances mutex poisoned");
    Ok(instances.contains_key(&session_id))
}

/// Get list of all active Gemini sessions
#[tauri::command]
pub async fn list_active_gemini_sessions(
    state: State<'_, Arc<GeminiProcessManager>>,
) -> Result<Vec<String>, String> {
    let instances = state.instances.lock().expect("Process instances mutex poisoned");
    Ok(instances.keys().cloned().collect())
}
