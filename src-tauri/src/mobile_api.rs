use axum::{
    extract::{Path, Query, State, WebSocketUpgrade},
    http::{header, Method, StatusCode},
    response::Response,
    routing::{get, patch, post},
    Json, Router,
};
use axum_extra::TypedHeader;
use headers::{authorization::Bearer, Authorization};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::sync::{broadcast, RwLock};
use tower_http::cors::{Any, CorsLayer};

use crate::beads::{BeadsIssue, BeadsStats, BeadsUpdate};

// JWT Secret - in production this should be securely generated and stored
const JWT_SECRET: &str = "wynter-code-mobile-api-secret-key-2024";

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairedDevice {
    pub device_id: String,
    pub device_name: String,
    pub paired_at: u64,
    pub last_seen: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairingCode {
    pub code: String,
    pub expires_at: u64,
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileApiInfo {
    pub running: bool,
    pub port: u16,
    pub host: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthToken {
    pub token: String,
    pub expires_at: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String, // device_id
    exp: usize,  // expiry timestamp
    iat: usize,  // issued at
}

// State updates sent via WebSocket
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum StateUpdate {
    BeadsUpdate {
        project_id: String,
        action: String,
        issue: Option<BeadsIssue>,
    },
    AutoBuildUpdate {
        project_id: String,
        status: serde_json::Value,
    },
    ChatStream {
        session_id: String,
        chunk: serde_json::Value,
    },
    ToolCall {
        session_id: String,
        tool_call: serde_json::Value,
    },
}

// ============================================================================
// App State
// ============================================================================

#[derive(Clone)]
pub struct AppState {
    paired_devices: Arc<RwLock<HashMap<String, PairedDevice>>>,
    pairing_codes: Arc<RwLock<HashMap<String, PairingCode>>>,
    state_tx: broadcast::Sender<StateUpdate>,
    jwt_secret: String,
}

impl AppState {
    pub fn new() -> Self {
        let (state_tx, _) = broadcast::channel(100);
        Self {
            paired_devices: Arc::new(RwLock::new(HashMap::new())),
            pairing_codes: Arc::new(RwLock::new(HashMap::new())),
            state_tx,
            jwt_secret: JWT_SECRET.to_string(),
        }
    }

    pub fn get_broadcast_sender(&self) -> broadcast::Sender<StateUpdate> {
        self.state_tx.clone()
    }
}

// ============================================================================
// Mobile API Manager
// ============================================================================

pub struct MobileApiManager {
    state: Arc<RwLock<Option<MobileApiState>>>,
    app_state: Arc<AppState>,
}

struct MobileApiState {
    port: u16,
    host: String,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
    mdns_service: Option<mdns_sd::ServiceDaemon>,
}

impl MobileApiManager {
    pub fn new() -> Self {
        Self {
            state: Arc::new(RwLock::new(None)),
            app_state: Arc::new(AppState::new()),
        }
    }

    pub async fn start(&self, port: Option<u16>) -> Result<MobileApiInfo, String> {
        let mut state = self.state.write().await;

        if state.is_some() {
            return Err("Mobile API server is already running".to_string());
        }

        let port = port.unwrap_or(8765);
        let host = get_local_ip().unwrap_or_else(|| "127.0.0.1".to_string());

        // Build the router
        let app = create_router(self.app_state.clone());

        // Bind to the address
        let addr: SocketAddr = format!("0.0.0.0:{}", port)
            .parse()
            .map_err(|e| format!("Invalid address: {}", e))?;

        // Create shutdown channel
        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

        // Start the server
        let server = axum::serve(
            tokio::net::TcpListener::bind(addr)
                .await
                .map_err(|e| format!("Failed to bind to port {}: {}", port, e))?,
            app,
        )
        .with_graceful_shutdown(async {
            let _ = shutdown_rx.await;
        });

        tokio::spawn(async move {
            if let Err(e) = server.await {
                eprintln!("Mobile API server error: {}", e);
            }
        });

        // Start mDNS service registration
        let mdns_service = start_mdns_service(port, &host).ok();

        *state = Some(MobileApiState {
            port,
            host: host.clone(),
            shutdown_tx: Some(shutdown_tx),
            mdns_service,
        });

        Ok(MobileApiInfo {
            running: true,
            port,
            host,
        })
    }

    pub async fn stop(&self) -> Result<(), String> {
        let mut state = self.state.write().await;

        if let Some(mut api_state) = state.take() {
            // Send shutdown signal
            if let Some(tx) = api_state.shutdown_tx.take() {
                let _ = tx.send(());
            }

            // Stop mDNS service
            if let Some(mdns) = api_state.mdns_service.take() {
                let _ = mdns.shutdown();
            }

            Ok(())
        } else {
            Err("Mobile API server is not running".to_string())
        }
    }

    pub async fn get_info(&self) -> Option<MobileApiInfo> {
        let state = self.state.read().await;
        state.as_ref().map(|s| MobileApiInfo {
            running: true,
            port: s.port,
            host: s.host.clone(),
        })
    }

    pub async fn generate_pairing_code(&self) -> Result<PairingCode, String> {
        let state = self.state.read().await;
        let api_state = state
            .as_ref()
            .ok_or("Mobile API server is not running")?;

        // Generate 6-digit numeric code for easier entry
        let code: String = (0..6)
            .map(|_| rand::thread_rng().gen_range(0..10).to_string())
            .collect();

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let pairing_code = PairingCode {
            code: code.clone(),
            expires_at: now + 300, // 5 minutes
            host: api_state.host.clone(),
            port: api_state.port,
        };

        // Store the code
        let mut codes = self.app_state.pairing_codes.write().await;
        codes.insert(code.clone(), pairing_code.clone());

        // Clean up expired codes
        codes.retain(|_, v| v.expires_at > now);

        Ok(pairing_code)
    }

    pub async fn verify_pairing(
        &self,
        code: &str,
        device_id: &str,
        device_name: &str,
    ) -> Result<AuthToken, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Validate code
        {
            let codes = self.app_state.pairing_codes.read().await;
            let pairing_code = codes.get(code).ok_or("Invalid pairing code")?;
            if pairing_code.expires_at < now {
                return Err("Pairing code has expired".to_string());
            }
        }

        // Remove used code
        {
            let mut codes = self.app_state.pairing_codes.write().await;
            codes.remove(code);
        }

        // Store paired device
        {
            let mut devices = self.app_state.paired_devices.write().await;
            devices.insert(
                device_id.to_string(),
                PairedDevice {
                    device_id: device_id.to_string(),
                    device_name: device_name.to_string(),
                    paired_at: now,
                    last_seen: now,
                },
            );
        }

        // Generate JWT token
        let claims = Claims {
            sub: device_id.to_string(),
            exp: (now + 30 * 24 * 60 * 60) as usize, // 30 days
            iat: now as usize,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.app_state.jwt_secret.as_bytes()),
        )
        .map_err(|e| format!("Failed to generate token: {}", e))?;

        Ok(AuthToken {
            token,
            expires_at: now + 30 * 24 * 60 * 60,
        })
    }

    pub async fn revoke_device(&self, device_id: &str) -> Result<(), String> {
        let mut devices = self.app_state.paired_devices.write().await;
        devices
            .remove(device_id)
            .ok_or_else(|| "Device not found".to_string())?;
        Ok(())
    }

    pub async fn list_paired_devices(&self) -> Vec<PairedDevice> {
        let devices = self.app_state.paired_devices.read().await;
        devices.values().cloned().collect()
    }

    pub fn get_broadcast_sender(&self) -> broadcast::Sender<StateUpdate> {
        self.app_state.get_broadcast_sender()
    }
}

// ============================================================================
// Router Setup
// ============================================================================

fn create_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    Router::new()
        // Public endpoints
        .route("/api/v1/ping", get(ping))
        .route("/api/v1/pair", post(pair))
        // Protected endpoints
        .route("/api/v1/workspaces", get(list_workspaces))
        .route("/api/v1/workspaces/:id/projects", get(list_workspace_projects))
        .route("/api/v1/projects/:id/beads", get(list_beads))
        .route("/api/v1/projects/:id/beads", post(create_bead))
        .route("/api/v1/projects/:id/beads/stats", get(beads_stats))
        .route("/api/v1/projects/:id/beads/:issue_id", patch(update_bead))
        .route("/api/v1/projects/:id/beads/:issue_id/close", post(close_bead))
        .route("/api/v1/projects/:id/beads/:issue_id/reopen", post(reopen_bead))
        .route("/api/v1/projects/:id/autobuild/status", get(autobuild_status))
        .route("/api/v1/projects/:id/autobuild/start", post(autobuild_start))
        .route("/api/v1/projects/:id/autobuild/pause", post(autobuild_pause))
        .route("/api/v1/projects/:id/autobuild/stop", post(autobuild_stop))
        .route("/api/v1/projects/:id/sessions", get(list_sessions))
        .route("/api/v1/projects/:id/sessions/:session_id/messages", get(get_messages))
        // WebSocket endpoint
        .route("/api/v1/ws", get(websocket_handler))
        .layer(cors)
        .with_state(state)
}

// ============================================================================
// Handlers
// ============================================================================

#[derive(Serialize)]
struct PingResponse {
    status: &'static str,
    version: &'static str,
    name: &'static str,
}

async fn ping() -> Json<PingResponse> {
    Json(PingResponse {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
        name: "wynter-code",
    })
}

#[derive(Deserialize)]
struct PairRequest {
    code: String,
    device_id: String,
    device_name: String,
}

async fn pair(
    State(state): State<Arc<AppState>>,
    Json(req): Json<PairRequest>,
) -> Result<Json<AuthToken>, (StatusCode, String)> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Validate code
    let codes = state.pairing_codes.read().await;
    let pairing_code = codes
        .get(&req.code)
        .ok_or((StatusCode::UNAUTHORIZED, "Invalid pairing code".to_string()))?;
    if pairing_code.expires_at < now {
        return Err((StatusCode::UNAUTHORIZED, "Pairing code has expired".to_string()));
    }
    drop(codes);

    // Remove used code
    let mut codes = state.pairing_codes.write().await;
    codes.remove(&req.code);
    drop(codes);

    // Store paired device
    let mut devices = state.paired_devices.write().await;
    devices.insert(
        req.device_id.clone(),
        PairedDevice {
            device_id: req.device_id.clone(),
            device_name: req.device_name.clone(),
            paired_at: now,
            last_seen: now,
        },
    );
    drop(devices);

    // Generate JWT token
    let claims = Claims {
        sub: req.device_id.clone(),
        exp: (now + 30 * 24 * 60 * 60) as usize, // 30 days
        iat: now as usize,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to generate token: {}", e)))?;

    Ok(Json(AuthToken {
        token,
        expires_at: now + 30 * 24 * 60 * 60,
    }))
}

// Auth extractor helper
async fn validate_token(
    state: &AppState,
    auth_header: Option<TypedHeader<Authorization<Bearer>>>,
) -> Result<String, (StatusCode, String)> {
    let token = auth_header
        .ok_or((StatusCode::UNAUTHORIZED, "Missing authorization header".to_string()))?
        .token()
        .to_string();

    let token_data = decode::<Claims>(
        &token,
        &DecodingKey::from_secret(state.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;

    // Update last seen
    let mut devices = state.paired_devices.write().await;
    if let Some(device) = devices.get_mut(&token_data.claims.sub) {
        device.last_seen = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
    }

    Ok(token_data.claims.sub)
}

// Placeholder handlers - these will need to communicate with the frontend
// via Tauri's event system or shared state

#[derive(Serialize)]
struct Workspace {
    id: String,
    name: String,
    color: String,
    project_ids: Vec<String>,
}

#[derive(Serialize)]
struct Project {
    id: String,
    name: String,
    path: String,
    color: Option<String>,
}

async fn list_workspaces(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
) -> Result<Json<Vec<Workspace>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;
    // TODO: Fetch actual workspaces from frontend state
    // For now return empty array - will be connected via Tauri events
    Ok(Json(vec![]))
}

async fn list_workspace_projects(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(workspace_id): Path<String>,
) -> Result<Json<Vec<Project>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;
    // TODO: Fetch actual projects from frontend state
    Ok(Json(vec![]))
}

#[derive(Deserialize)]
struct BeadsQuery {
    project_path: String,
}

async fn list_beads(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
    Query(query): Query<BeadsQuery>,
) -> Result<Json<Vec<BeadsIssue>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Call the beads module directly
    crate::beads::beads_list(query.project_path)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

async fn beads_stats(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
    Query(query): Query<BeadsQuery>,
) -> Result<Json<BeadsStats>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    crate::beads::beads_stats(query.project_path)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

#[derive(Deserialize)]
struct CreateBeadRequest {
    project_path: String,
    title: String,
    issue_type: String,
    priority: u8,
    description: Option<String>,
}

async fn create_bead(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
    Json(req): Json<CreateBeadRequest>,
) -> Result<Json<String>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    crate::beads::beads_create(
        req.project_path,
        req.title,
        req.issue_type,
        req.priority,
        req.description,
    )
    .await
    .map(Json)
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

#[derive(Deserialize)]
struct UpdateBeadRequest {
    project_path: String,
    #[serde(flatten)]
    updates: BeadsUpdate,
}

async fn update_bead(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path((project_id, issue_id)): Path<(String, String)>,
    Json(req): Json<UpdateBeadRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    crate::beads::beads_update(req.project_path, issue_id, req.updates)
        .await
        .map(|_| StatusCode::OK)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

#[derive(Deserialize)]
struct CloseBeadRequest {
    project_path: String,
    reason: String,
}

async fn close_bead(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path((project_id, issue_id)): Path<(String, String)>,
    Json(req): Json<CloseBeadRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    crate::beads::beads_close(req.project_path, issue_id, req.reason)
        .await
        .map(|_| StatusCode::OK)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

#[derive(Deserialize)]
struct ReopenBeadRequest {
    project_path: String,
}

async fn reopen_bead(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path((project_id, issue_id)): Path<(String, String)>,
    Json(req): Json<ReopenBeadRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    crate::beads::beads_reopen(req.project_path, issue_id)
        .await
        .map(|_| StatusCode::OK)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

// Auto-build placeholders
async fn autobuild_status(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    validate_token(&state, auth).await?;
    // TODO: Connect to auto-build store
    Ok(Json(serde_json::json!({
        "status": "idle",
        "workers": [],
        "queue": []
    })))
}

async fn autobuild_start(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;
    // TODO: Trigger auto-build start via Tauri events
    Ok(StatusCode::ACCEPTED)
}

async fn autobuild_pause(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;
    // TODO: Trigger auto-build pause via Tauri events
    Ok(StatusCode::ACCEPTED)
}

async fn autobuild_stop(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;
    // TODO: Trigger auto-build stop via Tauri events
    Ok(StatusCode::ACCEPTED)
}

// Session placeholders
#[derive(Serialize)]
struct Session {
    id: String,
    name: String,
    provider: String,
    model: String,
    created_at: String,
}

async fn list_sessions(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
) -> Result<Json<Vec<Session>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;
    // TODO: Connect to session store
    Ok(Json(vec![]))
}

#[derive(Serialize)]
struct Message {
    id: String,
    role: String,
    content: String,
    created_at: String,
}

async fn get_messages(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path((project_id, session_id)): Path<(String, String)>,
) -> Result<Json<Vec<Message>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;
    // TODO: Connect to message store
    Ok(Json(vec![]))
}

// WebSocket handler
async fn websocket_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
    ws: WebSocketUpgrade,
) -> Result<Response, (StatusCode, String)> {
    // Validate token from query params
    let token = params
        .get("token")
        .ok_or((StatusCode::UNAUTHORIZED, "Missing token".to_string()))?;

    let _token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;

    let rx = state.state_tx.subscribe();

    Ok(ws.on_upgrade(move |socket| handle_websocket(socket, rx)))
}

async fn handle_websocket(
    mut socket: axum::extract::ws::WebSocket,
    mut rx: broadcast::Receiver<StateUpdate>,
) {
    use axum::extract::ws::Message;

    loop {
        tokio::select! {
            // Receive updates from broadcast channel and send to client
            result = rx.recv() => {
                match result {
                    Ok(update) => {
                        let json = serde_json::to_string(&update).unwrap();
                        if socket.send(Message::Text(json.into())).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => {
                        // Client is too slow, skip messages
                        continue;
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        break;
                    }
                }
            }
            // Handle incoming messages from client
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        // Parse and handle client commands
                        if let Ok(cmd) = serde_json::from_str::<serde_json::Value>(&text) {
                            match cmd.get("type").and_then(|t| t.as_str()) {
                                Some("subscribe_project") => {
                                    // TODO: Handle project subscription
                                }
                                Some("chat_send") => {
                                    // TODO: Forward to chat service
                                }
                                Some("tool_approve") | Some("tool_reject") => {
                                    // TODO: Forward to permission handler
                                }
                                _ => {}
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        break;
                    }
                    _ => {}
                }
            }
        }
    }
}

// ============================================================================
// mDNS Service
// ============================================================================

fn start_mdns_service(port: u16, host: &str) -> Result<mdns_sd::ServiceDaemon, String> {
    let mdns = mdns_sd::ServiceDaemon::new().map_err(|e| format!("Failed to create mDNS daemon: {}", e))?;

    let service_type = "_wynter-code._tcp.local.";
    let instance_name = format!("wynter-code-{}", &host[..8.min(host.len())]);

    let mut properties = HashMap::new();
    properties.insert("version".to_string(), env!("CARGO_PKG_VERSION").to_string());
    properties.insert("name".to_string(), "Wynter Code".to_string());

    let service_info = mdns_sd::ServiceInfo::new(
        service_type,
        &instance_name,
        host,
        (),
        port,
        properties,
    )
    .map_err(|e| format!("Failed to create service info: {}", e))?;

    mdns.register(service_info)
        .map_err(|e| format!("Failed to register mDNS service: {}", e))?;

    Ok(mdns)
}

// ============================================================================
// Utility Functions
// ============================================================================

fn get_local_ip() -> Option<String> {
    local_ip_address::local_ip()
        .ok()
        .map(|ip| ip.to_string())
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub async fn mobile_api_start(
    manager: tauri::State<'_, Arc<MobileApiManager>>,
    port: Option<u16>,
) -> Result<MobileApiInfo, String> {
    manager.start(port).await
}

#[tauri::command]
pub async fn mobile_api_stop(
    manager: tauri::State<'_, Arc<MobileApiManager>>,
) -> Result<(), String> {
    manager.stop().await
}

#[tauri::command]
pub async fn mobile_api_info(
    manager: tauri::State<'_, Arc<MobileApiManager>>,
) -> Result<Option<MobileApiInfo>, String> {
    Ok(manager.get_info().await)
}

#[tauri::command]
pub async fn mobile_api_generate_pairing_code(
    manager: tauri::State<'_, Arc<MobileApiManager>>,
) -> Result<PairingCode, String> {
    manager.generate_pairing_code().await
}

#[tauri::command]
pub async fn mobile_api_verify_pairing(
    manager: tauri::State<'_, Arc<MobileApiManager>>,
    code: String,
    device_id: String,
    device_name: String,
) -> Result<AuthToken, String> {
    manager.verify_pairing(&code, &device_id, &device_name).await
}

#[tauri::command]
pub async fn mobile_api_revoke_device(
    manager: tauri::State<'_, Arc<MobileApiManager>>,
    device_id: String,
) -> Result<(), String> {
    manager.revoke_device(&device_id).await
}

#[tauri::command]
pub async fn mobile_api_list_devices(
    manager: tauri::State<'_, Arc<MobileApiManager>>,
) -> Result<Vec<PairedDevice>, String> {
    Ok(manager.list_paired_devices().await)
}
