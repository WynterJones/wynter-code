use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, State};

use crate::commands::{create_chunk, PermissionMode, StreamChunk};
use crate::path_utils::get_enhanced_path;

/// What kind of JSON-RPC request we issued, so responses can be routed.
#[derive(Clone, Debug, PartialEq)]
enum PendingKind {
    Initialize,
    ThreadStart,
    TurnStart,
}

/// Mutable per-session protocol state shared with the reader thread.
struct CodexSessionState {
    thread_id: Option<String>,
    current_turn_id: Option<String>,
    pending_requests: HashMap<i64, PendingKind>,
    /// Item IDs for which we received streaming deltas (avoid duplicating
    /// the full text when the item completes).
    items_with_deltas: std::collections::HashSet<String>,
    /// Prompt (text, image paths) queued before the thread is ready.
    pending_prompt: Option<(String, Vec<String>)>,
}

/// Represents a running `codex app-server` process for one session
struct CodexProcessInstance {
    child: Child,
    stdin: Arc<Mutex<Option<ChildStdin>>>,
    state: Arc<Mutex<CodexSessionState>>,
    next_request_id: Arc<AtomicI64>,
    model: Option<String>,
}

/// Manages multiple Codex app-server processes across sessions
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

fn emit_chunk(window: &tauri::Window, chunk: &StreamChunk) {
    #[cfg(debug_assertions)]
    if let Err(e) = window.emit("codex-stream", chunk) {
        eprintln!("[DEBUG] Failed to emit 'codex-stream': {}", e);
    }
    #[cfg(not(debug_assertions))]
    let _ = window.emit("codex-stream", chunk);
}

/// Write one newline-delimited JSON message to the app-server's stdin.
fn write_message(
    stdin: &Arc<Mutex<Option<ChildStdin>>>,
    value: &serde_json::Value,
) -> Result<(), String> {
    let mut guard = stdin.lock().expect("Codex stdin mutex poisoned");
    let writer = guard.as_mut().ok_or("Codex stdin closed")?;
    writeln!(writer, "{}", value).map_err(|e| format!("Failed to write to Codex: {}", e))?;
    writer
        .flush()
        .map_err(|e| format!("Failed to flush Codex stdin: {}", e))
}

/// Map our permission mode to app-server approval policy + sandbox mode.
/// Mirrors the old `codex exec` flags: full-auto = workspace-write sandbox,
/// plan/manual = read-only, bypass = no sandbox at all.
fn mode_to_policies(mode: &PermissionMode) -> (&'static str, &'static str) {
    match mode {
        PermissionMode::Default | PermissionMode::AcceptEdits => ("on-request", "workspace-write"),
        PermissionMode::Plan | PermissionMode::Manual => ("never", "read-only"),
        PermissionMode::BypassPermissions => ("never", "danger-full-access"),
    }
}

/// Whether server-side approval requests should be auto-accepted in this mode.
fn mode_auto_approves(mode: &PermissionMode) -> bool {
    !matches!(mode, PermissionMode::Plan | PermissionMode::Manual)
}

/// Build and send a `turn/start` request for the given prompt.
fn send_turn_start(
    stdin: &Arc<Mutex<Option<ChildStdin>>>,
    state: &Arc<Mutex<CodexSessionState>>,
    next_request_id: &Arc<AtomicI64>,
    thread_id: &str,
    text: &str,
    images: &[String],
    model: Option<&str>,
) -> Result<(), String> {
    let mut input = vec![serde_json::json!({
        "type": "text",
        "text": text,
        "text_elements": [],
    })];
    for path in images {
        input.push(serde_json::json!({ "type": "localImage", "path": path }));
    }

    let id = next_request_id.fetch_add(1, Ordering::SeqCst);
    let mut params = serde_json::json!({
        "threadId": thread_id,
        "input": input,
    });
    if let Some(m) = model {
        params["model"] = serde_json::json!(m);
    }

    {
        let mut st = state.lock().expect("Codex state mutex poisoned");
        st.pending_requests.insert(id, PendingKind::TurnStart);
    }

    write_message(
        stdin,
        &serde_json::json!({ "id": id, "method": "turn/start", "params": params }),
    )
}

/// Handle a JSON-RPC server notification, translating it to StreamChunks.
fn handle_notification(
    window: &tauri::Window,
    session_id: &str,
    state: &Arc<Mutex<CodexSessionState>>,
    method: &str,
    params: &serde_json::Value,
) {
    let thread_id = {
        let st = state.lock().expect("Codex state mutex poisoned");
        st.thread_id.clone()
    };

    match method {
        "turn/started" => {
            if let Some(turn_id) = params
                .pointer("/turn/id")
                .and_then(|v| v.as_str())
            {
                let mut st = state.lock().expect("Codex state mutex poisoned");
                st.current_turn_id = Some(turn_id.to_string());
            }
            let mut chunk = create_chunk("turn_start", session_id);
            chunk.content = Some("Turn started".to_string());
            chunk.thread_id = thread_id;
            emit_chunk(window, &chunk);
        }

        "item/agentMessage/delta" => {
            if let (Some(item_id), Some(delta)) = (
                params.get("itemId").and_then(|v| v.as_str()),
                params.get("delta").and_then(|v| v.as_str()),
            ) {
                {
                    let mut st = state.lock().expect("Codex state mutex poisoned");
                    st.items_with_deltas.insert(item_id.to_string());
                }
                let mut chunk = create_chunk("text", session_id);
                chunk.content = Some(delta.to_string());
                chunk.thread_id = thread_id;
                emit_chunk(window, &chunk);
            }
        }

        "item/started" => {
            let Some(item) = params.get("item") else { return };
            let item_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");
            let item_id = item.get("id").and_then(|i| i.as_str()).map(String::from);

            match item_type {
                "commandExecution" => {
                    let mut chunk = create_chunk("tool_start", session_id);
                    chunk.tool_name = Some("Bash".to_string());
                    chunk.tool_id = item_id;
                    chunk.tool_input = item
                        .get("command")
                        .and_then(|c| c.as_str())
                        .map(|s| serde_json::json!({ "command": s }).to_string());
                    chunk.thread_id = thread_id;
                    emit_chunk(window, &chunk);
                }
                "fileChange" => {
                    let mut chunk = create_chunk("tool_start", session_id);
                    chunk.tool_name = Some("Edit".to_string());
                    chunk.tool_id = item_id;
                    chunk.tool_input = item
                        .pointer("/changes/0/path")
                        .and_then(|p| p.as_str())
                        .map(|s| serde_json::json!({ "file_path": s }).to_string());
                    chunk.thread_id = thread_id;
                    emit_chunk(window, &chunk);
                }
                "mcpToolCall" => {
                    let mut chunk = create_chunk("tool_start", session_id);
                    let tool = item.get("tool").and_then(|t| t.as_str()).unwrap_or("MCP");
                    chunk.tool_name = Some(tool.to_string());
                    chunk.tool_id = item_id;
                    chunk.tool_input = item.get("arguments").map(|a| a.to_string());
                    chunk.thread_id = thread_id;
                    emit_chunk(window, &chunk);
                }
                _ => {}
            }
        }

        "item/completed" => {
            let Some(item) = params.get("item") else { return };
            let item_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");
            let item_id = item.get("id").and_then(|i| i.as_str()).unwrap_or("");

            match item_type {
                "agentMessage" => {
                    // Only emit the full text if it wasn't already streamed via deltas
                    let already_streamed = {
                        let st = state.lock().expect("Codex state mutex poisoned");
                        st.items_with_deltas.contains(item_id)
                    };
                    if !already_streamed {
                        let mut chunk = create_chunk("text", session_id);
                        chunk.content = item
                            .get("text")
                            .and_then(|t| t.as_str())
                            .map(String::from);
                        chunk.thread_id = thread_id;
                        emit_chunk(window, &chunk);
                    }
                }
                "reasoning" => {
                    // Each summary entry is a discrete thought; the frontend
                    // renders one bullet per chunk
                    let parts = item
                        .get("summary")
                        .and_then(|s| s.as_array())
                        .filter(|a| !a.is_empty())
                        .or_else(|| item.get("content").and_then(|c| c.as_array()));
                    if let Some(parts) = parts {
                        for part in parts {
                            if let Some(text) = part.as_str() {
                                if text.is_empty() {
                                    continue;
                                }
                                let mut chunk = create_chunk("thinking", session_id);
                                chunk.content = Some(text.to_string());
                                chunk.thread_id = thread_id.clone();
                                emit_chunk(window, &chunk);
                            }
                        }
                    }
                }
                "commandExecution" => {
                    let mut chunk = create_chunk("tool_result", session_id);
                    chunk.tool_id = Some(item_id.to_string());
                    let exit_code = item.get("exitCode").and_then(|c| c.as_i64());
                    let status = item.get("status").and_then(|s| s.as_str()).unwrap_or("");
                    chunk.tool_is_error =
                        Some(matches!(exit_code, Some(c) if c != 0) || status == "failed");
                    chunk.content = item
                        .get("aggregatedOutput")
                        .and_then(|o| o.as_str())
                        .map(String::from);
                    chunk.thread_id = thread_id;
                    emit_chunk(window, &chunk);
                }
                "fileChange" => {
                    let mut chunk = create_chunk("tool_result", session_id);
                    chunk.tool_id = Some(item_id.to_string());
                    let status = item.get("status").and_then(|s| s.as_str()).unwrap_or("");
                    chunk.tool_is_error = Some(status == "failed");
                    let paths: Vec<String> = item
                        .get("changes")
                        .and_then(|c| c.as_array())
                        .map(|changes| {
                            changes
                                .iter()
                                .filter_map(|ch| ch.get("path").and_then(|p| p.as_str()))
                                .map(String::from)
                                .collect()
                        })
                        .unwrap_or_default();
                    chunk.content = Some(paths.join("\n"));
                    chunk.thread_id = thread_id;
                    emit_chunk(window, &chunk);
                }
                "mcpToolCall" | "dynamicToolCall" => {
                    let mut chunk = create_chunk("tool_result", session_id);
                    chunk.tool_id = Some(item_id.to_string());
                    chunk.tool_is_error = Some(item.get("error").map_or(false, |e| !e.is_null()));
                    chunk.content = item.get("result").map(|r| r.to_string());
                    chunk.thread_id = thread_id;
                    emit_chunk(window, &chunk);
                }
                _ => {}
            }
        }

        "thread/tokenUsage/updated" => {
            if let Some(total) = params.pointer("/tokenUsage/total") {
                let mut chunk = create_chunk("usage", session_id);
                chunk.input_tokens = total.get("inputTokens").and_then(|v| v.as_u64());
                chunk.output_tokens = total.get("outputTokens").and_then(|v| v.as_u64());
                chunk.cache_read_tokens = total.get("cachedInputTokens").and_then(|v| v.as_u64());
                chunk.thread_id = thread_id;
                emit_chunk(window, &chunk);
            }
        }

        "turn/completed" => {
            {
                let mut st = state.lock().expect("Codex state mutex poisoned");
                st.current_turn_id = None;
                st.items_with_deltas.clear();
            }
            let status = params
                .pointer("/turn/status")
                .and_then(|s| s.as_str())
                .unwrap_or("");
            if status == "failed" {
                let mut err_chunk = create_chunk("error", session_id);
                err_chunk.is_error = Some(true);
                err_chunk.content = params
                    .pointer("/turn/error/message")
                    .and_then(|m| m.as_str())
                    .map(String::from)
                    .or_else(|| Some("Turn failed".to_string()));
                err_chunk.thread_id = thread_id.clone();
                emit_chunk(window, &err_chunk);
            }
            let mut chunk = create_chunk("result", session_id);
            chunk.content = Some("Turn completed".to_string());
            chunk.thread_id = thread_id;
            emit_chunk(window, &chunk);
        }

        "error" => {
            let mut chunk = create_chunk("error", session_id);
            chunk.is_error = Some(true);
            chunk.content = params
                .pointer("/error/message")
                .and_then(|m| m.as_str())
                .map(String::from)
                .or_else(|| Some("Codex error".to_string()));
            chunk.thread_id = thread_id;
            emit_chunk(window, &chunk);
        }

        _ => {}
    }
}

/// Respond to a server-initiated request (approvals etc.) based on the
/// session's permission mode.
fn handle_server_request(
    stdin: &Arc<Mutex<Option<ChildStdin>>>,
    permission_mode: &PermissionMode,
    id: &serde_json::Value,
    method: &str,
) {
    let approve = mode_auto_approves(permission_mode);
    let result = match method {
        // Legacy approval requests use ReviewDecision values
        "execCommandApproval" | "applyPatchApproval" => Some(serde_json::json!({
            "decision": if approve { "approved" } else { "denied" }
        })),
        // v2 item approval requests use accept/decline
        "item/commandExecution/requestApproval"
        | "item/fileChange/requestApproval"
        | "item/permissions/requestApproval" => Some(serde_json::json!({
            "decision": if approve { "accept" } else { "decline" }
        })),
        _ => None,
    };

    let response = match result {
        Some(result) => serde_json::json!({ "id": id, "result": result }),
        None => serde_json::json!({
            "id": id,
            "error": { "code": -32601, "message": format!("Unsupported request: {}", method) }
        }),
    };

    if let Err(e) = write_message(stdin, &response) {
        eprintln!("[Codex] Failed to respond to server request {}: {}", method, e);
    }
}

/// Start a persistent Codex session backed by `codex app-server` (JSON-RPC).
/// User sends prompts via send_codex_input, receives responses via events.
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
        let instances = state.instances.lock().expect("Process instances mutex poisoned");
        if instances.contains_key(&session_id) {
            return Err("Session already running".to_string());
        }
    }

    // Handle permission mode mapping
    let mut mode = permission_mode.unwrap_or_default();
    let is_safe_mode = safe_mode.unwrap_or(true);

    // Safe mode: prevent bypassPermissions for safety
    if is_safe_mode && mode == PermissionMode::BypassPermissions {
        eprintln!("[Codex] Safe mode enabled: downgrading bypassPermissions to acceptEdits");
        mode = PermissionMode::AcceptEdits;
    }

    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users".to_string());
    let enhanced_path = get_enhanced_path();

    eprintln!("[Codex] Starting app-server session in {}", cwd);

    let mut child = Command::new("codex")
        .arg("app-server")
        .current_dir(&cwd)
        .env("HOME", &home)
        .env("PATH", &enhanced_path)
        // Subscription auth: inherited API keys would override the user's
        // ChatGPT login from ~/.codex/auth.json
        .env_remove("OPENAI_API_KEY")
        .env_remove("CODEX_API_KEY")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn codex app-server: {} (PATH={})", e, enhanced_path))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;
    let stdin = Arc::new(Mutex::new(child.stdin.take()));

    let session_state = Arc::new(Mutex::new(CodexSessionState {
        thread_id: None,
        current_turn_id: None,
        pending_requests: HashMap::new(),
        items_with_deltas: std::collections::HashSet::new(),
        pending_prompt: initial_prompt.map(|p| (p, Vec::new())),
    }));
    let next_request_id = Arc::new(AtomicI64::new(1));

    // Store the process instance
    {
        let mut instances = state.instances.lock().expect("Process instances mutex poisoned");
        instances.insert(
            session_id.clone(),
            CodexProcessInstance {
                child,
                stdin: stdin.clone(),
                state: session_state.clone(),
                next_request_id: next_request_id.clone(),
                model: model.clone(),
            },
        );
    }

    // Emit a "session_starting" event
    {
        let mut chunk = create_chunk("session_starting", &session_id);
        chunk.content = Some(format!("Starting Codex session in {}", cwd));
        emit_chunk(&window, &chunk);
    }

    // Send the initialize request; the reader thread drives the rest of
    // the handshake (initialized -> thread/start -> session_ready).
    {
        let id = next_request_id.fetch_add(1, Ordering::SeqCst);
        session_state
            .lock()
            .expect("Codex state mutex poisoned")
            .pending_requests
            .insert(id, PendingKind::Initialize);
        write_message(
            &stdin,
            &serde_json::json!({
                "id": id,
                "method": "initialize",
                "params": {
                    "clientInfo": {
                        "name": "wynter_code",
                        "title": "WynterCode",
                        "version": env!("CARGO_PKG_VERSION"),
                    },
                    "capabilities": null,
                }
            }),
        )?;
    }

    // Spawn stderr reader thread
    let window_for_stderr = window.clone();
    let session_for_stderr = session_id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            eprintln!("[Codex STDERR] {}", line);
            if !line.is_empty() {
                let mut chunk = create_chunk("stderr", &session_for_stderr);
                chunk.content = Some(line);
                emit_chunk(&window_for_stderr, &chunk);
            }
        }
    });

    // Spawn stdout reader thread - drives the JSON-RPC protocol
    let window_clone = window.clone();
    let session_for_reader = session_id.clone();
    let manager = state.inner().clone();
    let stdin_for_reader = stdin.clone();
    let state_for_reader = session_state.clone();
    let ids_for_reader = next_request_id.clone();
    let mode_for_reader = mode.clone();
    let model_for_reader = model.clone();
    let cwd_for_reader = cwd.clone();
    let resume_for_reader = resume_thread_id.clone();

    std::thread::spawn(move || {
        eprintln!("[Codex] Reader thread started for session: {}", session_for_reader);
        let reader = BufReader::new(stdout);

        // Dev mode only: JSONL log of the raw protocol for debugging
        let mut log_file = if cfg!(debug_assertions) {
            let log_dir = std::env::temp_dir().join("wynter-code");
            let _ = std::fs::create_dir_all(&log_dir);
            let log_path = log_dir.join(format!("codex-{}.jsonl", session_for_reader));
            eprintln!("[Codex] JSONL log enabled: {:?}", log_path);
            std::fs::OpenOptions::new()
                .create(true)
                .write(true)
                .truncate(true)
                .open(&log_path)
                .ok()
        } else {
            None
        };

        for line in reader.lines().map_while(Result::ok) {
            if line.is_empty() {
                continue;
            }
            if let Some(ref mut file) = log_file {
                let _ = writeln!(file, "{}", line);
            }

            let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) else {
                continue;
            };

            let has_id = json.get("id").is_some();
            let method = json.get("method").and_then(|m| m.as_str());

            match (has_id, method) {
                // Server-initiated request (approvals etc.)
                (true, Some(method)) => {
                    handle_server_request(
                        &stdin_for_reader,
                        &mode_for_reader,
                        &json["id"],
                        method,
                    );
                }

                // Notification
                (false, Some(method)) => {
                    handle_notification(
                        &window_clone,
                        &session_for_reader,
                        &state_for_reader,
                        method,
                        json.get("params").unwrap_or(&serde_json::Value::Null),
                    );
                }

                // Response to one of our requests
                (true, None) => {
                    let req_id = json.get("id").and_then(|v| v.as_i64()).unwrap_or(-1);
                    let kind = {
                        let mut st = state_for_reader.lock().expect("Codex state mutex poisoned");
                        st.pending_requests.remove(&req_id)
                    };

                    if let Some(error) = json.get("error").filter(|e| !e.is_null()) {
                        let mut chunk = create_chunk("error", &session_for_reader);
                        chunk.is_error = Some(true);
                        chunk.content = error
                            .get("message")
                            .and_then(|m| m.as_str())
                            .map(String::from)
                            .or_else(|| Some(error.to_string()));
                        emit_chunk(&window_clone, &chunk);
                        continue;
                    }

                    let result = json.get("result").cloned().unwrap_or(serde_json::Value::Null);

                    match kind {
                        Some(PendingKind::Initialize) => {
                            // Complete the handshake, then open the thread
                            let _ = write_message(
                                &stdin_for_reader,
                                &serde_json::json!({ "method": "initialized" }),
                            );

                            let (approval, sandbox) = mode_to_policies(&mode_for_reader);
                            let id = ids_for_reader.fetch_add(1, Ordering::SeqCst);
                            let (method, mut params) = match resume_for_reader {
                                Some(ref tid) => (
                                    "thread/resume",
                                    serde_json::json!({ "threadId": tid }),
                                ),
                                None => ("thread/start", serde_json::json!({})),
                            };
                            params["cwd"] = serde_json::json!(cwd_for_reader);
                            params["approvalPolicy"] = serde_json::json!(approval);
                            params["sandbox"] = serde_json::json!(sandbox);
                            if let Some(ref m) = model_for_reader {
                                params["model"] = serde_json::json!(m);
                            }

                            state_for_reader
                                .lock()
                                .expect("Codex state mutex poisoned")
                                .pending_requests
                                .insert(id, PendingKind::ThreadStart);
                            let _ = write_message(
                                &stdin_for_reader,
                                &serde_json::json!({ "id": id, "method": method, "params": params }),
                            );
                        }

                        Some(PendingKind::ThreadStart) => {
                            let thread_id = result
                                .pointer("/thread/id")
                                .and_then(|v| v.as_str())
                                .map(String::from);
                            let model_name = result
                                .get("model")
                                .and_then(|v| v.as_str())
                                .map(String::from);

                            if let Some(ref tid) = thread_id {
                                eprintln!("[Codex] Thread ready: {}", tid);
                                let pending = {
                                    let mut st = state_for_reader
                                        .lock()
                                        .expect("Codex state mutex poisoned");
                                    st.thread_id = Some(tid.clone());
                                    st.pending_prompt.take()
                                };

                                let mut chunk =
                                    create_chunk("session_ready", &session_for_reader);
                                chunk.thread_id = Some(tid.clone());
                                chunk.model = model_name.clone();
                                emit_chunk(&window_clone, &chunk);

                                let mut init_chunk = create_chunk("init", &session_for_reader);
                                init_chunk.thread_id = Some(tid.clone());
                                init_chunk.model = model_name;
                                init_chunk.subtype = Some("init".to_string());
                                emit_chunk(&window_clone, &init_chunk);

                                if let Some((text, images)) = pending {
                                    let _ = send_turn_start(
                                        &stdin_for_reader,
                                        &state_for_reader,
                                        &ids_for_reader,
                                        tid,
                                        &text,
                                        &images,
                                        model_for_reader.as_deref(),
                                    );
                                }
                            } else {
                                let mut chunk = create_chunk("error", &session_for_reader);
                                chunk.is_error = Some(true);
                                chunk.content =
                                    Some("Codex thread start returned no thread id".to_string());
                                emit_chunk(&window_clone, &chunk);
                            }
                        }

                        Some(PendingKind::TurnStart) => {
                            if let Some(turn_id) =
                                result.pointer("/turn/id").and_then(|v| v.as_str())
                            {
                                let mut st = state_for_reader
                                    .lock()
                                    .expect("Codex state mutex poisoned");
                                st.current_turn_id = Some(turn_id.to_string());
                            }
                        }

                        None => {}
                    }
                }

                _ => {}
            }
        }

        // stdout EOF: the app-server process exited. If the instance is still
        // registered this was unexpected (stop_codex_session removes it first).
        let was_registered = {
            let mut instances = manager.instances.lock().expect("Process instances mutex poisoned");
            instances.remove(&session_for_reader).is_some()
        };
        eprintln!(
            "[Codex] app-server exited for session {} (registered: {})",
            session_for_reader, was_registered
        );
        if was_registered {
            let mut chunk = create_chunk("session_ended", &session_for_reader);
            chunk.content = Some("Codex app-server exited".to_string());
            emit_chunk(&window_clone, &chunk);
        }
    });

    Ok(session_id)
}

/// Send input to a Codex session as a new turn on the persistent thread
#[tauri::command]
pub async fn send_codex_input(
    state: State<'_, Arc<CodexProcessManager>>,
    session_id: String,
    input: String,
    model: Option<String>,
    images: Option<Vec<String>>,
) -> Result<(), String> {
    let (stdin, session_state, next_request_id, instance_model) = {
        let instances = state.instances.lock().expect("Process instances mutex poisoned");
        match instances.get(&session_id) {
            Some(instance) => (
                instance.stdin.clone(),
                instance.state.clone(),
                instance.next_request_id.clone(),
                instance.model.clone(),
            ),
            None => return Err("Session not found".to_string()),
        }
    };

    let text = input.trim().to_string();
    let images = images.unwrap_or_default();
    let model = model.or(instance_model);

    eprintln!(
        "[Codex] send_codex_input: session={}, input={}",
        session_id,
        &text[..std::cmp::min(100, text.len())]
    );

    let thread_id = {
        let mut st = session_state.lock().expect("Codex state mutex poisoned");
        match st.thread_id.clone() {
            Some(tid) => Some(tid),
            None => {
                // Thread not ready yet - queue the prompt; it fires once
                // thread/start completes
                st.pending_prompt = Some((text.clone(), images.clone()));
                None
            }
        }
    };

    if let Some(tid) = thread_id {
        send_turn_start(
            &stdin,
            &session_state,
            &next_request_id,
            &tid,
            &text,
            &images,
            model.as_deref(),
        )?;
    }

    Ok(())
}

/// Stop a running Codex session gracefully
#[tauri::command]
pub async fn stop_codex_session(
    window: tauri::Window,
    state: State<'_, Arc<CodexProcessManager>>,
    session_id: String,
) -> Result<(), String> {
    let instance = {
        let mut instances = state.instances.lock().expect("Process instances mutex poisoned");
        instances.remove(&session_id)
    };

    if let Some(mut instance) = instance {
        // Try to interrupt an in-flight turn before killing the process
        let (thread_id, turn_id) = {
            let st = instance.state.lock().expect("Codex state mutex poisoned");
            (st.thread_id.clone(), st.current_turn_id.clone())
        };
        if let (Some(tid), Some(turn)) = (&thread_id, &turn_id) {
            let id = instance.next_request_id.fetch_add(1, Ordering::SeqCst);
            let _ = write_message(
                &instance.stdin,
                &serde_json::json!({
                    "id": id,
                    "method": "turn/interrupt",
                    "params": { "threadId": tid, "turnId": turn }
                }),
            );
            std::thread::sleep(std::time::Duration::from_millis(200));
        }

        // Close stdin and kill the app-server
        {
            let mut guard = instance.stdin.lock().expect("Codex stdin mutex poisoned");
            drop(guard.take());
        }
        let _ = instance.child.kill();
        let _ = instance.child.wait();

        // Emit session_ended event
        let mut chunk = create_chunk("session_ended", &session_id);
        chunk.content = Some("Session stopped by user".to_string());
        chunk.thread_id = thread_id;
        emit_chunk(&window, &chunk);
    }

    Ok(())
}

/// Check if a Codex session is actively running
#[tauri::command]
pub async fn is_codex_session_active(
    state: State<'_, Arc<CodexProcessManager>>,
    session_id: String,
) -> Result<bool, String> {
    let instances = state.instances.lock().expect("Process instances mutex poisoned");
    Ok(instances.contains_key(&session_id))
}

/// Get list of all active Codex sessions
#[tauri::command]
pub async fn list_active_codex_sessions(
    state: State<'_, Arc<CodexProcessManager>>,
) -> Result<Vec<String>, String> {
    let instances = state.instances.lock().expect("Process instances mutex poisoned");
    Ok(instances.keys().cloned().collect())
}
