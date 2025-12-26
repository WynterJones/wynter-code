use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::TcpListener;
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{Emitter, State};
use tokio::sync::oneshot;
use tungstenite::{accept, Message};
use uuid::Uuid;

/// Represents a pending permission request waiting for user approval
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct McpPermissionRequest {
    pub id: String,
    pub tool_name: String,
    pub input: serde_json::Value,
    pub session_id: String,
}

/// Response to a permission request
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct McpPermissionResponse {
    pub behavior: String, // "allow" or "deny"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_input: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// Event emitted to frontend when permission is needed
#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct McpPermissionEvent {
    pub request: McpPermissionRequest,
}

/// Internal state for a pending request with its response channel
struct PendingRequest {
    #[allow(dead_code)]
    request: McpPermissionRequest,
    response_tx: Option<oneshot::Sender<McpPermissionResponse>>,
}

/// Manages the MCP permission WebSocket server and pending requests
pub struct McpPermissionManager {
    /// Map of request_id -> pending request
    pending_requests: Mutex<HashMap<String, PendingRequest>>,
    /// Currently running server port (if any)
    server_port: Mutex<Option<u16>>,
    /// Shutdown signal for the server
    shutdown_signal: Mutex<Option<Arc<Mutex<bool>>>>,
}

impl McpPermissionManager {
    pub fn new() -> Self {
        Self {
            pending_requests: Mutex::new(HashMap::new()),
            server_port: Mutex::new(None),
            shutdown_signal: Mutex::new(None),
        }
    }

    /// Get the current server port (if running)
    pub fn get_port(&self) -> Option<u16> {
        *self.server_port.lock().unwrap()
    }
}

impl Default for McpPermissionManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Start the MCP permission WebSocket server
/// Returns the port it's listening on
#[tauri::command]
pub async fn start_mcp_permission_server(
    window: tauri::Window,
    state: State<'_, Arc<McpPermissionManager>>,
    session_id: String,
) -> Result<u16, String> {
    // Check if already running
    {
        let port = state.server_port.lock().unwrap();
        if port.is_some() {
            return Ok(port.unwrap());
        }
    }

    // Find an available port
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to bind MCP permission server: {}", e))?;
    let port = listener.local_addr().unwrap().port();

    eprintln!("[MCP Permission] Starting server on port {}", port);

    // Store the port
    {
        let mut server_port = state.server_port.lock().unwrap();
        *server_port = Some(port);
    }

    // Create shutdown signal
    let shutdown = Arc::new(Mutex::new(false));
    {
        let mut signal = state.shutdown_signal.lock().unwrap();
        *signal = Some(shutdown.clone());
    }

    // Clone state for the thread
    let state_clone = state.inner().clone();
    let window_clone = window.clone();
    let session_id_clone = session_id.clone();

    // Spawn the WebSocket server thread
    thread::spawn(move || {
        eprintln!("[MCP Permission] Server thread started");

        for stream in listener.incoming() {
            // Check shutdown
            if *shutdown.lock().unwrap() {
                break;
            }

            match stream {
                Ok(stream) => {
                    eprintln!("[MCP Permission] New WebSocket connection");
                    let state = state_clone.clone();
                    let window = window_clone.clone();
                    let session_id = session_id_clone.clone();
                    let shutdown_clone = shutdown.clone();

                    thread::spawn(move || {
                        handle_mcp_connection(stream, state, window, session_id, shutdown_clone);
                    });
                }
                Err(e) => {
                    eprintln!("[MCP Permission] Connection error: {}", e);
                }
            }
        }

        eprintln!("[MCP Permission] Server thread exiting");
    });

    Ok(port)
}

/// Handle a single WebSocket connection from the MCP script
fn handle_mcp_connection(
    stream: std::net::TcpStream,
    state: Arc<McpPermissionManager>,
    window: tauri::Window,
    session_id: String,
    shutdown: Arc<Mutex<bool>>,
) {
    // Set non-blocking with timeout for shutdown checks
    stream
        .set_read_timeout(Some(std::time::Duration::from_secs(1)))
        .ok();

    let mut websocket = match accept(stream) {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("[MCP Permission] WebSocket handshake failed: {}", e);
            return;
        }
    };

    eprintln!("[MCP Permission] WebSocket connected");

    loop {
        // Check shutdown
        if *shutdown.lock().unwrap() {
            break;
        }

        match websocket.read() {
            Ok(Message::Text(text)) => {
                eprintln!("[MCP Permission] Received: {}", &text[..std::cmp::min(200, text.len())]);

                // Parse the permission request
                match serde_json::from_str::<McpPermissionRequest>(&text) {
                    Ok(mut request) => {
                        // Assign a unique ID if not provided
                        if request.id.is_empty() {
                            request.id = Uuid::new_v4().to_string();
                        }
                        request.session_id = session_id.clone();

                        let request_id = request.id.clone();

                        // Create response channel
                        let (tx, rx) = oneshot::channel();

                        // Store pending request
                        {
                            let mut pending = state.pending_requests.lock().unwrap();
                            pending.insert(
                                request_id.clone(),
                                PendingRequest {
                                    request: request.clone(),
                                    response_tx: Some(tx),
                                },
                            );
                        }

                        // Emit event to frontend
                        let event = McpPermissionEvent { request };
                        if let Err(e) = window.emit("mcp-permission-request", &event) {
                            eprintln!("[MCP Permission] Failed to emit event: {}", e);
                        }

                        // Wait for response (blocking)
                        match rx.blocking_recv() {
                            Ok(response) => {
                                eprintln!("[MCP Permission] Sending response: {:?}", response);
                                let json = serde_json::to_string(&response).unwrap();
                                if let Err(e) = websocket.send(Message::Text(json)) {
                                    eprintln!("[MCP Permission] Failed to send response: {}", e);
                                }
                            }
                            Err(e) => {
                                eprintln!("[MCP Permission] Response channel closed: {}", e);
                                // Send deny by default
                                let response = McpPermissionResponse {
                                    behavior: "deny".to_string(),
                                    updated_input: None,
                                    message: Some("Permission request cancelled".to_string()),
                                };
                                let json = serde_json::to_string(&response).unwrap();
                                let _ = websocket.send(Message::Text(json));
                            }
                        }

                        // Clean up pending request
                        {
                            let mut pending = state.pending_requests.lock().unwrap();
                            pending.remove(&request_id);
                        }
                    }
                    Err(e) => {
                        eprintln!("[MCP Permission] Failed to parse request: {}", e);
                    }
                }
            }
            Ok(Message::Close(_)) => {
                eprintln!("[MCP Permission] WebSocket closed");
                break;
            }
            Ok(_) => {
                // Ignore other message types
            }
            Err(tungstenite::Error::Io(ref e))
                if e.kind() == std::io::ErrorKind::WouldBlock
                    || e.kind() == std::io::ErrorKind::TimedOut =>
            {
                // Timeout, check shutdown and continue
                continue;
            }
            Err(e) => {
                eprintln!("[MCP Permission] WebSocket error: {}", e);
                break;
            }
        }
    }

    eprintln!("[MCP Permission] Connection handler exiting");
}

/// Respond to a permission request
#[tauri::command]
pub async fn respond_to_mcp_permission(
    state: State<'_, Arc<McpPermissionManager>>,
    request_id: String,
    approved: bool,
    updated_input: Option<serde_json::Value>,
) -> Result<(), String> {
    let mut pending = state.pending_requests.lock().unwrap();

    if let Some(mut request) = pending.remove(&request_id) {
        if let Some(tx) = request.response_tx.take() {
            let response = McpPermissionResponse {
                behavior: if approved {
                    "allow".to_string()
                } else {
                    "deny".to_string()
                },
                updated_input: if approved { updated_input } else { None },
                message: if approved {
                    None
                } else {
                    Some("User denied this operation".to_string())
                },
            };

            tx.send(response)
                .map_err(|_| "Failed to send response".to_string())?;

            Ok(())
        } else {
            Err("Response channel already used".to_string())
        }
    } else {
        Err("Request not found".to_string())
    }
}

/// Stop the MCP permission server
#[tauri::command]
pub async fn stop_mcp_permission_server(
    state: State<'_, Arc<McpPermissionManager>>,
) -> Result<(), String> {
    // Set shutdown signal
    {
        let signal = state.shutdown_signal.lock().unwrap();
        if let Some(shutdown) = signal.as_ref() {
            *shutdown.lock().unwrap() = true;
        }
    }

    // Clear port
    {
        let mut port = state.server_port.lock().unwrap();
        *port = None;
    }

    // Cancel all pending requests
    {
        let mut pending = state.pending_requests.lock().unwrap();
        for (_, request) in pending.drain() {
            if let Some(tx) = request.response_tx {
                let _ = tx.send(McpPermissionResponse {
                    behavior: "deny".to_string(),
                    updated_input: None,
                    message: Some("Server shutting down".to_string()),
                });
            }
        }
    }

    eprintln!("[MCP Permission] Server stopped");
    Ok(())
}

/// Get the current MCP permission server port
#[tauri::command]
pub async fn get_mcp_permission_port(
    state: State<'_, Arc<McpPermissionManager>>,
) -> Result<Option<u16>, String> {
    Ok(state.get_port())
}
