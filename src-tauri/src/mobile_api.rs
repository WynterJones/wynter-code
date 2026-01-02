use axum::{
    body::Body,
    extract::{Path, Query, State, WebSocketUpgrade},
    http::{header, Method, StatusCode},
    response::{IntoResponse, Response, Sse},
    routing::{get, patch, post},
    Json, Router,
};
use tokio_stream::wrappers::ReceiverStream;
use axum_extra::TypedHeader;
use headers::{authorization::Bearer, Authorization};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    io::{BufRead, BufReader, Write},
    net::SocketAddr,
    process::{Child, ChildStdin, Command, Stdio},
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::sync::{broadcast, RwLock};
use tower_http::cors::{Any, CorsLayer};
use tower_http::set_header::SetResponseHeaderLayer;

use crate::beads::{BeadsIssue, BeadsStats, BeadsUpdate};
use crate::live_preview::{PreviewManager, PreviewStatus as LivePreviewStatus};
use crate::process_registry::ProcessRegistry;
use crate::rate_limiter::check_mobile_auth_limit;
use crate::tunnel::TunnelManager;
use crate::path_utils::get_enhanced_path;

// ============================================================================
// JWT Secret Management (Secure Storage)
// ============================================================================

/// Get or generate a secure JWT secret
/// The secret is stored in the app's data directory with restricted permissions
fn get_or_create_jwt_secret() -> String {
    use std::fs;
    use std::io::Write;
    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;

    // Use ~/.wynter-code for storing secrets
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let secret_dir = std::path::Path::new(&home).join(".wynter-code");
    let secret_file = secret_dir.join(".jwt_secret");

    // Try to read existing secret
    if let Ok(existing_secret) = fs::read_to_string(&secret_file) {
        let trimmed = existing_secret.trim();
        // Validate it's a proper secret (64 hex chars = 32 bytes)
        if trimmed.len() == 64 && trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
            return trimmed.to_string();
        }
    }

    // Generate new cryptographically secure secret (32 bytes = 256 bits)
    let mut secret_bytes = [0u8; 32];
    rand::Rng::fill(&mut rand::thread_rng(), &mut secret_bytes);
    let new_secret: String = secret_bytes.iter().map(|b| format!("{:02x}", b)).collect();

    // Create directory if needed
    if let Err(e) = fs::create_dir_all(&secret_dir) {
        eprintln!("Warning: Could not create secret directory: {}", e);
        return new_secret; // Use ephemeral secret if we can't persist
    }

    // Set directory permissions to 700 (owner only) on Unix
    #[cfg(unix)]
    {
        let _ = fs::set_permissions(&secret_dir, fs::Permissions::from_mode(0o700));
    }

    // Write secret to file
    if let Ok(mut file) = fs::File::create(&secret_file) {
        let _ = file.write_all(new_secret.as_bytes());

        // Set file permissions to 600 (owner read/write only) on Unix
        #[cfg(unix)]
        {
            let _ = fs::set_permissions(&secret_file, fs::Permissions::from_mode(0o600));
        }
    }

    new_secret
}

// Lazy-initialized JWT secret (generated at first run, stored in ~/.wynter-code/.jwt_secret)
lazy_static::lazy_static! {
    static ref JWT_SECRET: String = get_or_create_jwt_secret();
}

/// Get the relay internal token from relay_config.json
/// This allows relay-forwarded requests to bypass JWT auth
fn get_relay_internal_token() -> Option<String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let config_path = std::path::Path::new(&home)
        .join(".wynter-code")
        .join("relay_config.json");

    if !config_path.exists() {
        return None;
    }

    let content = std::fs::read_to_string(&config_path).ok()?;
    let config: serde_json::Value = serde_json::from_str(&content).ok()?;
    config.get("peer_token")?.as_str().map(|s| s.to_string())
}

// ============================================================================
// Paired Device Persistence
// ============================================================================

/// Get the path to the paired devices persistence file
fn get_paired_devices_path() -> std::path::PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    std::path::Path::new(&home).join(".wynter-code").join("paired_devices.json")
}

/// Load paired devices from disk
/// Returns empty HashMap if file doesn't exist or is invalid
fn load_paired_devices() -> HashMap<String, PairedDevice> {
    use std::fs;

    let path = get_paired_devices_path();

    match fs::read_to_string(&path) {
        Ok(content) => {
            match serde_json::from_str::<HashMap<String, PairedDevice>>(&content) {
                Ok(devices) => {
                    println!("[mobile_api] Loaded {} paired devices from disk", devices.len());
                    devices
                }
                Err(e) => {
                    eprintln!("[mobile_api] Failed to parse paired devices file: {}", e);
                    HashMap::new()
                }
            }
        }
        Err(_) => {
            // File doesn't exist yet - this is normal on first run
            HashMap::new()
        }
    }
}

/// Save paired devices to disk
/// Uses proper file permissions for security
fn save_paired_devices(devices: &HashMap<String, PairedDevice>) {
    use std::fs;
    use std::io::Write;
    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;

    let path = get_paired_devices_path();

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            eprintln!("[mobile_api] Failed to create directory for paired devices: {}", e);
            return;
        }

        // Set directory permissions to 700 (owner only) on Unix
        #[cfg(unix)]
        {
            let _ = fs::set_permissions(parent, fs::Permissions::from_mode(0o700));
        }
    }

    // Serialize devices
    let content = match serde_json::to_string_pretty(devices) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[mobile_api] Failed to serialize paired devices: {}", e);
            return;
        }
    };

    // Write to file
    if let Ok(mut file) = fs::File::create(&path) {
        if let Err(e) = file.write_all(content.as_bytes()) {
            eprintln!("[mobile_api] Failed to write paired devices file: {}", e);
            return;
        }

        // Set file permissions to 600 (owner read/write only) on Unix
        #[cfg(unix)]
        {
            let _ = fs::set_permissions(&path, fs::Permissions::from_mode(0o600));
        }

        println!("[mobile_api] Saved {} paired devices to disk", devices.len());
    } else {
        eprintln!("[mobile_api] Failed to create paired devices file");
    }
}

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
    AutoBuildAddToQueue {
        project_id: String,
        issue_id: String,
    },
    ChatStream {
        session_id: String,
        chunk: serde_json::Value,
    },
    ToolCall {
        session_id: String,
        tool_call: serde_json::Value,
    },
    WorkspaceUpdate {
        action: String, // "created" | "updated" | "deleted"
        workspace: Option<SyncedWorkspace>,
        workspace_id: Option<String>,
    },
    ProjectUpdate {
        action: String, // "created" | "updated" | "deleted"
        project: Option<SyncedProject>,
        project_id: Option<String>,
        workspace_id: Option<String>,
    },
    TerminalOutput {
        pty_id: String,
        data: String,
    },
    SubscriptionUpdate {
        action: String, // "created" | "updated" | "deleted"
        subscription: Option<SyncedSubscription>,
        subscription_id: Option<String>,
    },
    SubscriptionCategoryUpdate {
        action: String, // "created" | "updated" | "deleted"
        category: Option<SyncedSubscriptionCategory>,
        category_id: Option<String>,
    },
    BookmarkUpdate {
        action: String, // "created" | "updated" | "deleted"
        bookmark: Option<SyncedBookmark>,
        bookmark_id: Option<String>,
    },
    BookmarkCollectionUpdate {
        action: String, // "created" | "updated" | "deleted"
        collection: Option<SyncedBookmarkCollection>,
        collection_id: Option<String>,
    },
    KanbanUpdate {
        workspace_id: String,
        action: String, // "created" | "updated" | "deleted" | "moved"
        task: Option<SyncedKanbanTask>,
        task_id: Option<String>,
    },
    PreviewUpdate {
        server_id: String,
        action: String, // "started" | "ready" | "stopped" | "error"
        server: Option<PreviewServerWs>,
    },
    TunnelUpdate {
        tunnel_id: String,
        action: String, // "starting" | "connected" | "stopped" | "error"
        tunnel: Option<TunnelInfoWs>,
    },
}

// WebSocket-compatible preview server info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewServerWs {
    pub server_id: String,
    pub project_path: String,
    pub project_type: String,
    pub port: u16,
    pub url: String,
    pub local_url: Option<String>,
    pub status: String,
    pub is_framework_server: bool,
    pub started_at: i64,
}

// WebSocket-compatible tunnel info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TunnelInfoWs {
    pub tunnel_id: String,
    pub port: u16,
    pub url: Option<String>,
    pub status: String,
    pub created_at: i64,
}

// ============================================================================
// Synced Workspace/Project Data (from frontend)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncedWorkspace {
    pub id: String,
    pub name: String,
    pub color: String,
    pub project_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncedProject {
    pub id: String,
    pub name: String,
    pub path: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SyncedData {
    pub workspaces: Vec<SyncedWorkspace>,
    pub projects: Vec<SyncedProject>,
    pub overwatch_services: Vec<SyncedOverwatchService>,
    pub subscriptions: Vec<SyncedSubscription>,
    pub subscription_categories: Vec<SyncedSubscriptionCategory>,
    pub bookmarks: Vec<SyncedBookmark>,
    pub bookmark_collections: Vec<SyncedBookmarkCollection>,
    pub kanban_boards: Vec<SyncedKanbanBoard>,
}

// ============================================================================
// Overwatch Service Data
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncedOverwatchService {
    pub id: String,
    pub workspace_id: String,
    pub provider: String, // "railway" | "plausible" | "netlify" | "sentry" | "link"
    pub name: String,
    pub external_url: Option<String>,
    pub status: Option<String>, // "healthy" | "degraded" | "down" | "unknown"
    pub link_icon: Option<String>,
    pub link_color: Option<String>,
    pub enabled: bool,
    pub sort_order: i32,
    // Provider-specific metrics (flattened for simplicity)
    pub metrics: Option<serde_json::Value>,
    pub last_updated: Option<u64>,
    pub error: Option<String>,
}

// ============================================================================
// Subscription Data
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncedSubscription {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub url: Option<String>,
    pub favicon_url: Option<String>,
    pub monthly_cost: f64,
    pub billing_cycle: String, // "monthly" | "yearly" | "quarterly" | "weekly" | "one-time"
    pub currency: String,
    pub category_id: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncedSubscriptionCategory {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub color: Option<String>,
    pub sort_order: i32,
}

// ============================================================================
// Bookmark Data
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncedBookmark {
    pub id: String,
    pub url: String,
    pub title: String,
    pub description: Option<String>,
    pub favicon_url: Option<String>,
    pub collection_id: Option<String>,
    pub order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncedBookmarkCollection {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub order: i32,
}

// ============================================================================
// Kanban Board Data
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncedKanbanTask {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,  // "backlog" | "doing" | "mvp" | "polished"
    pub priority: u8,    // 0-4
    pub created_at: u64,
    pub updated_at: u64,
    pub order: i32,
    pub locked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncedKanbanBoard {
    pub workspace_id: String,
    pub tasks: Vec<SyncedKanbanTask>,
}

// ============================================================================
// Mobile CLI Session Management
// ============================================================================

/// Represents a running CLI process for mobile chat
#[allow(dead_code)]
struct MobileCLISession {
    child: Child,
    stdin: Option<ChildStdin>,
    session_id: String,
    provider: String,
    cwd: String,
}

/// Manages mobile CLI sessions
#[allow(dead_code)]
pub struct MobileCLIManager {
    sessions: std::sync::Mutex<HashMap<String, MobileCLISession>>,
}

impl MobileCLIManager {
    pub fn new() -> Self {
        Self {
            sessions: std::sync::Mutex::new(HashMap::new()),
        }
    }
}

impl Default for MobileCLIManager {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// App State
// ============================================================================

#[derive(Clone)]
pub struct AppState {
    paired_devices: Arc<RwLock<HashMap<String, PairedDevice>>>,
    pairing_codes: Arc<RwLock<HashMap<String, PairingCode>>>,
    synced_data: Arc<RwLock<SyncedData>>,
    state_tx: broadcast::Sender<StateUpdate>,
    jwt_secret: String,
    app_handle: Arc<RwLock<Option<tauri::AppHandle>>>,
    netlify_token: Arc<RwLock<Option<String>>>,
    mobile_cli_manager: Arc<MobileCLIManager>,
    // Note: Preview and Tunnel managers are accessed via app_handle.state() to use the
    // same instances as the desktop UI, ensuring shared state between mobile and desktop
}

impl AppState {
    pub fn new() -> Self {
        let (state_tx, _) = broadcast::channel(100);
        Self {
            // Load persisted paired devices from disk (survives app restart)
            paired_devices: Arc::new(RwLock::new(load_paired_devices())),
            pairing_codes: Arc::new(RwLock::new(HashMap::new())),
            synced_data: Arc::new(RwLock::new(SyncedData::default())),
            state_tx,
            jwt_secret: JWT_SECRET.to_string(),
            app_handle: Arc::new(RwLock::new(None)),
            netlify_token: Arc::new(RwLock::new(None)),
            mobile_cli_manager: Arc::new(MobileCLIManager::new()),
        }
    }

    pub async fn set_app_handle(&self, handle: tauri::AppHandle) {
        let mut app_handle = self.app_handle.write().await;
        *app_handle = Some(handle);
    }

    pub async fn emit_event<S: serde::Serialize + Clone>(&self, event: &str, payload: S) {
        use tauri::Emitter;
        if let Some(handle) = self.app_handle.read().await.as_ref() {
            #[cfg(debug_assertions)]
            if let Err(e) = handle.emit(event, payload.clone()) {
                eprintln!("[DEBUG] Failed to emit '{}': {}", event, e);
            }
            #[cfg(not(debug_assertions))]
            let _ = handle.emit(event, payload);
        }
    }

    #[allow(dead_code)]
    pub fn get_broadcast_sender(&self) -> broadcast::Sender<StateUpdate> {
        self.state_tx.clone()
    }

    pub async fn sync_workspace_data(&self, data: SyncedData) {
        let mut synced = self.synced_data.write().await;
        *synced = data;
    }

    pub async fn get_synced_data(&self) -> SyncedData {
        self.synced_data.read().await.clone()
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

    /// Sync the Netlify token from the desktop app's settings to the mobile API
    pub async fn sync_netlify_token(&self, token: Option<String>) {
        let mut netlify_token = self.app_state.netlify_token.write().await;
        *netlify_token = token;
    }

    /// Get the current Netlify token
    #[allow(dead_code)]
    pub async fn get_netlify_token(&self) -> Option<String> {
        self.app_state.netlify_token.read().await.clone()
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

        // Start the server with ConnectInfo to enable IP-based rate limiting
        let listener = tokio::net::TcpListener::bind(addr)
            .await
            .map_err(|e| format!("Failed to bind to port {}: {}", port, e))?;

        let server = axum::serve(
            listener,
            app.into_make_service_with_connect_info::<SocketAddr>(),
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

        // Store paired device and persist to disk
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
            // Persist to disk so device survives app restart
            save_paired_devices(&devices);
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
        // Persist removal to disk
        save_paired_devices(&devices);
        Ok(())
    }

    pub async fn list_paired_devices(&self) -> Vec<PairedDevice> {
        let devices = self.app_state.paired_devices.read().await;
        devices.values().cloned().collect()
    }

    #[allow(dead_code)]
    pub fn get_broadcast_sender(&self) -> broadcast::Sender<StateUpdate> {
        self.app_state.get_broadcast_sender()
    }

    /// Sync workspace and project data from the frontend
    pub async fn sync_workspace_data(&self, data: SyncedData) {
        self.app_state.sync_workspace_data(data).await;
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

    // Security headers to protect against common attacks
    let x_content_type_options = SetResponseHeaderLayer::overriding(
        header::X_CONTENT_TYPE_OPTIONS,
        header::HeaderValue::from_static("nosniff"),
    );
    let x_frame_options = SetResponseHeaderLayer::overriding(
        header::X_FRAME_OPTIONS,
        header::HeaderValue::from_static("DENY"),
    );
    let x_xss_protection = SetResponseHeaderLayer::overriding(
        header::HeaderName::from_static("x-xss-protection"),
        header::HeaderValue::from_static("1; mode=block"),
    );

    Router::new()
        // Public endpoints
        .route("/api/v1/ping", get(ping))
        .route("/api/v1/pair", post(pair))
        // Farmwork standalone endpoints
        .route("/farmwork", get(farmwork_index))
        .route("/farmwork/", get(farmwork_index))
        .route("/farmwork/*path", get(farmwork_assets))
        .route("/api/v1/farmwork/stats", get(farmwork_stats))
        .route("/api/v1/farmwork/activity", get(farmwork_activity))
        .route("/api/v1/farmwork/check", get(farmwork_check))
        // Protected endpoints - Workspaces CRUD
        .route("/api/v1/workspaces", get(list_workspaces))
        .route("/api/v1/workspaces", post(create_workspace))
        .route("/api/v1/workspaces/:id", patch(update_workspace))
        .route("/api/v1/workspaces/:id", axum::routing::delete(delete_workspace))
        .route("/api/v1/workspaces/:id/projects", get(list_workspace_projects))
        .route("/api/v1/workspaces/:id/projects", post(create_project))
        // Protected endpoints - Projects CRUD
        .route("/api/v1/projects/:id", patch(update_project))
        .route("/api/v1/projects/:id", axum::routing::delete(delete_project))
        // Netlify API
        .route("/api/v1/netlify/auth", post(netlify_set_token))
        .route("/api/v1/netlify/auth", get(netlify_check_auth))
        .route("/api/v1/netlify/sites", get(netlify_list_sites))
        .route("/api/v1/netlify/sites", post(netlify_create_site_api))
        .route("/api/v1/netlify/sites/:site_id/deploys", get(netlify_list_deploys))
        .route("/api/v1/netlify/deploy", post(netlify_deploy_project))
        .route("/api/v1/netlify/rollback", post(netlify_rollback_api))
        // Beads
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
        .route("/api/v1/projects/:id/autobuild/queue", post(autobuild_add_to_queue))
        .route("/api/v1/projects/:id/autobuild/queue/:issue_id", axum::routing::delete(autobuild_remove_from_queue))
        // Auto Build Backlog (persistent)
        .route("/api/v1/projects/:id/autobuild/backlog", get(autobuild_get_backlog))
        .route("/api/v1/projects/:id/sessions", get(list_sessions))
        .route("/api/v1/projects/:id/sessions/:session_id/messages", get(get_messages))
        // Mobile chat endpoint (streaming)
        .route("/api/v1/mobile/chat", post(mobile_chat))
        // Overwatch (read-only from synced data)
        .route("/api/v1/overwatch", get(list_overwatch_services))
        // Subscriptions CRUD
        .route("/api/v1/subscriptions", get(list_subscriptions))
        .route("/api/v1/subscriptions", post(create_subscription))
        .route("/api/v1/subscriptions/:id", get(get_subscription))
        .route("/api/v1/subscriptions/:id", patch(update_subscription))
        .route("/api/v1/subscriptions/:id", axum::routing::delete(delete_subscription))
        // Subscription Categories CRUD
        .route("/api/v1/subscriptions/categories", post(create_subscription_category))
        .route("/api/v1/subscriptions/categories/:id", patch(update_subscription_category))
        .route("/api/v1/subscriptions/categories/:id", axum::routing::delete(delete_subscription_category))
        // Bookmarks CRUD
        .route("/api/v1/bookmarks", get(list_bookmarks))
        .route("/api/v1/bookmarks", post(create_bookmark))
        .route("/api/v1/bookmarks/:id", get(get_bookmark))
        .route("/api/v1/bookmarks/:id", patch(update_bookmark))
        .route("/api/v1/bookmarks/:id", axum::routing::delete(delete_bookmark))
        // Bookmark Collections CRUD
        .route("/api/v1/bookmarks/collections", post(create_bookmark_collection))
        .route("/api/v1/bookmarks/collections/:id", patch(update_bookmark_collection))
        .route("/api/v1/bookmarks/collections/:id", axum::routing::delete(delete_bookmark_collection))
        // Kanban Board CRUD
        .route("/api/v1/kanban/:workspace_id", get(list_kanban_tasks))
        .route("/api/v1/kanban/:workspace_id/tasks", post(create_kanban_task))
        .route("/api/v1/kanban/:workspace_id/tasks/:task_id", patch(update_kanban_task))
        .route("/api/v1/kanban/:workspace_id/tasks/:task_id", axum::routing::delete(delete_kanban_task))
        .route("/api/v1/kanban/:workspace_id/tasks/:task_id/move", post(move_kanban_task))
        // Docs endpoints - list and view markdown files
        .route("/api/v1/docs/list", get(docs_list))
        .route("/api/v1/docs/content", get(docs_content))
        .route("/api/v1/docs/save", post(docs_save))
        // Live Preview endpoints
        .route("/api/v1/preview/detect", get(preview_detect))
        .route("/api/v1/preview/start", post(preview_start))
        .route("/api/v1/preview/stop", post(preview_stop))
        .route("/api/v1/preview/status", get(preview_status))
        .route("/api/v1/preview/list", get(preview_list))
        // Tunnel endpoints
        .route("/api/v1/tunnel/check", get(tunnel_check))
        .route("/api/v1/tunnel/start", post(tunnel_start))
        .route("/api/v1/tunnel/stop", post(tunnel_stop))
        .route("/api/v1/tunnel/list", get(tunnel_list))
        // Templates endpoints
        .route("/api/v1/templates", get(templates_list))
        // Filesystem endpoints
        .route("/api/v1/filesystem/browse", get(filesystem_browse))
        .route("/api/v1/filesystem/mkdir", post(filesystem_mkdir))
        .route("/api/v1/filesystem/homedir", get(filesystem_homedir))
        // Terminal/PTY endpoints
        .route("/api/v1/terminal/create", post(terminal_create))
        .route("/api/v1/terminal/:id/write", post(terminal_write))
        .route("/api/v1/terminal/:id", axum::routing::delete(terminal_close))
        // WebSocket endpoint
        .route("/api/v1/ws", get(websocket_handler))
        // Apply security headers
        .layer(x_content_type_options)
        .layer(x_frame_options)
        .layer(x_xss_protection)
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
    axum::extract::ConnectInfo(addr): axum::extract::ConnectInfo<SocketAddr>,
    State(state): State<Arc<AppState>>,
    Json(req): Json<PairRequest>,
) -> Result<Json<AuthToken>, (StatusCode, String)> {
    // Rate limiting: prevent brute-force pairing attempts
    // Use client IP address for rate limiting
    let client_id = addr.ip().to_string();
    if let Err(e) = check_mobile_auth_limit(&client_id) {
        return Err((StatusCode::TOO_MANY_REQUESTS, e));
    }

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

    // Check if this is a relay-internal request
    // The relay token is not a JWT, so we handle it separately
    if let Some(relay_token) = get_relay_internal_token() {
        if token == relay_token {
            // Relay-forwarded request - bypass JWT validation
            // Return a pseudo device ID for relay requests
            return Ok("relay-internal".to_string());
        }
    }

    let token_data = decode::<Claims>(
        &token,
        &DecodingKey::from_secret(state.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Update last seen, or auto-register device if token is valid but device not in list
    // This handles the case where persistence file was lost but mobile still has valid token
    let mut devices = state.paired_devices.write().await;
    if let Some(device) = devices.get_mut(&token_data.claims.sub) {
        device.last_seen = now;
    } else {
        // Device not found but token is valid - auto-register for seamless reconnection
        let device_id = token_data.claims.sub.clone();
        devices.insert(
            device_id.clone(),
            PairedDevice {
                device_id,
                device_name: "Restored Device".to_string(),
                paired_at: token_data.claims.iat as u64,
                last_seen: now,
            },
        );
        // Persist the restored device
        save_paired_devices(&devices);
        println!("[mobile_api] Auto-registered device from valid token: {}", token_data.claims.sub);
    }

    Ok(token_data.claims.sub)
}

// Response types for mobile API

#[derive(Serialize)]
struct WorkspaceWithProjects {
    id: String,
    name: String,
    path: String,
    projects: Vec<ProjectResponse>,
}

#[derive(Serialize, Clone)]
struct ProjectResponse {
    id: String,
    name: String,
    path: String,
    #[serde(rename = "workspaceId")]
    workspace_id: String,
    #[serde(rename = "lastOpened", skip_serializing_if = "Option::is_none")]
    last_opened: Option<String>,
}

async fn list_workspaces(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
) -> Result<Json<Vec<WorkspaceWithProjects>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let synced = state.get_synced_data().await;

    println!("[mobile_api] list_workspaces called - synced data has {} workspaces, {} projects",
        synced.workspaces.len(), synced.projects.len());

    // Build workspace responses with embedded projects
    let workspaces: Vec<WorkspaceWithProjects> = synced
        .workspaces
        .iter()
        .map(|ws| {
            // Find all projects that belong to this workspace
            let projects: Vec<ProjectResponse> = ws
                .project_ids
                .iter()
                .filter_map(|pid| {
                    synced.projects.iter().find(|p| &p.id == pid).map(|p| ProjectResponse {
                        id: p.id.clone(),
                        name: p.name.clone(),
                        path: p.path.clone(),
                        workspace_id: ws.id.clone(),
                        last_opened: None,
                    })
                })
                .collect();

            WorkspaceWithProjects {
                id: ws.id.clone(),
                name: ws.name.clone(),
                path: ws.name.clone(), // Use name as path for display
                projects,
            }
        })
        .collect();

    Ok(Json(workspaces))
}

async fn list_workspace_projects(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(workspace_id): Path<String>,
) -> Result<Json<Vec<ProjectResponse>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let synced = state.get_synced_data().await;

    // Find the workspace
    let workspace = synced
        .workspaces
        .iter()
        .find(|ws| ws.id == workspace_id);

    if let Some(ws) = workspace {
        let projects: Vec<ProjectResponse> = ws
            .project_ids
            .iter()
            .filter_map(|pid| {
                synced.projects.iter().find(|p| &p.id == pid).map(|p| ProjectResponse {
                    id: p.id.clone(),
                    name: p.name.clone(),
                    path: p.path.clone(),
                    workspace_id: ws.id.clone(),
                    last_opened: None,
                })
            })
            .collect();
        Ok(Json(projects))
    } else {
        Ok(Json(vec![]))
    }
}

// ============================================================================
// Workspace CRUD Handlers
// ============================================================================

#[derive(Deserialize)]
struct CreateWorkspaceRequest {
    name: String,
    color: Option<String>,
}

#[derive(Serialize)]
struct CreateWorkspaceResponse {
    id: String,
    name: String,
    color: String,
}

async fn create_workspace(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<CreateWorkspaceRequest>,
) -> Result<Json<CreateWorkspaceResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let id = uuid::Uuid::new_v4().to_string();
    let color = req.color.unwrap_or_else(|| "#cba6f7".to_string()); // Default purple

    // Emit Tauri event for frontend to handle the actual creation
    #[derive(Clone, Serialize)]
    struct MobileCreateWorkspaceEvent {
        id: String,
        name: String,
        color: String,
    }

    state.emit_event("mobile-workspace-create", MobileCreateWorkspaceEvent {
        id: id.clone(),
        name: req.name.clone(),
        color: color.clone(),
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::WorkspaceUpdate {
        action: "created".to_string(),
        workspace: Some(SyncedWorkspace {
            id: id.clone(),
            name: req.name.clone(),
            color: color.clone(),
            project_ids: vec![],
        }),
        workspace_id: None,
    });

    Ok(Json(CreateWorkspaceResponse {
        id,
        name: req.name,
        color,
    }))
}

#[derive(Deserialize)]
struct UpdateWorkspaceRequest {
    name: Option<String>,
    color: Option<String>,
}

async fn update_workspace(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(workspace_id): Path<String>,
    Json(req): Json<UpdateWorkspaceRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the update
    #[derive(Clone, Serialize)]
    struct MobileUpdateWorkspaceEvent {
        id: String,
        name: Option<String>,
        color: Option<String>,
    }

    state.emit_event("mobile-workspace-update", MobileUpdateWorkspaceEvent {
        id: workspace_id.clone(),
        name: req.name.clone(),
        color: req.color.clone(),
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::WorkspaceUpdate {
        action: "updated".to_string(),
        workspace: None,
        workspace_id: Some(workspace_id),
    });

    Ok(StatusCode::OK)
}

async fn delete_workspace(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(workspace_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the deletion
    #[derive(Clone, Serialize)]
    struct MobileDeleteWorkspaceEvent {
        id: String,
    }

    state.emit_event("mobile-workspace-delete", MobileDeleteWorkspaceEvent {
        id: workspace_id.clone(),
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::WorkspaceUpdate {
        action: "deleted".to_string(),
        workspace: None,
        workspace_id: Some(workspace_id),
    });

    Ok(StatusCode::OK)
}

// ============================================================================
// Project CRUD Handlers
// ============================================================================

#[derive(Deserialize)]
struct CreateProjectRequest {
    name: String,
    path: String,
    color: Option<String>,
}

#[derive(Serialize)]
struct CreateProjectResponse {
    id: String,
    name: String,
    path: String,
    #[serde(rename = "workspaceId")]
    workspace_id: String,
}

async fn create_project(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(workspace_id): Path<String>,
    Json(req): Json<CreateProjectRequest>,
) -> Result<Json<CreateProjectResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let id = uuid::Uuid::new_v4().to_string();

    // Emit Tauri event for frontend to handle the actual creation
    #[derive(Clone, Serialize)]
    struct MobileCreateProjectEvent {
        id: String,
        name: String,
        path: String,
        color: Option<String>,
        workspace_id: String,
    }

    state.emit_event("mobile-project-create", MobileCreateProjectEvent {
        id: id.clone(),
        name: req.name.clone(),
        path: req.path.clone(),
        color: req.color.clone(),
        workspace_id: workspace_id.clone(),
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::ProjectUpdate {
        action: "created".to_string(),
        project: Some(SyncedProject {
            id: id.clone(),
            name: req.name.clone(),
            path: req.path.clone(),
            color: req.color,
        }),
        project_id: None,
        workspace_id: Some(workspace_id.clone()),
    });

    Ok(Json(CreateProjectResponse {
        id,
        name: req.name,
        path: req.path,
        workspace_id,
    }))
}

#[derive(Deserialize)]
struct UpdateProjectRequest {
    name: Option<String>,
    color: Option<String>,
}

async fn update_project(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
    Json(req): Json<UpdateProjectRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the update
    #[derive(Clone, Serialize)]
    struct MobileUpdateProjectEvent {
        id: String,
        name: Option<String>,
        color: Option<String>,
    }

    state.emit_event("mobile-project-update", MobileUpdateProjectEvent {
        id: project_id.clone(),
        name: req.name.clone(),
        color: req.color.clone(),
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::ProjectUpdate {
        action: "updated".to_string(),
        project: None,
        project_id: Some(project_id),
        workspace_id: None,
    });

    Ok(StatusCode::OK)
}

async fn delete_project(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the deletion
    #[derive(Clone, Serialize)]
    struct MobileDeleteProjectEvent {
        id: String,
    }

    state.emit_event("mobile-project-delete", MobileDeleteProjectEvent {
        id: project_id.clone(),
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::ProjectUpdate {
        action: "deleted".to_string(),
        project: None,
        project_id: Some(project_id),
        workspace_id: None,
    });

    Ok(StatusCode::OK)
}

// ============================================================================
// Netlify Handlers
// ============================================================================

#[derive(Deserialize)]
struct NetlifySetTokenRequest {
    token: String,
}

#[derive(Serialize)]
struct NetlifyAuthResponse {
    authenticated: bool,
    user: Option<serde_json::Value>,
}

async fn netlify_set_token(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<NetlifySetTokenRequest>,
) -> Result<Json<NetlifyAuthResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Test the token first
    match crate::netlify_backup::netlify_test_connection(req.token.clone()).await {
        Ok(user) => {
            // Store the token
            let mut token = state.netlify_token.write().await;
            *token = Some(req.token);

            Ok(Json(NetlifyAuthResponse {
                authenticated: true,
                user: Some(user),
            }))
        }
        Err(e) => Err((StatusCode::UNAUTHORIZED, e)),
    }
}

async fn netlify_check_auth(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
) -> Result<Json<NetlifyAuthResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let token = state.netlify_token.read().await;
    if let Some(t) = token.as_ref() {
        match crate::netlify_backup::netlify_test_connection(t.clone()).await {
            Ok(user) => Ok(Json(NetlifyAuthResponse {
                authenticated: true,
                user: Some(user),
            })),
            Err(_) => Ok(Json(NetlifyAuthResponse {
                authenticated: false,
                user: None,
            })),
        }
    } else {
        Ok(Json(NetlifyAuthResponse {
            authenticated: false,
            user: None,
        }))
    }
}

async fn netlify_list_sites(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let token = state.netlify_token.read().await;
    let token = token.as_ref().ok_or((StatusCode::UNAUTHORIZED, "Netlify not authenticated".to_string()))?;

    crate::netlify_backup::netlify_fetch_sites(token.clone())
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

#[derive(Deserialize)]
struct NetlifyCreateSiteRequest {
    name: String,
}

async fn netlify_create_site_api(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<NetlifyCreateSiteRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let token = state.netlify_token.read().await;
    let token = token.as_ref().ok_or((StatusCode::UNAUTHORIZED, "Netlify not authenticated".to_string()))?;

    crate::netlify_backup::netlify_create_site(token.clone(), req.name)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

async fn netlify_list_deploys(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(site_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let token = state.netlify_token.read().await;
    let token = token.as_ref().ok_or((StatusCode::UNAUTHORIZED, "Netlify not authenticated".to_string()))?;

    crate::netlify_backup::netlify_fetch_deploys(token.clone(), site_id)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

#[derive(Deserialize)]
struct NetlifyDeployRequest {
    site_id: String,
    project_path: String,
}

#[derive(Serialize)]
struct NetlifyDeployResponse {
    deploy: serde_json::Value,
}

async fn netlify_deploy_project(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<NetlifyDeployRequest>,
) -> Result<Json<NetlifyDeployResponse>, (StatusCode, String)> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};

    validate_token(&state, auth).await?;

    let token = state.netlify_token.read().await;
    let token = token.as_ref().ok_or((StatusCode::UNAUTHORIZED, "Netlify not authenticated".to_string()))?.clone();

    // Use the existing zip_folder_for_deploy function which auto-detects build folders
    let zip_result = crate::commands::zip_folder_for_deploy(req.project_path.clone())
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create zip: {}", e)))?;

    // Decode base64 to get raw bytes
    let zip_data = STANDARD.decode(&zip_result.base64)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to decode zip: {}", e)))?;

    // Deploy to Netlify
    let deploy = crate::netlify_backup::netlify_deploy_zip(token, req.site_id, zip_data)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(NetlifyDeployResponse { deploy }))
}

#[derive(Deserialize)]
struct NetlifyRollbackRequest {
    site_id: String,
    deploy_id: String,
}

async fn netlify_rollback_api(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<NetlifyRollbackRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let token = state.netlify_token.read().await;
    let token = token.as_ref().ok_or((StatusCode::UNAUTHORIZED, "Netlify not authenticated".to_string()))?;

    crate::netlify_backup::netlify_rollback_deploy(token.clone(), req.site_id, req.deploy_id)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

// ============================================================================
// Beads Handlers
// ============================================================================

#[derive(Deserialize)]
struct BeadsQuery {
    project_path: String,
}

async fn list_beads(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(_project_id): Path<String>,
    Query(query): Query<BeadsQuery>,
) -> Result<Json<Vec<BeadsIssue>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    println!("[mobile_api] list_beads: project_path='{}'", query.project_path);

    // Call the beads module directly
    crate::beads::beads_list(query.project_path.clone())
        .await
        .map(|issues| {
            println!("[mobile_api] list_beads: returning {} issues", issues.len());
            Json(issues)
        })
        .map_err(|e| {
            println!("[mobile_api] list_beads: error - {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e)
        })
}

async fn beads_stats(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(_project_id): Path<String>,
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
    Path(_project_id): Path<String>,
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
    Path((_project_id, issue_id)): Path<(String, String)>,
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
    Path((_project_id, issue_id)): Path<(String, String)>,
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
    Path((_project_id, issue_id)): Path<(String, String)>,
    Json(req): Json<ReopenBeadRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    crate::beads::beads_reopen(req.project_path, issue_id)
        .await
        .map(|_| StatusCode::OK)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

// Auto-build session types (mirrors auto_build.rs)
#[derive(Debug, Serialize, Deserialize, Clone)]
struct AutoBuildSession {
    #[serde(rename = "sessionId")]
    session_id: String,
    status: String,
    queue: Vec<String>,
    completed: Vec<String>,
    #[serde(rename = "humanReview")]
    human_review: Vec<String>,
    #[serde(rename = "currentIssueId")]
    current_issue_id: Option<String>,
    #[serde(rename = "currentPhase")]
    current_phase: Option<String>,
    #[serde(rename = "retryCount")]
    retry_count: u8,
    #[serde(rename = "startedAt")]
    started_at: String,
    #[serde(rename = "lastActivityAt")]
    last_activity_at: String,
    settings: serde_json::Value,
}

// Helper to read autobuild session from file
fn read_autobuild_session(project_path: &str) -> Option<AutoBuildSession> {
    let session_path = std::path::Path::new(project_path)
        .join(".beads")
        .join(".autobuild-session.json");

    if !session_path.exists() {
        return None;
    }

    match std::fs::read_to_string(&session_path) {
        Ok(content) => serde_json::from_str(&content).ok(),
        Err(_) => None,
    }
}

// Helper to get beads issues for a project
fn get_beads_issues(project_path: &str) -> Vec<BeadsIssue> {
    // Run beads export command
    let output = std::process::Command::new("bd")
        .args(["export"])
        .current_dir(project_path)
        .env("PATH", get_enhanced_path())
        .output();

    match output {
        Ok(output) => {
            if !output.status.success() {
                return Vec::new();
            }
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut issues = Vec::new();
            for line in stdout.lines() {
                if line.trim().is_empty() {
                    continue;
                }
                if let Ok(issue) = serde_json::from_str::<BeadsIssue>(line) {
                    issues.push(issue);
                }
            }
            issues
        }
        Err(_) => Vec::new(),
    }
}

async fn autobuild_status(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get project path from synced data
    let synced = state.get_synced_data().await;

    println!("[mobile_api] autobuild_status: Looking for project_id='{}', synced projects: {:?}",
        project_id,
        synced.projects.iter().map(|p| (&p.id, &p.name)).collect::<Vec<_>>()
    );

    let project_path = synced
        .projects
        .iter()
        .find(|p| p.id == project_id)
        .map(|p| p.path.clone());

    let Some(project_path) = project_path else {
        println!("[mobile_api] autobuild_status: Project '{}' not found in synced data, returning idle state", project_id);
        return Ok(Json(serde_json::json!({
            "status": "idle",
            "workers": [],
            "queue": [],
            "human_review": [],
            "completed": [],
            "logs": [],
            "progress": 0,
            "error": format!("Project '{}' not found in synced data. Try reconnecting.", project_id)
        })));
    };

    // Read the session file
    let session = read_autobuild_session(&project_path);

    // Get issue details for queue items
    let issues = get_beads_issues(&project_path);
    let issue_map: std::collections::HashMap<String, &BeadsIssue> = issues
        .iter()
        .map(|i| (i.id.clone(), i))
        .collect();

    match session {
        Some(session) => {
            // Build queue with full issue details
            let queue: Vec<serde_json::Value> = session.queue.iter().map(|id| {
                let issue = issue_map.get(id);
                serde_json::json!({
                    "id": id,
                    "title": issue.map(|i| i.title.as_str()).unwrap_or("Unknown Issue"),
                    "status": "pending",
                    "created_at": issue.map(|i| i.created_at.as_str()).unwrap_or("")
                })
            }).collect();

            // Build human review list with issue details
            let human_review: Vec<serde_json::Value> = session.human_review.iter().map(|id| {
                let issue = issue_map.get(id);
                serde_json::json!({
                    "id": id,
                    "title": issue.map(|i| i.title.as_str()).unwrap_or("Unknown Issue"),
                    "status": "review",
                    "created_at": issue.map(|i| i.created_at.as_str()).unwrap_or("")
                })
            }).collect();

            // Build completed list with issue details
            let completed: Vec<serde_json::Value> = session.completed.iter().map(|id| {
                let issue = issue_map.get(id);
                serde_json::json!({
                    "id": id,
                    "title": issue.map(|i| i.title.as_str()).unwrap_or("Unknown Issue"),
                    "status": "completed",
                    "created_at": issue.map(|i| i.created_at.as_str()).unwrap_or("")
                })
            }).collect();

            Ok(Json(serde_json::json!({
                "status": session.status,
                "current_issue_id": session.current_issue_id,
                "current_phase": session.current_phase,
                "progress": 0, // Progress is tracked in frontend, not persisted
                "workers": [],
                "queue": queue,
                "human_review": human_review,
                "completed": completed,
                "logs": []
            })))
        }
        None => {
            // No session file - return idle state
            Ok(Json(serde_json::json!({
                "status": "idle",
                "workers": [],
                "queue": [],
                "human_review": [],
                "completed": [],
                "logs": [],
                "progress": 0
            })))
        }
    }
}

async fn autobuild_start(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get project path from synced data
    let synced = state.get_synced_data().await;
    let project_path = synced
        .projects
        .iter()
        .find(|p| p.id == project_id)
        .map(|p| p.path.clone());

    // Emit Tauri event so desktop frontend can start auto-build
    #[derive(Clone, Serialize)]
    struct MobileAutoBuildControlEvent {
        project_id: String,
        project_path: Option<String>,
        action: String,
    }

    state.emit_event("mobile-autobuild-control", MobileAutoBuildControlEvent {
        project_id,
        project_path,
        action: "start".to_string(),
    }).await;

    Ok(StatusCode::ACCEPTED)
}

async fn autobuild_pause(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get project path from synced data
    let synced = state.get_synced_data().await;
    let project_path = synced
        .projects
        .iter()
        .find(|p| p.id == project_id)
        .map(|p| p.path.clone());

    // Emit Tauri event so desktop frontend can pause auto-build
    #[derive(Clone, Serialize)]
    struct MobileAutoBuildControlEvent {
        project_id: String,
        project_path: Option<String>,
        action: String,
    }

    state.emit_event("mobile-autobuild-control", MobileAutoBuildControlEvent {
        project_id,
        project_path,
        action: "pause".to_string(),
    }).await;

    Ok(StatusCode::ACCEPTED)
}

async fn autobuild_stop(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get project path from synced data
    let synced = state.get_synced_data().await;
    let project_path = synced
        .projects
        .iter()
        .find(|p| p.id == project_id)
        .map(|p| p.path.clone());

    // Emit Tauri event so desktop frontend can stop auto-build
    #[derive(Clone, Serialize)]
    struct MobileAutoBuildControlEvent {
        project_id: String,
        project_path: Option<String>,
        action: String,
    }

    state.emit_event("mobile-autobuild-control", MobileAutoBuildControlEvent {
        project_id,
        project_path,
        action: "stop".to_string(),
    }).await;

    Ok(StatusCode::ACCEPTED)
}

#[derive(Deserialize)]
struct AddToQueueRequest {
    issue_id: String,
}

async fn autobuild_add_to_queue(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
    Json(body): Json<AddToQueueRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get project path from synced data
    let synced = state.get_synced_data().await;
    let project_path = synced
        .projects
        .iter()
        .find(|p| p.id == project_id)
        .map(|p| p.path.clone());

    // Send via state broadcast channel (frontend listens via WebSocket)
    let _ = state.state_tx.send(StateUpdate::AutoBuildAddToQueue {
        project_id: project_id.clone(),
        issue_id: body.issue_id.clone(),
    });

    // Emit Tauri event so desktop frontend can update its auto-build store
    #[derive(Clone, Serialize)]
    struct MobileAddToQueueEvent {
        project_id: String,
        project_path: Option<String>,
        issue_id: String,
    }

    state.emit_event("mobile-autobuild-add-to-queue", MobileAddToQueueEvent {
        project_id,
        project_path,
        issue_id: body.issue_id,
    }).await;

    Ok(StatusCode::ACCEPTED)
}

#[derive(Deserialize)]
struct RemoveFromQueuePath {
    id: String,
    issue_id: String,
}

async fn autobuild_remove_from_queue(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(RemoveFromQueuePath { id: project_id, issue_id }): Path<RemoveFromQueuePath>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get project path from synced data
    let synced = state.get_synced_data().await;
    let project_path = synced
        .projects
        .iter()
        .find(|p| p.id == project_id)
        .map(|p| p.path.clone());

    // Emit Tauri event so desktop frontend can update its auto-build store
    #[derive(Clone, Serialize)]
    struct MobileRemoveFromQueueEvent {
        project_id: String,
        project_path: Option<String>,
        issue_id: String,
    }

    state.emit_event("mobile-autobuild-remove-from-queue", MobileRemoveFromQueueEvent {
        project_id,
        project_path,
        issue_id,
    }).await;

    Ok(StatusCode::ACCEPTED)
}

// Backlog persistence types
#[derive(Debug, Serialize, Deserialize, Clone)]
struct AutoBuildBacklog {
    issues: Vec<String>,
    completed: Vec<String>,
    human_review: Vec<String>,
    updated_at: String,
}

// Helper to read backlog from file
fn read_autobuild_backlog(project_path: &str) -> Option<AutoBuildBacklog> {
    let backlog_path = std::path::Path::new(project_path)
        .join(".beads")
        .join(".autobuild-backlog.json");

    if !backlog_path.exists() {
        return None;
    }

    match std::fs::read_to_string(&backlog_path) {
        Ok(content) => serde_json::from_str(&content).ok(),
        Err(_) => None,
    }
}

async fn autobuild_get_backlog(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(project_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get project path from synced data
    let synced = state.get_synced_data().await;

    println!("[mobile_api] autobuild_get_backlog: Looking for project_id='{}'", project_id);

    let project_path = synced
        .projects
        .iter()
        .find(|p| p.id == project_id)
        .map(|p| p.path.clone());

    let Some(project_path) = project_path else {
        println!("[mobile_api] autobuild_get_backlog: Project '{}' not found in synced data", project_id);
        return Ok(Json(serde_json::json!({
            "issues": [],
            "completed": [],
            "human_review": [],
            "updated_at": null,
            "error": format!("Project '{}' not found in synced data. Try reconnecting.", project_id)
        })));
    };

    // Read the backlog file
    let backlog = read_autobuild_backlog(&project_path);

    // Get issue details for backlog items
    let issues = get_beads_issues(&project_path);
    let issue_map: std::collections::HashMap<String, &BeadsIssue> = issues
        .iter()
        .map(|i| (i.id.clone(), i))
        .collect();

    match backlog {
        Some(backlog) => {
            // Build issues with full details
            let issues_with_details: Vec<serde_json::Value> = backlog.issues.iter().map(|id| {
                let issue = issue_map.get(id);
                serde_json::json!({
                    "id": id,
                    "title": issue.map(|i| i.title.as_str()).unwrap_or("Unknown Issue"),
                    "status": issue.map(|i| i.status.as_str()).unwrap_or("open"),
                    "priority": issue.map(|i| i.priority).unwrap_or(4),
                    "issue_type": issue.map(|i| i.issue_type.as_str()).unwrap_or("task"),
                    "created_at": issue.map(|i| i.created_at.as_str()).unwrap_or("")
                })
            }).collect();

            // Build human review with details
            let human_review_with_details: Vec<serde_json::Value> = backlog.human_review.iter().map(|id| {
                let issue = issue_map.get(id);
                serde_json::json!({
                    "id": id,
                    "title": issue.map(|i| i.title.as_str()).unwrap_or("Unknown Issue"),
                    "status": "review",
                    "priority": issue.map(|i| i.priority).unwrap_or(4),
                    "issue_type": issue.map(|i| i.issue_type.as_str()).unwrap_or("task"),
                    "created_at": issue.map(|i| i.created_at.as_str()).unwrap_or("")
                })
            }).collect();

            // Build completed with details
            let completed_with_details: Vec<serde_json::Value> = backlog.completed.iter().map(|id| {
                let issue = issue_map.get(id);
                serde_json::json!({
                    "id": id,
                    "title": issue.map(|i| i.title.as_str()).unwrap_or("Unknown Issue"),
                    "status": "completed",
                    "priority": issue.map(|i| i.priority).unwrap_or(4),
                    "issue_type": issue.map(|i| i.issue_type.as_str()).unwrap_or("task"),
                    "created_at": issue.map(|i| i.created_at.as_str()).unwrap_or("")
                })
            }).collect();

            Ok(Json(serde_json::json!({
                "issues": issues_with_details,
                "completed": completed_with_details,
                "human_review": human_review_with_details,
                "updated_at": backlog.updated_at
            })))
        }
        None => {
            // No backlog file - return empty state
            Ok(Json(serde_json::json!({
                "issues": [],
                "completed": [],
                "human_review": [],
                "updated_at": null
            })))
        }
    }
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
    Path(_project_id): Path<String>,
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
    Path((_project_id, _session_id)): Path<(String, String)>,
) -> Result<Json<Vec<Message>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;
    // TODO: Connect to message store
    Ok(Json(vec![]))
}

// Mobile Chat Types
#[derive(Deserialize)]
struct MobileChatRequest {
    provider: String,
    model: String,
    mode: Option<String>, // "normal" | "plan" | "auto"
    message: String,
    cwd: Option<String>,  // Working directory for the CLI
    #[allow(dead_code)]
    session_id: Option<String>, // For resuming sessions
    history: Option<Vec<MobileChatHistoryItem>>,
}

#[derive(Deserialize, Clone)]
struct MobileChatHistoryItem {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct MobileChatChunk {
    #[serde(rename = "type")]
    chunk_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_input: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_output: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_is_error: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    session_id: Option<String>,
}

async fn mobile_chat(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<MobileChatRequest>,
) -> Result<Response<Body>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Create a channel for streaming chunks
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<axum::response::sse::Event, std::convert::Infallible>>(100);

    let provider = req.provider.clone();
    let model = req.model.clone();
    let mode = req.mode.clone().unwrap_or_else(|| "normal".to_string());
    let message = req.message.clone();
    let cwd = req.cwd.clone().unwrap_or_else(|| std::env::var("HOME").unwrap_or_else(|_| "/".to_string()));
    let history = req.history.clone().unwrap_or_default();
    let _cli_manager = state.mobile_cli_manager.clone(); // Will be used for session management

    // Spawn task to run CLI and stream output
    tokio::task::spawn_blocking(move || {
        let result = match provider.as_str() {
            "claude" => run_claude_cli(&tx, &model, &mode, &message, &cwd, &history),
            "openai" => run_codex_cli(&tx, &model, &mode, &message, &cwd, &history),
            "gemini" => run_gemini_cli(&tx, &model, &mode, &message, &cwd, &history),
            _ => {
                let rt = tokio::runtime::Handle::current();
                rt.block_on(send_error_chunk(&tx, &format!("Unknown provider: {}", provider)));
                Ok(())
            }
        };

        if let Err(e) = result {
            let rt = tokio::runtime::Handle::current();
            rt.block_on(send_error_chunk(&tx, &e.to_string()));
        }

        // Send done
        let rt = tokio::runtime::Handle::current();
        let _ = rt.block_on(tx.send(Ok(axum::response::sse::Event::default()
            .data("[DONE]".to_string()))));
    });

    // Convert to SSE stream
    let stream = ReceiverStream::new(rx);
    let sse = Sse::new(stream)
        .keep_alive(axum::response::sse::KeepAlive::default());

    Ok(sse.into_response())
}

async fn send_error_chunk(tx: &tokio::sync::mpsc::Sender<Result<axum::response::sse::Event, std::convert::Infallible>>, error: &str) {
    let _ = tx.send(Ok(axum::response::sse::Event::default()
        .data(serde_json::to_string(&MobileChatChunk {
            chunk_type: "error".to_string(),
            content: None,
            tool_name: None,
            tool_id: None,
            tool_input: None,
            tool_output: None,
            tool_is_error: None,
            error: Some(error.to_string()),
            session_id: None,
        }).unwrap()))).await;
}

fn send_content_chunk_sync(tx: &tokio::sync::mpsc::Sender<Result<axum::response::sse::Event, std::convert::Infallible>>, content: &str) {
    let rt = tokio::runtime::Handle::current();
    let _ = rt.block_on(tx.send(Ok(axum::response::sse::Event::default()
        .data(serde_json::to_string(&MobileChatChunk {
            chunk_type: "content".to_string(),
            content: Some(content.to_string()),
            tool_name: None,
            tool_id: None,
            tool_input: None,
            tool_output: None,
            tool_is_error: None,
            error: None,
            session_id: None,
        }).unwrap()))));
}

fn send_tool_chunk_sync(tx: &tokio::sync::mpsc::Sender<Result<axum::response::sse::Event, std::convert::Infallible>>, tool_name: &str, tool_id: Option<&str>, tool_input: Option<serde_json::Value>) {
    let rt = tokio::runtime::Handle::current();
    let _ = rt.block_on(tx.send(Ok(axum::response::sse::Event::default()
        .data(serde_json::to_string(&MobileChatChunk {
            chunk_type: "tool_start".to_string(),
            content: None,
            tool_name: Some(tool_name.to_string()),
            tool_id: tool_id.map(|s| s.to_string()),
            tool_input,
            tool_output: None,
            tool_is_error: None,
            error: None,
            session_id: None,
        }).unwrap()))));
}

fn send_tool_result_chunk_sync(tx: &tokio::sync::mpsc::Sender<Result<axum::response::sse::Event, std::convert::Infallible>>, tool_id: &str, output: Option<&str>, is_error: bool) {
    let rt = tokio::runtime::Handle::current();
    let _ = rt.block_on(tx.send(Ok(axum::response::sse::Event::default()
        .data(serde_json::to_string(&MobileChatChunk {
            chunk_type: "tool_result".to_string(),
            content: None,
            tool_name: None,
            tool_id: Some(tool_id.to_string()),
            tool_input: None,
            tool_output: output.map(|s| s.to_string()),
            tool_is_error: Some(is_error),
            error: None,
            session_id: None,
        }).unwrap()))));
}

// Format conversation history into a context string
fn format_history_context(history: &[MobileChatHistoryItem]) -> String {
    if history.is_empty() {
        return String::new();
    }

    let mut context = String::from("Previous conversation:\n\n");
    for item in history {
        let role_label = if item.role == "user" { "User" } else { "Assistant" };
        context.push_str(&format!("{}: {}\n\n", role_label, item.content));
    }
    context.push_str("---\n\nContinuing the conversation:\n\n");
    context
}

// Run Claude CLI with stream-json output
fn run_claude_cli(
    tx: &tokio::sync::mpsc::Sender<Result<axum::response::sse::Event, std::convert::Infallible>>,
    model: &str,
    mode: &str,
    message: &str,
    cwd: &str,
    history: &[MobileChatHistoryItem],
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let enhanced_path = get_enhanced_path();
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users".to_string());

    // Build permission mode based on mode
    let permission_mode = match mode {
        "auto" => "bypassPermissions",
        "plan" => "plan",
        _ => "default",
    };

    // Format the full prompt with history context
    let full_prompt = if history.is_empty() {
        message.to_string()
    } else {
        format!("{}{}", format_history_context(history), message)
    };

    let mut args = vec![
        "-p".to_string(),
        full_prompt,
        "--output-format".to_string(),
        "stream-json".to_string(),
        "--verbose".to_string(),
        "--permission-mode".to_string(),
        permission_mode.to_string(),
    ];

    // Add model if specified
    if !model.is_empty() {
        args.push("--model".to_string());
        args.push(model.to_string());
    }

    eprintln!("[MobileChat] Running Claude CLI in {}: {:?}", cwd, args);

    let mut child = Command::new("claude")
        .args(&args)
        .current_dir(cwd)
        .env("HOME", &home)
        .env("PATH", &enhanced_path)
        .env("TERM", "xterm-256color")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Claude CLI: {}. Make sure 'claude' is installed.", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let reader = BufReader::new(stdout);

    // Process stream-json output
    for line in reader.lines() {
        if let Ok(line) = line {
            if line.is_empty() {
                continue;
            }
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                process_claude_stream_json(tx, &json);
            }
        }
    }

    // Wait for process to finish
    let _ = child.wait();

    Ok(())
}

// Process Claude stream-json events
fn process_claude_stream_json(
    tx: &tokio::sync::mpsc::Sender<Result<axum::response::sse::Event, std::convert::Infallible>>,
    json: &serde_json::Value,
) {
    let event_type = json.get("type").and_then(|t| t.as_str()).unwrap_or("");

    match event_type {
        "assistant" | "text" => {
            if let Some(message) = json.get("message") {
                if let Some(content) = message.get("content").and_then(|c| c.as_array()) {
                    for block in content {
                        if let Some(text) = block.get("text").and_then(|t| t.as_str()) {
                            send_content_chunk_sync(tx, text);
                        }
                    }
                }
            } else if let Some(content) = json.get("content").and_then(|c| c.as_str()) {
                send_content_chunk_sync(tx, content);
            }
        }
        "content_block_delta" => {
            if let Some(delta) = json.get("delta") {
                if let Some(text) = delta.get("text").and_then(|t| t.as_str()) {
                    send_content_chunk_sync(tx, text);
                }
            }
        }
        "tool_use" => {
            let tool_name = json.get("name").and_then(|n| n.as_str()).unwrap_or("unknown");
            let tool_id = json.get("id").and_then(|i| i.as_str());
            let tool_input = json.get("input").cloned();
            send_tool_chunk_sync(tx, tool_name, tool_id, tool_input);
        }
        "result" => {
            // Final result - extract text content
            if let Some(result) = json.get("result") {
                if let Some(content) = result.as_str() {
                    send_content_chunk_sync(tx, content);
                }
            }
        }
        _ => {}
    }
}

// Run Codex CLI (OpenAI)
fn run_codex_cli(
    tx: &tokio::sync::mpsc::Sender<Result<axum::response::sse::Event, std::convert::Infallible>>,
    _model: &str,
    mode: &str,
    message: &str,
    cwd: &str,
    history: &[MobileChatHistoryItem],
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let enhanced_path = get_enhanced_path();
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users".to_string());

    // Build args for codex CLI
    let approval_mode = match mode {
        "auto" => "full-auto",
        _ => "suggest",
    };

    // Format the full prompt with history context
    let full_prompt = if history.is_empty() {
        message.to_string()
    } else {
        format!("{}{}", format_history_context(history), message)
    };

    let args = vec![
        full_prompt,
        "--approval-mode".to_string(),
        approval_mode.to_string(),
    ];

    eprintln!("[MobileChat] Running Codex CLI in {}: {:?}", cwd, args);

    let mut child = Command::new("codex")
        .args(&args)
        .current_dir(cwd)
        .env("HOME", &home)
        .env("PATH", &enhanced_path)
        .env("TERM", "xterm-256color")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Codex CLI: {}. Make sure 'codex' is installed.", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let reader = BufReader::new(stdout);

    // Process JSONL output from Codex
    for line in reader.lines() {
        if let Ok(line) = line {
            if line.is_empty() {
                continue;
            }
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                process_codex_stream_json(tx, &json);
            } else {
                // Plain text output
                send_content_chunk_sync(tx, &line);
            }
        }
    }

    let _ = child.wait();
    Ok(())
}

// Process Codex stream events
fn process_codex_stream_json(
    tx: &tokio::sync::mpsc::Sender<Result<axum::response::sse::Event, std::convert::Infallible>>,
    json: &serde_json::Value,
) {
    let event_type = json.get("type").and_then(|t| t.as_str()).unwrap_or("");

    match event_type {
        "message" | "response.output_text.delta" => {
            if let Some(content) = json.get("content").and_then(|c| c.as_str()) {
                send_content_chunk_sync(tx, content);
            } else if let Some(delta) = json.get("delta").and_then(|d| d.as_str()) {
                send_content_chunk_sync(tx, delta);
            }
        }
        "item.started" => {
            if let Some(item) = json.get("item") {
                let item_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");
                if item_type == "command_execution" || item_type == "function_call" {
                    let tool_name = item.get("name").and_then(|n| n.as_str()).unwrap_or("command");
                    let tool_id = item.get("id").and_then(|i| i.as_str());
                    send_tool_chunk_sync(tx, tool_name, tool_id, item.get("arguments").cloned());
                }
            }
        }
        "item.completed" => {
            if let Some(item) = json.get("item") {
                let item_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");
                if item_type == "command_execution" || item_type == "function_call" {
                    let tool_id = item.get("id").and_then(|i| i.as_str()).unwrap_or("");
                    let output = item.get("output").and_then(|o| o.as_str());
                    let is_error = item.get("status").and_then(|s| s.as_str()) == Some("error");
                    send_tool_result_chunk_sync(tx, tool_id, output, is_error);
                } else if item_type == "message" {
                    if let Some(content) = item.get("content").and_then(|c| c.as_array()) {
                        for block in content {
                            if let Some(text) = block.get("text").and_then(|t| t.as_str()) {
                                send_content_chunk_sync(tx, text);
                            }
                        }
                    }
                }
            }
        }
        _ => {}
    }
}

// Run Gemini CLI
fn run_gemini_cli(
    tx: &tokio::sync::mpsc::Sender<Result<axum::response::sse::Event, std::convert::Infallible>>,
    _model: &str,
    mode: &str,
    message: &str,
    cwd: &str,
    history: &[MobileChatHistoryItem],
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let enhanced_path = get_enhanced_path();
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users".to_string());

    // Build args for gemini CLI
    let sandbox_mode = match mode {
        "auto" => "off",
        _ => "on",
    };

    // Format the full prompt with history context
    let full_prompt = if history.is_empty() {
        message.to_string()
    } else {
        format!("{}{}", format_history_context(history), message)
    };

    let args = vec![
        full_prompt,
        "--sandbox".to_string(),
        sandbox_mode.to_string(),
    ];

    eprintln!("[MobileChat] Running Gemini CLI in {}: {:?}", cwd, args);

    let mut child = Command::new("gemini")
        .args(&args)
        .current_dir(cwd)
        .env("HOME", &home)
        .env("PATH", &enhanced_path)
        .env("TERM", "xterm-256color")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Gemini CLI: {}. Make sure 'gemini' is installed.", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let reader = BufReader::new(stdout);

    // Process JSONL output from Gemini
    for line in reader.lines() {
        if let Ok(line) = line {
            if line.is_empty() {
                continue;
            }
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                process_gemini_stream_json(tx, &json);
            } else {
                // Plain text output
                send_content_chunk_sync(tx, &line);
            }
        }
    }

    let _ = child.wait();
    Ok(())
}

// Process Gemini stream events
fn process_gemini_stream_json(
    tx: &tokio::sync::mpsc::Sender<Result<axum::response::sse::Event, std::convert::Infallible>>,
    json: &serde_json::Value,
) {
    let event_type = json.get("type").and_then(|t| t.as_str()).unwrap_or("");

    match event_type {
        "message" | "text" => {
            if let Some(content) = json.get("content").and_then(|c| c.as_str()) {
                send_content_chunk_sync(tx, content);
            } else if let Some(text) = json.get("text").and_then(|t| t.as_str()) {
                send_content_chunk_sync(tx, text);
            }
        }
        "tool_use" | "function_call" => {
            let tool_name = json.get("tool_name").or(json.get("name")).and_then(|n| n.as_str()).unwrap_or("tool");
            let tool_id = json.get("tool_id").or(json.get("id")).and_then(|i| i.as_str());
            let tool_input = json.get("parameters").or(json.get("args")).cloned();
            send_tool_chunk_sync(tx, tool_name, tool_id, tool_input);
        }
        "tool_result" => {
            let tool_id = json.get("tool_id").and_then(|i| i.as_str()).unwrap_or("");
            let output = json.get("content").or(json.get("output")).and_then(|o| o.as_str());
            let is_error = json.get("success").and_then(|s| s.as_bool()) == Some(false);
            send_tool_result_chunk_sync(tx, tool_id, output, is_error);
        }
        "item.completed" => {
            if let Some(item) = json.get("item") {
                let item_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");
                if item_type == "function_call" {
                    let tool_name = item.get("name").and_then(|n| n.as_str()).unwrap_or("tool");
                    let tool_id = item.get("id").and_then(|i| i.as_str());
                    send_tool_chunk_sync(tx, tool_name, tool_id, item.get("args").cloned());
                } else if let Some(output) = item.get("output").and_then(|o| o.as_str()) {
                    send_content_chunk_sync(tx, output);
                }
            }
        }
        _ => {}
    }
}

// WebSocket handler
async fn websocket_handler(
    State(state): State<Arc<AppState>>,
    ws: WebSocketUpgrade,
) -> Response {
    // Don't validate token here - wait for authenticate message after connection
    let jwt_secret = state.jwt_secret.clone();
    let state_tx = state.state_tx.clone();

    ws.on_upgrade(move |socket| handle_websocket(socket, jwt_secret, state_tx))
}

async fn handle_websocket(
    mut socket: axum::extract::ws::WebSocket,
    jwt_secret: String,
    state_tx: broadcast::Sender<StateUpdate>,
) {
    use axum::extract::ws::Message;

    // Wait for authenticate message first
    let authenticated = loop {
        match socket.recv().await {
            Some(Ok(Message::Text(text))) => {
                if let Ok(cmd) = serde_json::from_str::<serde_json::Value>(&text) {
                    if cmd.get("type").and_then(|t| t.as_str()) == Some("authenticate") {
                        if let Some(token) = cmd.get("token").and_then(|t| t.as_str()) {
                            // Validate the token
                            match decode::<Claims>(
                                token,
                                &DecodingKey::from_secret(jwt_secret.as_bytes()),
                                &Validation::default(),
                            ) {
                                Ok(_) => {
                                    // Send success response
                                    let response = serde_json::json!({
                                        "type": "authenticated",
                                        "success": true
                                    });
                                    if socket.send(Message::Text(response.to_string().into())).await.is_err() {
                                        return;
                                    }
                                    break true;
                                }
                                Err(_) => {
                                    // Send error response
                                    let response = serde_json::json!({
                                        "type": "authenticated",
                                        "success": false,
                                        "error": "Invalid token"
                                    });
                                    let _ = socket.send(Message::Text(response.to_string().into())).await;
                                    return;
                                }
                            }
                        } else {
                            // Missing token in authenticate message
                            let response = serde_json::json!({
                                "type": "authenticated",
                                "success": false,
                                "error": "Missing token"
                            });
                            let _ = socket.send(Message::Text(response.to_string().into())).await;
                            return;
                        }
                    }
                }
                // Ignore non-authenticate messages before authentication
            }
            Some(Ok(Message::Close(_))) | None => {
                return;
            }
            _ => {}
        }
    };

    if !authenticated {
        return;
    }

    // Now subscribe to updates
    let mut rx = state_tx.subscribe();

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
// Farmwork Standalone Handlers
// ============================================================================

/// Serves the farmwork standalone index.html
async fn farmwork_index() -> Result<Response<Body>, (StatusCode, String)> {
    // Get the path to dist-farmwork directory
    // In development, it's relative to the project root
    // In production, it should be bundled with the app
    let dist_path = get_farmwork_dist_path();

    let index_path = dist_path.join("index.html");

    if !index_path.exists() {
        return Err((
            StatusCode::NOT_FOUND,
            "Farmwork standalone not built. Run 'npm run build:farmwork' first.".to_string(),
        ));
    }

    match tokio::fs::read(&index_path).await {
        Ok(contents) => {
            let response = Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
                .body(Body::from(contents))
                .unwrap();
            Ok(response)
        }
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to read index.html: {}", e))),
    }
}

/// Serves farmwork static assets (JS, CSS, images)
async fn farmwork_assets(Path(path): Path<String>) -> Result<Response<Body>, (StatusCode, String)> {
    let dist_path = get_farmwork_dist_path();
    let file_path = dist_path.join(&path);

    // Security: ensure we're not escaping the dist directory
    if !file_path.starts_with(&dist_path) {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    if !file_path.exists() {
        return Err((StatusCode::NOT_FOUND, format!("Asset not found: {}", path)));
    }

    let content_type = match file_path.extension().and_then(|e| e.to_str()) {
        Some("js") => "application/javascript",
        Some("css") => "text/css",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("svg") => "image/svg+xml",
        Some("woff2") => "font/woff2",
        Some("woff") => "font/woff",
        Some("html") => "text/html",
        Some("json") => "application/json",
        _ => "application/octet-stream",
    };

    match tokio::fs::read(&file_path).await {
        Ok(contents) => {
            let response = Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, content_type)
                .header(header::CACHE_CONTROL, "public, max-age=31536000") // 1 year cache for hashed assets
                .body(Body::from(contents))
                .unwrap();
            Ok(response)
        }
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to read asset: {}", e))),
    }
}

fn get_farmwork_dist_path() -> std::path::PathBuf {
    // Try relative to current exe first (for production)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            // Direct path next to exe (Windows/Linux)
            let prod_path = exe_dir.join("dist-farmwork");
            if prod_path.exists() {
                return prod_path;
            }

            // macOS app bundle: exe is at Contents/MacOS/app-name
            // Resources are at Contents/Resources/
            if let Some(contents_dir) = exe_dir.parent() {
                let resources_path = contents_dir.join("Resources/dist-farmwork");
                if resources_path.exists() {
                    return resources_path;
                }
            }
        }
    }

    // Development: relative to project root (src-tauri runs from project root)
    let dev_path = std::path::PathBuf::from("dist-farmwork");
    if dev_path.exists() {
        return dev_path;
    }

    // Fallback: try relative to src-tauri
    std::path::PathBuf::from("../dist-farmwork")
}

#[derive(Serialize)]
struct FarmworkStatsResponse {
    audit_scores: FarmworkAuditScores,
    garden_stats: FarmworkGardenStats,
    compost_stats: FarmworkCompostStats,
    beads_stats: Option<BeadsStats>,
}

#[derive(Serialize)]
struct FarmworkAuditScores {
    security: FarmworkAuditMetadata,
    tests: FarmworkAuditMetadata,
    performance: FarmworkAuditMetadata,
    accessibility: FarmworkAuditMetadata,
    code_quality: FarmworkAuditMetadata,
    farmhouse: FarmworkAuditMetadata,
}

#[derive(Serialize, Default)]
struct FarmworkAuditMetadata {
    score: f64,
    open_items: Vec<FarmworkOpenItem>,
    last_updated: Option<String>,
    status: Option<String>,
}

#[derive(Serialize, Clone)]
struct FarmworkOpenItem {
    priority: String,
    text: String,
}

#[derive(Serialize, Default)]
struct FarmworkGardenStats {
    active_ideas: u32,
    planted: u32,
    growing: u32,
    picked: u32,
}

#[derive(Serialize, Default)]
struct FarmworkCompostStats {
    rejected_ideas: u32,
}

#[derive(Deserialize)]
struct FarmworkQuery {
    project_path: String,
}

/// Returns farmwork stats for a project
async fn farmwork_stats(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Query(query): Query<FarmworkQuery>,
) -> Result<Json<FarmworkStatsResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let project_path = std::path::PathBuf::from(&query.project_path);

    // Read audit files
    let mut audit_scores = FarmworkAuditScores {
        security: FarmworkAuditMetadata::default(),
        tests: FarmworkAuditMetadata::default(),
        performance: FarmworkAuditMetadata::default(),
        accessibility: FarmworkAuditMetadata::default(),
        code_quality: FarmworkAuditMetadata::default(),
        farmhouse: FarmworkAuditMetadata::default(),
    };

    let audit_files = [
        ("security", "_AUDIT/SECURITY.md"),
        ("tests", "_AUDIT/TESTS.md"),
        ("performance", "_AUDIT/PERFORMANCE.md"),
        ("accessibility", "_AUDIT/ACCESSIBILITY.md"),
        ("code_quality", "_AUDIT/CODE_QUALITY.md"),
        ("farmhouse", "_AUDIT/FARMHOUSE.md"),
    ];

    for (key, file) in audit_files {
        let file_path = project_path.join(file);
        if let Ok(content) = tokio::fs::read_to_string(&file_path).await {
            let metadata = parse_audit_file(&content);
            match key {
                "security" => audit_scores.security = metadata,
                "tests" => audit_scores.tests = metadata,
                "performance" => audit_scores.performance = metadata,
                "accessibility" => audit_scores.accessibility = metadata,
                "code_quality" => audit_scores.code_quality = metadata,
                "farmhouse" => audit_scores.farmhouse = metadata,
                _ => {}
            }
        }
    }

    // Read garden stats
    let mut garden_stats = FarmworkGardenStats::default();
    let garden_path = project_path.join("_AUDIT/GARDEN.md");
    if let Ok(content) = tokio::fs::read_to_string(&garden_path).await {
        garden_stats = parse_garden_file(&content);
    }

    // Read compost stats
    let mut compost_stats = FarmworkCompostStats::default();
    let compost_path = project_path.join("_AUDIT/COMPOST.md");
    if let Ok(content) = tokio::fs::read_to_string(&compost_path).await {
        compost_stats = parse_compost_file(&content);
    }

    // Get beads stats if available
    let beads_stats = crate::beads::beads_stats(query.project_path.clone()).await.ok();

    Ok(Json(FarmworkStatsResponse {
        audit_scores,
        garden_stats,
        compost_stats,
        beads_stats,
    }))
}

/// Parse audit markdown file to extract score and open items
fn parse_audit_file(content: &str) -> FarmworkAuditMetadata {
    let mut metadata = FarmworkAuditMetadata::default();

    // Parse score: Look for **Score:** X.X/10 or Score: X.X/10
    let score_regex = regex::Regex::new(r"(?:\*\*Score:\*\*|Score:)\s*(\d+(?:\.\d+)?)\s*/\s*10").unwrap();
    if let Some(caps) = score_regex.captures(content) {
        if let Ok(score) = caps[1].parse::<f64>() {
            metadata.score = score;
        }
    }

    // Parse open items (lines starting with - [ ] in Open Items section)
    let mut in_open_items = false;
    for line in content.lines() {
        let trimmed = line.trim();

        // Check if we're entering the Open Items section
        if trimmed.contains("Open Items") || trimmed.contains("## Open") {
            in_open_items = true;
            continue;
        }

        // Check if we're leaving (next section)
        if in_open_items && trimmed.starts_with("## ") && !trimmed.contains("Open") {
            in_open_items = false;
            continue;
        }

        // Parse open item
        if in_open_items && trimmed.starts_with("- [ ]") {
            let text = trimmed.trim_start_matches("- [ ]").trim();
            let priority = if text.to_lowercase().contains("(high)") || text.starts_with("!") {
                "high"
            } else if text.to_lowercase().contains("(medium)") {
                "medium"
            } else {
                "low"
            };
            metadata.open_items.push(FarmworkOpenItem {
                priority: priority.to_string(),
                text: text.to_string(),
            });
        }
    }

    metadata
}

/// Parse garden markdown file
fn parse_garden_file(content: &str) -> FarmworkGardenStats {
    let mut stats = FarmworkGardenStats::default();

    // Parse header count: **Active Ideas:** N
    let active_regex = regex::Regex::new(r"\*\*Active Ideas:\*\*\s*(\d+)").unwrap();
    if let Some(caps) = active_regex.captures(content) {
        if let Ok(count) = caps[1].parse::<u32>() {
            stats.planted = count;
            stats.active_ideas = count;
        }
    }

    // Count ideas in different sections
    let mut section = "";
    for line in content.lines() {
        let trimmed = line.trim();

        // Detect section headers
        if trimmed == "## Ideas" {
            section = "ideas";
        } else if trimmed.starts_with("## Graduated") {
            section = "graduated";
        } else if trimmed.starts_with("## Implemented") {
            section = "implemented";
        } else if trimmed.starts_with("## ") {
            section = "";
        }

        // Count ### headers in Ideas section (if header count wasn't found)
        if section == "ideas" && trimmed.starts_with("### ") {
            stats.planted += 1;
        }

        // Count table rows in Graduated section (lines starting with | but not header/separator)
        if section == "graduated" && trimmed.starts_with("|") && !trimmed.contains("---") && !trimmed.to_lowercase().contains("| idea") {
            stats.growing += 1;
        }

        // Count table rows in Implemented section
        if section == "implemented" && trimmed.starts_with("|") && !trimmed.contains("---") && !trimmed.to_lowercase().contains("| idea") {
            stats.picked += 1;
        }
    }

    stats.active_ideas = stats.planted + stats.growing;
    stats
}

/// Parse compost markdown file
fn parse_compost_file(content: &str) -> FarmworkCompostStats {
    let mut stats = FarmworkCompostStats::default();

    // Parse header count: **Composted Ideas:** N
    let compost_regex = regex::Regex::new(r"\*\*Composted Ideas:\*\*\s*(\d+)").unwrap();
    if let Some(caps) = compost_regex.captures(content) {
        if let Ok(count) = caps[1].parse::<u32>() {
            stats.rejected_ideas = count;
            return stats;
        }
    }

    // Fallback: count ### headers in Composted Ideas section
    let mut in_composted = false;
    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed == "## Composted Ideas" {
            in_composted = true;
        } else if trimmed.starts_with("## ") {
            in_composted = false;
        }

        if in_composted && trimmed.starts_with("### ") {
            stats.rejected_ideas += 1;
        }
    }

    stats
}

#[derive(Serialize)]
struct FarmworkActivityResponse {
    events: Vec<FarmworkActivityEvent>,
}

#[derive(Serialize)]
struct FarmworkActivityEvent {
    id: String,
    event_type: String,
    message: String,
    timestamp: u64,
}

/// Returns recent farmwork activity events
async fn farmwork_activity(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Query(_query): Query<FarmworkQuery>,
) -> Result<Json<FarmworkActivityResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // For now, return an empty activity list
    // Real activity would be tracked in the desktop app and synced here
    Ok(Json(FarmworkActivityResponse { events: vec![] }))
}

#[derive(Serialize)]
struct FarmworkCheckResponse {
    installed: bool,
    config_path: Option<String>,
}

/// Check if farmwork is installed for a project (checks for .farmwork.json)
async fn farmwork_check(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Query(query): Query<FarmworkQuery>,
) -> Result<Json<FarmworkCheckResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let project_path = std::path::PathBuf::from(&query.project_path);
    let config_path = project_path.join(".farmwork.json");

    let installed = config_path.exists();

    Ok(Json(FarmworkCheckResponse {
        installed,
        config_path: if installed {
            Some(config_path.to_string_lossy().to_string())
        } else {
            None
        },
    }))
}

// ============================================================================
// Overwatch, Subscriptions, Bookmarks Handlers
// ============================================================================

#[derive(Deserialize)]
struct OverwatchQuery {
    workspace_id: Option<String>,
}

#[derive(Serialize)]
struct OverwatchResponse {
    services: Vec<SyncedOverwatchService>,
}

async fn list_overwatch_services(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Query(query): Query<OverwatchQuery>,
) -> Result<Json<OverwatchResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let synced = state.get_synced_data().await;

    let services = if let Some(workspace_id) = query.workspace_id {
        synced.overwatch_services
            .into_iter()
            .filter(|s| s.workspace_id == workspace_id)
            .collect()
    } else {
        synced.overwatch_services
    };

    Ok(Json(OverwatchResponse { services }))
}

#[derive(Deserialize)]
struct SubscriptionsQuery {
    workspace_id: Option<String>,
}

#[derive(Serialize)]
struct SubscriptionsResponse {
    subscriptions: Vec<SyncedSubscription>,
    categories: Vec<SyncedSubscriptionCategory>,
}

async fn list_subscriptions(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Query(query): Query<SubscriptionsQuery>,
) -> Result<Json<SubscriptionsResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let synced = state.get_synced_data().await;

    let (subscriptions, categories) = if let Some(workspace_id) = query.workspace_id {
        (
            synced.subscriptions
                .into_iter()
                .filter(|s| s.workspace_id == workspace_id)
                .collect(),
            synced.subscription_categories
                .into_iter()
                .filter(|c| c.workspace_id == workspace_id)
                .collect(),
        )
    } else {
        (synced.subscriptions, synced.subscription_categories)
    };

    Ok(Json(SubscriptionsResponse { subscriptions, categories }))
}

// Get single subscription
async fn get_subscription(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(id): Path<String>,
) -> Result<Json<SyncedSubscription>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let synced = state.get_synced_data().await;

    synced.subscriptions
        .into_iter()
        .find(|s| s.id == id)
        .map(Json)
        .ok_or((StatusCode::NOT_FOUND, "Subscription not found".to_string()))
}

// Create subscription request
#[derive(Deserialize)]
struct CreateSubscriptionRequest {
    workspace_id: String,
    name: String,
    url: Option<String>,
    favicon_url: Option<String>,
    monthly_cost: f64,
    billing_cycle: Option<String>,
    currency: Option<String>,
    category_id: Option<String>,
    notes: Option<String>,
    is_active: Option<bool>,
}

async fn create_subscription(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<CreateSubscriptionRequest>,
) -> Result<Json<SyncedSubscription>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let id = uuid::Uuid::new_v4().to_string();

    // Get the next sort order
    let synced = state.get_synced_data().await;
    let sort_order = synced.subscriptions
        .iter()
        .filter(|s| s.workspace_id == req.workspace_id)
        .map(|s| s.sort_order)
        .max()
        .unwrap_or(-1) + 1;

    let subscription = SyncedSubscription {
        id: id.clone(),
        workspace_id: req.workspace_id.clone(),
        name: req.name.clone(),
        url: req.url.clone(),
        favicon_url: req.favicon_url.clone(),
        monthly_cost: req.monthly_cost,
        billing_cycle: req.billing_cycle.unwrap_or_else(|| "monthly".to_string()),
        currency: req.currency.unwrap_or_else(|| "USD".to_string()),
        category_id: req.category_id.clone(),
        notes: req.notes.clone(),
        is_active: req.is_active.unwrap_or(true),
        sort_order,
    };

    // Emit Tauri event for frontend to handle the actual creation
    #[derive(Clone, Serialize)]
    struct MobileSubscriptionCreateEvent {
        id: String,
        workspace_id: String,
        name: String,
        url: Option<String>,
        favicon_url: Option<String>,
        monthly_cost: f64,
        billing_cycle: String,
        currency: String,
        category_id: Option<String>,
        notes: Option<String>,
        is_active: bool,
        sort_order: i32,
    }

    state.emit_event("mobile-subscription-create", MobileSubscriptionCreateEvent {
        id: id.clone(),
        workspace_id: req.workspace_id,
        name: req.name,
        url: req.url,
        favicon_url: req.favicon_url,
        monthly_cost: req.monthly_cost,
        billing_cycle: subscription.billing_cycle.clone(),
        currency: subscription.currency.clone(),
        category_id: req.category_id,
        notes: req.notes,
        is_active: subscription.is_active,
        sort_order,
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::SubscriptionUpdate {
        action: "created".to_string(),
        subscription: Some(subscription.clone()),
        subscription_id: None,
    });

    Ok(Json(subscription))
}

// Update subscription request
#[derive(Deserialize)]
struct UpdateSubscriptionRequest {
    name: Option<String>,
    url: Option<String>,
    favicon_url: Option<String>,
    monthly_cost: Option<f64>,
    billing_cycle: Option<String>,
    currency: Option<String>,
    category_id: Option<String>,
    notes: Option<String>,
    is_active: Option<bool>,
    sort_order: Option<i32>,
}

async fn update_subscription(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(id): Path<String>,
    Json(req): Json<UpdateSubscriptionRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the update
    #[derive(Clone, Serialize)]
    struct MobileSubscriptionUpdateEvent {
        id: String,
        name: Option<String>,
        url: Option<String>,
        favicon_url: Option<String>,
        monthly_cost: Option<f64>,
        billing_cycle: Option<String>,
        currency: Option<String>,
        category_id: Option<String>,
        notes: Option<String>,
        is_active: Option<bool>,
        sort_order: Option<i32>,
    }

    state.emit_event("mobile-subscription-update", MobileSubscriptionUpdateEvent {
        id: id.clone(),
        name: req.name,
        url: req.url,
        favicon_url: req.favicon_url,
        monthly_cost: req.monthly_cost,
        billing_cycle: req.billing_cycle,
        currency: req.currency,
        category_id: req.category_id,
        notes: req.notes,
        is_active: req.is_active,
        sort_order: req.sort_order,
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::SubscriptionUpdate {
        action: "updated".to_string(),
        subscription: None,
        subscription_id: Some(id),
    });

    Ok(StatusCode::OK)
}

async fn delete_subscription(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the deletion
    #[derive(Clone, Serialize)]
    struct MobileSubscriptionDeleteEvent {
        id: String,
    }

    state.emit_event("mobile-subscription-delete", MobileSubscriptionDeleteEvent {
        id: id.clone(),
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::SubscriptionUpdate {
        action: "deleted".to_string(),
        subscription: None,
        subscription_id: Some(id),
    });

    Ok(StatusCode::OK)
}

// ============================================================================
// Subscription Category CRUD Handlers
// ============================================================================

#[derive(Deserialize)]
struct CreateSubscriptionCategoryRequest {
    workspace_id: String,
    name: String,
    color: Option<String>,
}

async fn create_subscription_category(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<CreateSubscriptionCategoryRequest>,
) -> Result<Json<SyncedSubscriptionCategory>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let id = uuid::Uuid::new_v4().to_string();

    // Get the next sort order
    let synced = state.get_synced_data().await;
    let sort_order = synced.subscription_categories
        .iter()
        .filter(|c| c.workspace_id == req.workspace_id)
        .map(|c| c.sort_order)
        .max()
        .unwrap_or(-1) + 1;

    let category = SyncedSubscriptionCategory {
        id: id.clone(),
        workspace_id: req.workspace_id.clone(),
        name: req.name.clone(),
        color: req.color.clone(),
        sort_order,
    };

    // Emit Tauri event for frontend to handle the actual creation
    #[derive(Clone, Serialize)]
    struct MobileSubscriptionCategoryCreateEvent {
        id: String,
        workspace_id: String,
        name: String,
        color: Option<String>,
        sort_order: i32,
    }

    state.emit_event("mobile-subscription-category-create", MobileSubscriptionCategoryCreateEvent {
        id: id.clone(),
        workspace_id: req.workspace_id,
        name: req.name,
        color: req.color,
        sort_order,
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::SubscriptionCategoryUpdate {
        action: "created".to_string(),
        category: Some(category.clone()),
        category_id: None,
    });

    Ok(Json(category))
}

#[derive(Deserialize)]
struct UpdateSubscriptionCategoryRequest {
    name: Option<String>,
    color: Option<String>,
    sort_order: Option<i32>,
}

async fn update_subscription_category(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(id): Path<String>,
    Json(req): Json<UpdateSubscriptionCategoryRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the update
    #[derive(Clone, Serialize)]
    struct MobileSubscriptionCategoryUpdateEvent {
        id: String,
        name: Option<String>,
        color: Option<String>,
        sort_order: Option<i32>,
    }

    state.emit_event("mobile-subscription-category-update", MobileSubscriptionCategoryUpdateEvent {
        id: id.clone(),
        name: req.name,
        color: req.color,
        sort_order: req.sort_order,
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::SubscriptionCategoryUpdate {
        action: "updated".to_string(),
        category: None,
        category_id: Some(id),
    });

    Ok(StatusCode::OK)
}

async fn delete_subscription_category(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the deletion
    #[derive(Clone, Serialize)]
    struct MobileSubscriptionCategoryDeleteEvent {
        id: String,
    }

    state.emit_event("mobile-subscription-category-delete", MobileSubscriptionCategoryDeleteEvent {
        id: id.clone(),
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::SubscriptionCategoryUpdate {
        action: "deleted".to_string(),
        category: None,
        category_id: Some(id),
    });

    Ok(StatusCode::OK)
}

#[derive(Serialize)]
struct BookmarksResponse {
    bookmarks: Vec<SyncedBookmark>,
    collections: Vec<SyncedBookmarkCollection>,
}

async fn list_bookmarks(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
) -> Result<Json<BookmarksResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let synced = state.get_synced_data().await;

    Ok(Json(BookmarksResponse {
        bookmarks: synced.bookmarks,
        collections: synced.bookmark_collections,
    }))
}

async fn get_bookmark(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(id): Path<String>,
) -> Result<Json<SyncedBookmark>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let synced = state.get_synced_data().await;

    synced.bookmarks
        .into_iter()
        .find(|b| b.id == id)
        .map(Json)
        .ok_or((StatusCode::NOT_FOUND, "Bookmark not found".to_string()))
}

// Create bookmark request
#[derive(Deserialize)]
struct CreateBookmarkRequest {
    url: String,
    title: String,
    description: Option<String>,
    favicon_url: Option<String>,
    collection_id: Option<String>,
}

async fn create_bookmark(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<CreateBookmarkRequest>,
) -> Result<Json<SyncedBookmark>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let id = uuid::Uuid::new_v4().to_string();

    // Get the next order
    let synced = state.get_synced_data().await;
    let order = synced.bookmarks
        .iter()
        .map(|b| b.order)
        .max()
        .unwrap_or(-1) + 1;

    let bookmark = SyncedBookmark {
        id: id.clone(),
        url: req.url.clone(),
        title: req.title.clone(),
        description: req.description.clone(),
        favicon_url: req.favicon_url.clone(),
        collection_id: req.collection_id.clone(),
        order,
    };

    // Emit Tauri event for frontend to handle the actual creation
    #[derive(Clone, Serialize)]
    struct MobileBookmarkCreateEvent {
        id: String,
        url: String,
        title: String,
        description: Option<String>,
        favicon_url: Option<String>,
        collection_id: Option<String>,
        order: i32,
    }

    state.emit_event("mobile-bookmark-create", MobileBookmarkCreateEvent {
        id: id.clone(),
        url: req.url,
        title: req.title,
        description: req.description,
        favicon_url: req.favicon_url,
        collection_id: req.collection_id,
        order,
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::BookmarkUpdate {
        action: "created".to_string(),
        bookmark: Some(bookmark.clone()),
        bookmark_id: None,
    });

    Ok(Json(bookmark))
}

// Update bookmark request
#[derive(Deserialize)]
struct UpdateBookmarkRequest {
    url: Option<String>,
    title: Option<String>,
    description: Option<String>,
    favicon_url: Option<String>,
    collection_id: Option<String>,
    order: Option<i32>,
}

async fn update_bookmark(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(id): Path<String>,
    Json(req): Json<UpdateBookmarkRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the update
    #[derive(Clone, Serialize)]
    struct MobileBookmarkUpdateEvent {
        id: String,
        url: Option<String>,
        title: Option<String>,
        description: Option<String>,
        favicon_url: Option<String>,
        collection_id: Option<String>,
        order: Option<i32>,
    }

    state.emit_event("mobile-bookmark-update", MobileBookmarkUpdateEvent {
        id: id.clone(),
        url: req.url,
        title: req.title,
        description: req.description,
        favicon_url: req.favicon_url,
        collection_id: req.collection_id,
        order: req.order,
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::BookmarkUpdate {
        action: "updated".to_string(),
        bookmark: None,
        bookmark_id: Some(id),
    });

    Ok(StatusCode::OK)
}

async fn delete_bookmark(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the deletion
    #[derive(Clone, Serialize)]
    struct MobileBookmarkDeleteEvent {
        id: String,
    }

    state.emit_event("mobile-bookmark-delete", MobileBookmarkDeleteEvent {
        id: id.clone(),
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::BookmarkUpdate {
        action: "deleted".to_string(),
        bookmark: None,
        bookmark_id: Some(id),
    });

    Ok(StatusCode::OK)
}

// ============================================================================
// Bookmark Collection CRUD Handlers
// ============================================================================

#[derive(Deserialize)]
struct CreateBookmarkCollectionRequest {
    name: String,
    icon: Option<String>,
    color: Option<String>,
}

async fn create_bookmark_collection(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<CreateBookmarkCollectionRequest>,
) -> Result<Json<SyncedBookmarkCollection>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let id = uuid::Uuid::new_v4().to_string();

    // Get the next order
    let synced = state.get_synced_data().await;
    let order = synced.bookmark_collections
        .iter()
        .map(|c| c.order)
        .max()
        .unwrap_or(-1) + 1;

    let collection = SyncedBookmarkCollection {
        id: id.clone(),
        name: req.name.clone(),
        icon: req.icon.clone(),
        color: req.color.clone(),
        order,
    };

    // Emit Tauri event for frontend to handle the actual creation
    #[derive(Clone, Serialize)]
    struct MobileBookmarkCollectionCreateEvent {
        id: String,
        name: String,
        icon: Option<String>,
        color: Option<String>,
        order: i32,
    }

    state.emit_event("mobile-bookmark-collection-create", MobileBookmarkCollectionCreateEvent {
        id: id.clone(),
        name: req.name,
        icon: req.icon,
        color: req.color,
        order,
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::BookmarkCollectionUpdate {
        action: "created".to_string(),
        collection: Some(collection.clone()),
        collection_id: None,
    });

    Ok(Json(collection))
}

#[derive(Deserialize)]
struct UpdateBookmarkCollectionRequest {
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    order: Option<i32>,
}

async fn update_bookmark_collection(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(id): Path<String>,
    Json(req): Json<UpdateBookmarkCollectionRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the update
    #[derive(Clone, Serialize)]
    struct MobileBookmarkCollectionUpdateEvent {
        id: String,
        name: Option<String>,
        icon: Option<String>,
        color: Option<String>,
        order: Option<i32>,
    }

    state.emit_event("mobile-bookmark-collection-update", MobileBookmarkCollectionUpdateEvent {
        id: id.clone(),
        name: req.name,
        icon: req.icon,
        color: req.color,
        order: req.order,
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::BookmarkCollectionUpdate {
        action: "updated".to_string(),
        collection: None,
        collection_id: Some(id),
    });

    Ok(StatusCode::OK)
}

async fn delete_bookmark_collection(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the deletion
    #[derive(Clone, Serialize)]
    struct MobileBookmarkCollectionDeleteEvent {
        id: String,
    }

    state.emit_event("mobile-bookmark-collection-delete", MobileBookmarkCollectionDeleteEvent {
        id: id.clone(),
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::BookmarkCollectionUpdate {
        action: "deleted".to_string(),
        collection: None,
        collection_id: Some(id),
    });

    Ok(StatusCode::OK)
}

// ============================================================================
// Kanban Board Handlers
// ============================================================================

async fn list_kanban_tasks(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(workspace_id): Path<String>,
) -> Result<Json<Vec<SyncedKanbanTask>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let synced = state.get_synced_data().await;
    let tasks = synced.kanban_boards
        .iter()
        .find(|b| b.workspace_id == workspace_id)
        .map(|b| b.tasks.clone())
        .unwrap_or_default();

    Ok(Json(tasks))
}

#[derive(Deserialize)]
struct CreateKanbanTaskRequest {
    title: String,
    description: Option<String>,
    priority: u8,
}

async fn create_kanban_task(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(workspace_id): Path<String>,
    Json(req): Json<CreateKanbanTaskRequest>,
) -> Result<Json<SyncedKanbanTask>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let id = uuid::Uuid::new_v4().to_string();

    // Get next order in backlog
    let synced = state.get_synced_data().await;
    let order = synced.kanban_boards
        .iter()
        .find(|b| b.workspace_id == workspace_id)
        .map(|b| b.tasks.iter().filter(|t| t.status == "backlog").map(|t| t.order).max().unwrap_or(-1) + 1)
        .unwrap_or(0);

    let task = SyncedKanbanTask {
        id: id.clone(),
        title: req.title.clone(),
        description: req.description.clone(),
        status: "backlog".to_string(),
        priority: req.priority,
        created_at: now,
        updated_at: now,
        order,
        locked: false,
    };

    // Emit Tauri event for frontend to handle the creation
    #[derive(Clone, Serialize)]
    struct MobileKanbanCreateEvent {
        workspace_id: String,
        id: String,
        title: String,
        description: Option<String>,
        priority: u8,
    }

    state.emit_event("mobile-kanban-create", MobileKanbanCreateEvent {
        workspace_id: workspace_id.clone(),
        id: id.clone(),
        title: req.title,
        description: req.description,
        priority: req.priority,
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::KanbanUpdate {
        workspace_id,
        action: "created".to_string(),
        task: Some(task.clone()),
        task_id: None,
    });

    Ok(Json(task))
}

#[derive(Deserialize)]
struct UpdateKanbanTaskRequest {
    title: Option<String>,
    description: Option<String>,
    priority: Option<u8>,
    locked: Option<bool>,
}

async fn update_kanban_task(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path((workspace_id, task_id)): Path<(String, String)>,
    Json(req): Json<UpdateKanbanTaskRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the update
    #[derive(Clone, Serialize)]
    struct MobileKanbanUpdateEvent {
        workspace_id: String,
        task_id: String,
        title: Option<String>,
        description: Option<String>,
        priority: Option<u8>,
        locked: Option<bool>,
    }

    state.emit_event("mobile-kanban-update", MobileKanbanUpdateEvent {
        workspace_id: workspace_id.clone(),
        task_id: task_id.clone(),
        title: req.title,
        description: req.description,
        priority: req.priority,
        locked: req.locked,
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::KanbanUpdate {
        workspace_id,
        action: "updated".to_string(),
        task: None,
        task_id: Some(task_id),
    });

    Ok(StatusCode::OK)
}

async fn delete_kanban_task(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path((workspace_id, task_id)): Path<(String, String)>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the deletion
    #[derive(Clone, Serialize)]
    struct MobileKanbanDeleteEvent {
        workspace_id: String,
        task_id: String,
    }

    state.emit_event("mobile-kanban-delete", MobileKanbanDeleteEvent {
        workspace_id: workspace_id.clone(),
        task_id: task_id.clone(),
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::KanbanUpdate {
        workspace_id,
        action: "deleted".to_string(),
        task: None,
        task_id: Some(task_id),
    });

    Ok(StatusCode::OK)
}

#[derive(Deserialize)]
struct MoveKanbanTaskRequest {
    status: String,
    order: Option<i32>,
}

async fn move_kanban_task(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path((workspace_id, task_id)): Path<(String, String)>,
    Json(req): Json<MoveKanbanTaskRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Emit Tauri event for frontend to handle the move
    #[derive(Clone, Serialize)]
    struct MobileKanbanMoveEvent {
        workspace_id: String,
        task_id: String,
        status: String,
        order: Option<i32>,
    }

    state.emit_event("mobile-kanban-move", MobileKanbanMoveEvent {
        workspace_id: workspace_id.clone(),
        task_id: task_id.clone(),
        status: req.status,
        order: req.order,
    }).await;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::KanbanUpdate {
        workspace_id,
        action: "moved".to_string(),
        task: None,
        task_id: Some(task_id),
    });

    Ok(StatusCode::OK)
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
    app_handle: tauri::AppHandle,
    manager: tauri::State<'_, Arc<MobileApiManager>>,
    port: Option<u16>,
) -> Result<MobileApiInfo, String> {
    // Set the app handle so we can emit events later
    manager.app_state.set_app_handle(app_handle).await;
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

/// Sync the Netlify token from the desktop frontend to the mobile API
/// This should be called when the desktop app loads and has a Netlify token configured
#[tauri::command]
pub async fn mobile_api_sync_netlify_token(
    manager: tauri::State<'_, Arc<MobileApiManager>>,
    token: Option<String>,
) -> Result<(), String> {
    manager.sync_netlify_token(token).await;
    Ok(())
}

#[tauri::command]
pub async fn mobile_api_sync_workspaces(
    manager: tauri::State<'_, Arc<MobileApiManager>>,
    workspaces: Vec<SyncedWorkspace>,
    projects: Vec<SyncedProject>,
) -> Result<(), String> {
    manager.sync_workspace_data(SyncedData {
        workspaces,
        projects,
        overwatch_services: vec![],
        subscriptions: vec![],
        subscription_categories: vec![],
        bookmarks: vec![],
        bookmark_collections: vec![],
        kanban_boards: vec![],
    }).await;
    Ok(())
}

#[tauri::command]
pub async fn mobile_api_sync_all_data(
    manager: tauri::State<'_, Arc<MobileApiManager>>,
    workspaces: Vec<SyncedWorkspace>,
    projects: Vec<SyncedProject>,
    overwatch_services: Vec<SyncedOverwatchService>,
    subscriptions: Vec<SyncedSubscription>,
    subscription_categories: Vec<SyncedSubscriptionCategory>,
    bookmarks: Vec<SyncedBookmark>,
    bookmark_collections: Vec<SyncedBookmarkCollection>,
    kanban_boards: Vec<SyncedKanbanBoard>,
) -> Result<(), String> {
    println!("[mobile_api] sync_all_data called with {} workspaces, {} projects, {} kanban boards",
        workspaces.len(), projects.len(), kanban_boards.len());
    for ws in &workspaces {
        println!("[mobile_api]   workspace: {} ({}) with {} project_ids", ws.name, ws.id, ws.project_ids.len());
    }
    for p in &projects {
        println!("[mobile_api]   project: {} at {}", p.name, p.path);
    }
    for kb in &kanban_boards {
        println!("[mobile_api]   kanban board: {} with {} tasks", kb.workspace_id, kb.tasks.len());
    }
    manager.sync_workspace_data(SyncedData {
        workspaces,
        projects,
        overwatch_services,
        subscriptions,
        subscription_categories,
        bookmarks,
        bookmark_collections,
        kanban_boards,
    }).await;
    Ok(())
}

// ============================================================================
// Docs API - List and view markdown files
// ============================================================================

#[derive(Debug, Deserialize)]
struct DocsListQuery {
    project_path: String,
}

#[derive(Debug, Deserialize)]
struct DocsContentQuery {
    project_path: String,
    file_path: String,
}

#[derive(Debug, Serialize)]
struct DocFile {
    name: String,
    path: String,
    folder: Option<String>,
    size: u64,
    modified: Option<u64>,
}

#[derive(Debug, Serialize)]
struct DocsListResponse {
    docs: Vec<DocFile>,
}

#[derive(Debug, Serialize)]
struct DocsContentResponse {
    content: String,
    name: String,
    path: String,
}

/// List all markdown files in a project
async fn docs_list(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Query(query): Query<DocsListQuery>,
) -> Result<Json<DocsListResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let project_path = std::path::PathBuf::from(&query.project_path);

    if !project_path.exists() || !project_path.is_dir() {
        return Err((StatusCode::NOT_FOUND, "Project path not found".to_string()));
    }

    let mut docs = Vec::new();

    // Walk the directory tree looking for .md files
    fn walk_dir(dir: &std::path::Path, base: &std::path::Path, docs: &mut Vec<DocFile>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();

                // Skip hidden files/dirs, node_modules, .git, etc.
                if name.starts_with('.') || name == "node_modules" || name == "target" || name == "dist" || name == "build" {
                    continue;
                }

                if path.is_dir() {
                    walk_dir(&path, base, docs);
                } else if path.extension().map(|e| e == "md").unwrap_or(false) {
                    // Get relative path from project root
                    let rel_path = path.strip_prefix(base).unwrap_or(&path);
                    let folder = rel_path.parent()
                        .and_then(|p| if p.as_os_str().is_empty() { None } else { Some(p.to_string_lossy().to_string()) });

                    let metadata = std::fs::metadata(&path).ok();
                    let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                    let modified = metadata.as_ref()
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs());

                    docs.push(DocFile {
                        name,
                        path: rel_path.to_string_lossy().to_string(),
                        folder,
                        size,
                        modified,
                    });
                }
            }
        }
    }

    walk_dir(&project_path, &project_path, &mut docs);

    // Sort by folder then name
    docs.sort_by(|a, b| {
        match (&a.folder, &b.folder) {
            (None, Some(_)) => std::cmp::Ordering::Less,
            (Some(_), None) => std::cmp::Ordering::Greater,
            (Some(af), Some(bf)) => af.cmp(bf).then(a.name.cmp(&b.name)),
            (None, None) => a.name.cmp(&b.name),
        }
    });

    Ok(Json(DocsListResponse { docs }))
}

/// Get content of a specific markdown file
async fn docs_content(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Query(query): Query<DocsContentQuery>,
) -> Result<Json<DocsContentResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let project_path = std::path::PathBuf::from(&query.project_path);
    let file_path = project_path.join(&query.file_path);

    // Security: ensure file_path is within project_path (prevent path traversal)
    let canonical_project = project_path.canonicalize()
        .map_err(|_| (StatusCode::NOT_FOUND, "Project path not found".to_string()))?;
    let canonical_file = file_path.canonicalize()
        .map_err(|_| (StatusCode::NOT_FOUND, "File not found".to_string()))?;

    if !canonical_file.starts_with(&canonical_project) {
        return Err((StatusCode::FORBIDDEN, "Access denied: path traversal attempt".to_string()));
    }

    // Only allow .md files
    if !canonical_file.extension().map(|e| e == "md").unwrap_or(false) {
        return Err((StatusCode::BAD_REQUEST, "Only markdown files are supported".to_string()));
    }

    let content = tokio::fs::read_to_string(&canonical_file)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to read file: {}", e)))?;

    let name = canonical_file.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown.md".to_string());

    Ok(Json(DocsContentResponse {
        content,
        name,
        path: query.file_path,
    }))
}

#[derive(Debug, Deserialize)]
struct DocsSaveRequest {
    project_path: String,
    file_path: String,
    content: String,
}

/// Save content to a markdown file
async fn docs_save(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<DocsSaveRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let project_path = std::path::PathBuf::from(&req.project_path);
    let file_path = project_path.join(&req.file_path);

    // Security: ensure file_path is within project_path (prevent path traversal)
    let canonical_project = project_path.canonicalize()
        .map_err(|_| (StatusCode::NOT_FOUND, "Project path not found".to_string()))?;

    // For new files, the file might not exist yet, so we check the parent directory
    let parent_dir = file_path.parent()
        .ok_or((StatusCode::BAD_REQUEST, "Invalid file path".to_string()))?;

    // Ensure parent directory exists and is within project
    if parent_dir.exists() {
        let canonical_parent = parent_dir.canonicalize()
            .map_err(|_| (StatusCode::NOT_FOUND, "Parent directory not found".to_string()))?;
        if !canonical_parent.starts_with(&canonical_project) {
            return Err((StatusCode::FORBIDDEN, "Access denied: path traversal attempt".to_string()));
        }
    } else {
        return Err((StatusCode::NOT_FOUND, "Parent directory does not exist".to_string()));
    }

    // For existing files, verify they're within project
    if file_path.exists() {
        let canonical_file = file_path.canonicalize()
            .map_err(|_| (StatusCode::NOT_FOUND, "File not found".to_string()))?;
        if !canonical_file.starts_with(&canonical_project) {
            return Err((StatusCode::FORBIDDEN, "Access denied: path traversal attempt".to_string()));
        }
    }

    // Only allow .md files
    if !file_path.extension().map(|e| e == "md").unwrap_or(false) {
        return Err((StatusCode::BAD_REQUEST, "Only markdown files are supported".to_string()));
    }

    // Write the content
    tokio::fs::write(&file_path, &req.content)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save file: {}", e)))?;

    Ok(StatusCode::OK)
}

// ============================================================================
// Templates API
// ============================================================================

#[derive(Debug, Serialize)]
struct ProjectTemplate {
    id: String,
    name: String,
    description: String,
    command: String,
    project_name_placeholder: String,
    color: String,
    category: String,
    icon: String,
}

#[derive(Debug, Serialize)]
struct CategoryInfo {
    id: String,
    label: String,
    order: u8,
}

#[derive(Debug, Serialize)]
struct TemplatesResponse {
    templates: Vec<ProjectTemplate>,
    categories: Vec<CategoryInfo>,
}

/// List all project templates with categories
async fn templates_list(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
) -> Result<Json<TemplatesResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let categories = vec![
        CategoryInfo { id: "ai".to_string(), label: "AI & LLM Apps".to_string(), order: 1 },
        CategoryInfo { id: "extensions".to_string(), label: "Browser Extensions".to_string(), order: 2 },
        CategoryInfo { id: "mobile".to_string(), label: "Mobile".to_string(), order: 3 },
        CategoryInfo { id: "frontend".to_string(), label: "Frontend".to_string(), order: 4 },
        CategoryInfo { id: "backend".to_string(), label: "Backend / Full-Stack".to_string(), order: 5 },
        CategoryInfo { id: "desktop".to_string(), label: "Desktop".to_string(), order: 6 },
        CategoryInfo { id: "tooling".to_string(), label: "Tooling & Libraries".to_string(), order: 7 },
    ];

    let templates = vec![
        // AI & LLM Apps
        ProjectTemplate {
            id: "create-llama".to_string(),
            name: "LlamaIndex".to_string(),
            description: "RAG & AI agents with LlamaIndex".to_string(),
            command: "npx create-llama@latest".to_string(),
            project_name_placeholder: "my-llama-app".to_string(),
            color: "purple".to_string(),
            category: "ai".to_string(),
            icon: "Brain".to_string(),
        },
        ProjectTemplate {
            id: "mastra".to_string(),
            name: "Mastra".to_string(),
            description: "TypeScript AI agent framework".to_string(),
            command: "npm create mastra@latest".to_string(),
            project_name_placeholder: "my-mastra-agent".to_string(),
            color: "blue".to_string(),
            category: "ai".to_string(),
            icon: "Bot".to_string(),
        },
        ProjectTemplate {
            id: "vercel-ai".to_string(),
            name: "Vercel AI Chatbot".to_string(),
            description: "Next.js AI chatbot with streaming".to_string(),
            command: "npx create-next-app --example https://github.com/vercel/ai-chatbot".to_string(),
            project_name_placeholder: "my-ai-chatbot".to_string(),
            color: "white".to_string(),
            category: "ai".to_string(),
            icon: "MessageSquare".to_string(),
        },
        ProjectTemplate {
            id: "agent-chat".to_string(),
            name: "LangGraph Chat".to_string(),
            description: "LangGraph agent chat application".to_string(),
            command: "npx create-agent-chat-app@latest".to_string(),
            project_name_placeholder: "my-agent-chat".to_string(),
            color: "yellow".to_string(),
            category: "ai".to_string(),
            icon: "Sparkles".to_string(),
        },
        ProjectTemplate {
            id: "copilotkit".to_string(),
            name: "CopilotKit".to_string(),
            description: "In-app AI copilots & agents".to_string(),
            command: "npx create-ag-ui-app@latest".to_string(),
            project_name_placeholder: "my-copilot".to_string(),
            color: "green".to_string(),
            category: "ai".to_string(),
            icon: "Cpu".to_string(),
        },
        ProjectTemplate {
            id: "langchain-next".to_string(),
            name: "LangChain + Next.js".to_string(),
            description: "LangChain starter with Vercel AI SDK".to_string(),
            command: "npx create-next-app --example https://github.com/langchain-ai/langchain-nextjs-template".to_string(),
            project_name_placeholder: "my-langchain-app".to_string(),
            color: "emerald".to_string(),
            category: "ai".to_string(),
            icon: "Brain".to_string(),
        },
        // Browser Extensions
        ProjectTemplate {
            id: "wxt".to_string(),
            name: "WXT".to_string(),
            description: "Next-gen framework for Chrome/Firefox/Safari".to_string(),
            command: "npx wxt@latest init".to_string(),
            project_name_placeholder: "my-extension".to_string(),
            color: "emerald".to_string(),
            category: "extensions".to_string(),
            icon: "Chrome".to_string(),
        },
        ProjectTemplate {
            id: "plasmo".to_string(),
            name: "Plasmo".to_string(),
            description: "React-based browser extension framework".to_string(),
            command: "npx plasmo init".to_string(),
            project_name_placeholder: "my-plasmo-ext".to_string(),
            color: "violet".to_string(),
            category: "extensions".to_string(),
            icon: "Puzzle".to_string(),
        },
        ProjectTemplate {
            id: "crxjs".to_string(),
            name: "CRXJS Vite".to_string(),
            description: "Chrome extension with Vite HMR".to_string(),
            command: "npm create vite@latest".to_string(),
            project_name_placeholder: "my-crxjs-ext".to_string(),
            color: "yellow".to_string(),
            category: "extensions".to_string(),
            icon: "Zap".to_string(),
        },
        ProjectTemplate {
            id: "chrome-ext-cli".to_string(),
            name: "Chrome Extension CLI".to_string(),
            description: "Official Chrome extension starter".to_string(),
            command: "npx chrome-extension-cli".to_string(),
            project_name_placeholder: "my-chrome-ext".to_string(),
            color: "blue".to_string(),
            category: "extensions".to_string(),
            icon: "Chrome".to_string(),
        },
        ProjectTemplate {
            id: "webext".to_string(),
            name: "WebExtension".to_string(),
            description: "Cross-browser extension boilerplate".to_string(),
            command: "npx degit AXeL-dev/browser-extension-boilerplate".to_string(),
            project_name_placeholder: "my-webext".to_string(),
            color: "orange".to_string(),
            category: "extensions".to_string(),
            icon: "Globe".to_string(),
        },
        ProjectTemplate {
            id: "bedframe".to_string(),
            name: "Bedframe".to_string(),
            description: "Multi-browser extension framework".to_string(),
            command: "npx create-bedframe@latest".to_string(),
            project_name_placeholder: "my-bedframe-ext".to_string(),
            color: "pink".to_string(),
            category: "extensions".to_string(),
            icon: "Layers".to_string(),
        },
        // Mobile
        ProjectTemplate {
            id: "expo".to_string(),
            name: "Expo".to_string(),
            description: "React Native with Expo SDK".to_string(),
            command: "npx create-expo-app@latest".to_string(),
            project_name_placeholder: "my-expo-app".to_string(),
            color: "violet".to_string(),
            category: "mobile".to_string(),
            icon: "Smartphone".to_string(),
        },
        ProjectTemplate {
            id: "react-native".to_string(),
            name: "React Native".to_string(),
            description: "Bare React Native CLI".to_string(),
            command: "npx @react-native-community/cli init".to_string(),
            project_name_placeholder: "MyRNApp".to_string(),
            color: "cyan".to_string(),
            category: "mobile".to_string(),
            icon: "Smartphone".to_string(),
        },
        ProjectTemplate {
            id: "flutter".to_string(),
            name: "Flutter".to_string(),
            description: "Google's cross-platform UI toolkit".to_string(),
            command: "flutter create".to_string(),
            project_name_placeholder: "my_flutter_app".to_string(),
            color: "sky".to_string(),
            category: "mobile".to_string(),
            icon: "Feather".to_string(),
        },
        ProjectTemplate {
            id: "ionic".to_string(),
            name: "Ionic".to_string(),
            description: "Hybrid mobile apps with web tech".to_string(),
            command: "npx @ionic/cli start".to_string(),
            project_name_placeholder: "my-ionic-app".to_string(),
            color: "blue".to_string(),
            category: "mobile".to_string(),
            icon: "Zap".to_string(),
        },
        // Frontend
        ProjectTemplate {
            id: "nextjs".to_string(),
            name: "Next.js".to_string(),
            description: "React framework with SSR & routing".to_string(),
            command: "npx create-next-app@latest".to_string(),
            project_name_placeholder: "my-next-app".to_string(),
            color: "white".to_string(),
            category: "frontend".to_string(),
            icon: "Globe".to_string(),
        },
        ProjectTemplate {
            id: "vite-react".to_string(),
            name: "React + Vite".to_string(),
            description: "Lightning fast React setup".to_string(),
            command: "npm create vite@latest".to_string(),
            project_name_placeholder: "my-react-app".to_string(),
            color: "cyan".to_string(),
            category: "frontend".to_string(),
            icon: "Atom".to_string(),
        },
        ProjectTemplate {
            id: "vue".to_string(),
            name: "Vue".to_string(),
            description: "Vue 3 with Vite".to_string(),
            command: "npm create vue@latest".to_string(),
            project_name_placeholder: "my-vue-app".to_string(),
            color: "emerald".to_string(),
            category: "frontend".to_string(),
            icon: "Triangle".to_string(),
        },
        ProjectTemplate {
            id: "nuxt".to_string(),
            name: "Nuxt".to_string(),
            description: "Vue meta-framework with SSR".to_string(),
            command: "npx nuxi@latest init".to_string(),
            project_name_placeholder: "my-nuxt-app".to_string(),
            color: "green".to_string(),
            category: "frontend".to_string(),
            icon: "Triangle".to_string(),
        },
        ProjectTemplate {
            id: "sveltekit".to_string(),
            name: "SvelteKit".to_string(),
            description: "Svelte meta-framework".to_string(),
            command: "npx sv create".to_string(),
            project_name_placeholder: "my-svelte-app".to_string(),
            color: "orange".to_string(),
            category: "frontend".to_string(),
            icon: "Flame".to_string(),
        },
        ProjectTemplate {
            id: "astro".to_string(),
            name: "Astro".to_string(),
            description: "Content-focused static sites".to_string(),
            command: "npm create astro@latest".to_string(),
            project_name_placeholder: "my-astro-site".to_string(),
            color: "purple".to_string(),
            category: "frontend".to_string(),
            icon: "Star".to_string(),
        },
        ProjectTemplate {
            id: "remix".to_string(),
            name: "Remix".to_string(),
            description: "Full-stack React framework".to_string(),
            command: "npx create-remix@latest".to_string(),
            project_name_placeholder: "my-remix-app".to_string(),
            color: "yellow".to_string(),
            category: "frontend".to_string(),
            icon: "Disc".to_string(),
        },
        ProjectTemplate {
            id: "solid".to_string(),
            name: "Solid".to_string(),
            description: "Solid.js with TypeScript".to_string(),
            command: "npx degit solidjs/templates/ts".to_string(),
            project_name_placeholder: "my-solid-app".to_string(),
            color: "blue".to_string(),
            category: "frontend".to_string(),
            icon: "Circle".to_string(),
        },
        ProjectTemplate {
            id: "qwik".to_string(),
            name: "Qwik".to_string(),
            description: "Resumable framework for instant apps".to_string(),
            command: "npm create qwik@latest".to_string(),
            project_name_placeholder: "my-qwik-app".to_string(),
            color: "indigo".to_string(),
            category: "frontend".to_string(),
            icon: "Zap".to_string(),
        },
        ProjectTemplate {
            id: "angular".to_string(),
            name: "Angular".to_string(),
            description: "Enterprise Angular framework".to_string(),
            command: "npx @angular/cli new".to_string(),
            project_name_placeholder: "my-angular-app".to_string(),
            color: "red".to_string(),
            category: "frontend".to_string(),
            icon: "Shield".to_string(),
        },
        // Backend / Full-Stack
        ProjectTemplate {
            id: "rails".to_string(),
            name: "Rails".to_string(),
            description: "Ruby on Rails full-stack framework".to_string(),
            command: "rails new".to_string(),
            project_name_placeholder: "my-rails-app".to_string(),
            color: "red".to_string(),
            category: "backend".to_string(),
            icon: "Train".to_string(),
        },
        ProjectTemplate {
            id: "express".to_string(),
            name: "Express".to_string(),
            description: "Minimal Node.js web framework".to_string(),
            command: "npx express-generator".to_string(),
            project_name_placeholder: "my-express-app".to_string(),
            color: "yellow".to_string(),
            category: "backend".to_string(),
            icon: "Zap".to_string(),
        },
        ProjectTemplate {
            id: "nestjs".to_string(),
            name: "Nest.js".to_string(),
            description: "Node.js enterprise framework".to_string(),
            command: "npx @nestjs/cli new".to_string(),
            project_name_placeholder: "my-nest-app".to_string(),
            color: "red".to_string(),
            category: "backend".to_string(),
            icon: "Server".to_string(),
        },
        ProjectTemplate {
            id: "fastify".to_string(),
            name: "Fastify".to_string(),
            description: "Fast Node.js web server".to_string(),
            command: "npx fastify-cli generate".to_string(),
            project_name_placeholder: "my-fastify-app".to_string(),
            color: "white".to_string(),
            category: "backend".to_string(),
            icon: "Rocket".to_string(),
        },
        ProjectTemplate {
            id: "hono".to_string(),
            name: "Hono".to_string(),
            description: "Ultrafast edge web framework".to_string(),
            command: "npm create hono@latest".to_string(),
            project_name_placeholder: "my-hono-app".to_string(),
            color: "orange".to_string(),
            category: "backend".to_string(),
            icon: "Flame".to_string(),
        },
        ProjectTemplate {
            id: "django".to_string(),
            name: "Django".to_string(),
            description: "Python web framework".to_string(),
            command: "django-admin startproject".to_string(),
            project_name_placeholder: "my_django_project".to_string(),
            color: "green".to_string(),
            category: "backend".to_string(),
            icon: "Database".to_string(),
        },
        ProjectTemplate {
            id: "phoenix".to_string(),
            name: "Phoenix".to_string(),
            description: "Elixir web framework".to_string(),
            command: "mix phx.new".to_string(),
            project_name_placeholder: "my_phoenix_app".to_string(),
            color: "orange".to_string(),
            category: "backend".to_string(),
            icon: "Flame".to_string(),
        },
        ProjectTemplate {
            id: "laravel".to_string(),
            name: "Laravel".to_string(),
            description: "PHP full-stack framework".to_string(),
            command: "composer create-project laravel/laravel".to_string(),
            project_name_placeholder: "my-laravel-app".to_string(),
            color: "red".to_string(),
            category: "backend".to_string(),
            icon: "Code".to_string(),
        },
        // Desktop
        ProjectTemplate {
            id: "tauri".to_string(),
            name: "Tauri".to_string(),
            description: "Build desktop apps with web tech".to_string(),
            command: "npm create tauri-app@latest".to_string(),
            project_name_placeholder: "my-tauri-app".to_string(),
            color: "orange".to_string(),
            category: "desktop".to_string(),
            icon: "Box".to_string(),
        },
        ProjectTemplate {
            id: "electron".to_string(),
            name: "Electron".to_string(),
            description: "Cross-platform desktop apps".to_string(),
            command: "npx create-electron-app@latest".to_string(),
            project_name_placeholder: "my-electron-app".to_string(),
            color: "sky".to_string(),
            category: "desktop".to_string(),
            icon: "MonitorSmartphone".to_string(),
        },
        // Tooling & Libraries
        ProjectTemplate {
            id: "oclif".to_string(),
            name: "CLI Tool".to_string(),
            description: "oclif - Build powerful CLI apps".to_string(),
            command: "npx oclif generate".to_string(),
            project_name_placeholder: "my-cli".to_string(),
            color: "green".to_string(),
            category: "tooling".to_string(),
            icon: "Terminal".to_string(),
        },
        ProjectTemplate {
            id: "turborepo".to_string(),
            name: "Turborepo".to_string(),
            description: "Monorepo build system".to_string(),
            command: "npx create-turbo@latest".to_string(),
            project_name_placeholder: "my-turborepo".to_string(),
            color: "pink".to_string(),
            category: "tooling".to_string(),
            icon: "Boxes".to_string(),
        },
        ProjectTemplate {
            id: "t3".to_string(),
            name: "T3 Stack".to_string(),
            description: "Next.js + tRPC + Prisma + Tailwind".to_string(),
            command: "npm create t3-app@latest".to_string(),
            project_name_placeholder: "my-t3-app".to_string(),
            color: "violet".to_string(),
            category: "tooling".to_string(),
            icon: "Layers".to_string(),
        },
        ProjectTemplate {
            id: "payload".to_string(),
            name: "Payload CMS".to_string(),
            description: "Headless CMS for Next.js".to_string(),
            command: "npx create-payload-app@latest".to_string(),
            project_name_placeholder: "my-payload-app".to_string(),
            color: "blue".to_string(),
            category: "tooling".to_string(),
            icon: "Database".to_string(),
        },
        ProjectTemplate {
            id: "docusaurus".to_string(),
            name: "Docusaurus".to_string(),
            description: "Documentation static site generator".to_string(),
            command: "npx create-docusaurus@latest".to_string(),
            project_name_placeholder: "my-docs".to_string(),
            color: "green".to_string(),
            category: "tooling".to_string(),
            icon: "BookOpen".to_string(),
        },
        ProjectTemplate {
            id: "storybook".to_string(),
            name: "Storybook".to_string(),
            description: "Component development environment".to_string(),
            command: "npx storybook@latest init".to_string(),
            project_name_placeholder: "my-storybook".to_string(),
            color: "pink".to_string(),
            category: "tooling".to_string(),
            icon: "Book".to_string(),
        },
    ];

    Ok(Json(TemplatesResponse { templates, categories }))
}

// ============================================================================
// Filesystem API
// ============================================================================

#[derive(Debug, Deserialize)]
struct FilesystemBrowseQuery {
    path: String,
}

#[derive(Debug, Serialize)]
struct DirectoryEntry {
    name: String,
    path: String,
    is_directory: bool,
    size: Option<u64>,
    modified: Option<u64>,
}

#[derive(Debug, Serialize)]
struct FilesystemBrowseResponse {
    path: String,
    parent: Option<String>,
    entries: Vec<DirectoryEntry>,
}

/// Browse a directory and list its contents
async fn filesystem_browse(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Query(query): Query<FilesystemBrowseQuery>,
) -> Result<Json<FilesystemBrowseResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let path = std::path::PathBuf::from(&query.path);

    if !path.exists() {
        return Err((StatusCode::NOT_FOUND, "Path not found".to_string()));
    }

    if !path.is_dir() {
        return Err((StatusCode::BAD_REQUEST, "Path is not a directory".to_string()));
    }

    let parent = path.parent().map(|p| p.to_string_lossy().to_string());

    let mut entries = Vec::new();

    if let Ok(dir_entries) = std::fs::read_dir(&path) {
        for entry in dir_entries.flatten() {
            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            // Skip hidden files/directories
            if name.starts_with('.') {
                continue;
            }

            let metadata = entry.metadata().ok();
            let is_directory = entry_path.is_dir();

            entries.push(DirectoryEntry {
                name,
                path: entry_path.to_string_lossy().to_string(),
                is_directory,
                size: if is_directory { None } else { metadata.as_ref().map(|m| m.len()) },
                modified: metadata
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs()),
            });
        }
    }

    // Sort: directories first, then by name
    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(Json(FilesystemBrowseResponse {
        path: path.to_string_lossy().to_string(),
        parent,
        entries,
    }))
}

#[derive(Debug, Deserialize)]
struct FilesystemMkdirRequest {
    path: String,
}

#[derive(Debug, Serialize)]
struct FilesystemMkdirResponse {
    path: String,
    created: bool,
}

/// Create a new directory
async fn filesystem_mkdir(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<FilesystemMkdirRequest>,
) -> Result<Json<FilesystemMkdirResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let path = std::path::PathBuf::from(&req.path);

    // Check if parent directory exists
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            return Err((StatusCode::BAD_REQUEST, "Parent directory does not exist".to_string()));
        }
    }

    // Check if path already exists
    if path.exists() {
        return Ok(Json(FilesystemMkdirResponse {
            path: path.to_string_lossy().to_string(),
            created: false,
        }));
    }

    // Create the directory
    tokio::fs::create_dir(&path)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create directory: {}", e)))?;

    Ok(Json(FilesystemMkdirResponse {
        path: path.to_string_lossy().to_string(),
        created: true,
    }))
}

#[derive(Debug, Serialize)]
struct FilesystemHomedirResponse {
    path: String,
}

/// Get the user's home directory
async fn filesystem_homedir(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
) -> Result<Json<FilesystemHomedirResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let home = dirs::home_dir()
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Could not determine home directory".to_string()))?;

    Ok(Json(FilesystemHomedirResponse {
        path: home.to_string_lossy().to_string(),
    }))
}

// ============================================================================
// Terminal/PTY API
// ============================================================================

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::io::Read;

// Store PTY instances for mobile API
struct MobilePtyInstance {
    writer: Box<dyn Write + Send>,
    #[allow(dead_code)]
    master: Box<dyn MasterPty + Send>,
    #[allow(dead_code)]
    reader_handle: Option<std::thread::JoinHandle<()>>,
}

lazy_static::lazy_static! {
    static ref MOBILE_PTY_INSTANCES: std::sync::Mutex<HashMap<String, MobilePtyInstance>> =
        std::sync::Mutex::new(HashMap::new());
}

#[derive(Debug, Deserialize)]
struct TerminalCreateRequest {
    cwd: String,
    cols: Option<u16>,
    rows: Option<u16>,
    shell: Option<String>,
}

#[derive(Debug, Serialize)]
struct TerminalCreateResponse {
    pty_id: String,
}

/// Create a new terminal PTY session
async fn terminal_create(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<TerminalCreateRequest>,
) -> Result<Json<TerminalCreateResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let cols = req.cols.unwrap_or(80);
    let rows = req.rows.unwrap_or(24);

    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to open PTY: {}", e)))?;

    let pty_id = uuid::Uuid::new_v4().to_string();

    // Use provided shell or fall back to user's default shell
    let shell = req.shell.unwrap_or_else(|| {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
    });

    let mut cmd = CommandBuilder::new(&shell);
    cmd.cwd(&req.cwd);

    // Set up environment
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to spawn shell: {}", e)))?;

    // Get reader and writer
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to clone reader: {}", e)))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to take writer: {}", e)))?;

    // Spawn a thread to read from the PTY and broadcast via WebSocket
    let pty_id_clone = pty_id.clone();
    let state_tx = state.state_tx.clone();

    let reader_handle = std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = state_tx.send(StateUpdate::TerminalOutput {
                        pty_id: pty_id_clone.clone(),
                        data,
                    });
                }
                Err(_) => break,
            }
        }
    });

    // Store PTY instance
    let mut instances = MOBILE_PTY_INSTANCES.lock().expect("MOBILE_PTY_INSTANCES mutex poisoned");
    instances.insert(
        pty_id.clone(),
        MobilePtyInstance {
            writer,
            master: pair.master,
            reader_handle: Some(reader_handle),
        },
    );

    // Spawn a thread to wait for the child process and clean up
    let pty_id_for_wait = pty_id.clone();
    std::thread::spawn(move || {
        let _ = child.wait();
        // Clean up when the process exits
        let mut instances = MOBILE_PTY_INSTANCES.lock().expect("MOBILE_PTY_INSTANCES mutex poisoned");
        instances.remove(&pty_id_for_wait);
    });

    Ok(Json(TerminalCreateResponse { pty_id }))
}

#[derive(Debug, Deserialize)]
struct TerminalWriteRequest {
    data: String,
}

/// Write data to a terminal PTY
async fn terminal_write(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(pty_id): Path<String>,
    Json(req): Json<TerminalWriteRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let mut instances = MOBILE_PTY_INSTANCES.lock().expect("MOBILE_PTY_INSTANCES mutex poisoned");

    if let Some(instance) = instances.get_mut(&pty_id) {
        instance
            .writer
            .write_all(req.data.as_bytes())
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to write to PTY: {}", e)))?;
        instance
            .writer
            .flush()
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to flush PTY: {}", e)))?;
        Ok(StatusCode::OK)
    } else {
        Err((StatusCode::NOT_FOUND, "PTY not found".to_string()))
    }
}

/// Close a terminal PTY
async fn terminal_close(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Path(pty_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let mut instances = MOBILE_PTY_INSTANCES.lock().expect("MOBILE_PTY_INSTANCES mutex poisoned");
    instances.remove(&pty_id);
    Ok(StatusCode::OK)
}

// ============================================================================
// Live Preview API
// ============================================================================

#[derive(Debug, Deserialize)]
struct PreviewDetectQuery {
    project_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PreviewDetectResponse {
    framework: Option<String>,
    start_command: Option<String>,
    dev_port: Option<u16>,
}

/// Detect project framework and suggest dev server command
async fn preview_detect(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Query(query): Query<PreviewDetectQuery>,
) -> Result<Json<PreviewDetectResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    let project_path = std::path::PathBuf::from(&query.project_path);

    // Check for various framework indicators
    let package_json = project_path.join("package.json");
    let cargo_toml = project_path.join("Cargo.toml");
    let gemfile = project_path.join("Gemfile");
    let requirements_txt = project_path.join("requirements.txt");

    if package_json.exists() {
        // Node.js project - read package.json to detect framework
        if let Ok(content) = tokio::fs::read_to_string(&package_json).await {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                let deps = json.get("dependencies").and_then(|d| d.as_object());
                let dev_deps = json.get("devDependencies").and_then(|d| d.as_object());

                let has_dep = |name: &str| {
                    deps.map(|d| d.contains_key(name)).unwrap_or(false)
                        || dev_deps.map(|d| d.contains_key(name)).unwrap_or(false)
                };

                if has_dep("next") {
                    return Ok(Json(PreviewDetectResponse {
                        framework: Some("Next.js".to_string()),
                        start_command: Some("npm run dev".to_string()),
                        dev_port: Some(3000),
                    }));
                }
                if has_dep("nuxt") {
                    return Ok(Json(PreviewDetectResponse {
                        framework: Some("Nuxt".to_string()),
                        start_command: Some("npm run dev".to_string()),
                        dev_port: Some(3000),
                    }));
                }
                if has_dep("vite") {
                    return Ok(Json(PreviewDetectResponse {
                        framework: Some("Vite".to_string()),
                        start_command: Some("npm run dev".to_string()),
                        dev_port: Some(5173),
                    }));
                }
                if has_dep("astro") {
                    return Ok(Json(PreviewDetectResponse {
                        framework: Some("Astro".to_string()),
                        start_command: Some("npm run dev".to_string()),
                        dev_port: Some(4321),
                    }));
                }
                if has_dep("@sveltejs/kit") {
                    return Ok(Json(PreviewDetectResponse {
                        framework: Some("SvelteKit".to_string()),
                        start_command: Some("npm run dev".to_string()),
                        dev_port: Some(5173),
                    }));
                }
                if has_dep("react-scripts") {
                    return Ok(Json(PreviewDetectResponse {
                        framework: Some("Create React App".to_string()),
                        start_command: Some("npm start".to_string()),
                        dev_port: Some(3000),
                    }));
                }
                if has_dep("express") {
                    return Ok(Json(PreviewDetectResponse {
                        framework: Some("Express".to_string()),
                        start_command: Some("npm start".to_string()),
                        dev_port: Some(3000),
                    }));
                }

                // Generic Node.js project
                return Ok(Json(PreviewDetectResponse {
                    framework: Some("Node.js".to_string()),
                    start_command: Some("npm run dev".to_string()),
                    dev_port: Some(3000),
                }));
            }
        }
    }

    if cargo_toml.exists() {
        return Ok(Json(PreviewDetectResponse {
            framework: Some("Rust/Cargo".to_string()),
            start_command: Some("cargo run".to_string()),
            dev_port: Some(8080),
        }));
    }

    if gemfile.exists() {
        // Check if it's Rails
        if project_path.join("config/application.rb").exists() {
            return Ok(Json(PreviewDetectResponse {
                framework: Some("Ruby on Rails".to_string()),
                start_command: Some("rails server".to_string()),
                dev_port: Some(3000),
            }));
        }
        return Ok(Json(PreviewDetectResponse {
            framework: Some("Ruby".to_string()),
            start_command: None,
            dev_port: None,
        }));
    }

    if requirements_txt.exists() || project_path.join("pyproject.toml").exists() {
        // Check for Django
        if project_path.join("manage.py").exists() {
            return Ok(Json(PreviewDetectResponse {
                framework: Some("Django".to_string()),
                start_command: Some("python manage.py runserver".to_string()),
                dev_port: Some(8000),
            }));
        }
        return Ok(Json(PreviewDetectResponse {
            framework: Some("Python".to_string()),
            start_command: None,
            dev_port: None,
        }));
    }

    // Check for static HTML site (index.html in root or public folder)
    let has_index_html = project_path.join("index.html").exists()
        || project_path.join("public/index.html").exists();

    if has_index_html {
        return Ok(Json(PreviewDetectResponse {
            framework: Some("Static Site".to_string()),
            start_command: None, // Static server doesn't need a command
            dev_port: Some(9876),
        }));
    }

    Ok(Json(PreviewDetectResponse {
        framework: None,
        start_command: None,
        dev_port: None,
    }))
}

// Request/Response types for preview
#[derive(Debug, Deserialize)]
struct PreviewStartRequest {
    project_path: String,
    port: Option<u16>,
    use_framework_server: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PreviewStartResponse {
    server_id: String,
    port: u16,
    url: String,
    local_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PreviewStopRequest {
    server_id: String,
}

#[derive(Debug, Deserialize)]
struct PreviewStatusQuery {
    server_id: Option<String>,
}

async fn preview_start(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<PreviewStartRequest>,
) -> Result<Json<PreviewStartResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get the app handle to call the Tauri-managed preview manager
    let app_handle_guard = state.app_handle.read().await;
    let app_handle = app_handle_guard.as_ref()
        .ok_or((StatusCode::SERVICE_UNAVAILABLE, "Desktop app not available".to_string()))?;

    // Use the preview manager and process registry from Tauri state
    use tauri::Manager;
    let preview_manager: tauri::State<'_, Arc<PreviewManager>> = app_handle.state();
    let process_registry: tauri::State<'_, Arc<ProcessRegistry>> = app_handle.state();

    // Get a webview window for emitting events
    let window = app_handle.get_webview_window("main")
        .ok_or((StatusCode::SERVICE_UNAVAILABLE, "No main window available".to_string()))?;

    let port = req.port;
    let use_framework = req.use_framework_server.unwrap_or(true);

    // Call the actual start function - this runs the server
    let server_id = crate::live_preview::start_preview_server(
        window,
        preview_manager.clone(),
        process_registry.clone(),
        req.project_path.clone(),
        port,
        use_framework,
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    // Get the server info using the new accessor method
    let (server_port, url, local_url) = preview_manager.get_started_server_info(&server_id)
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Server started but info not found".to_string()))?;

    let response = PreviewStartResponse {
        server_id: server_id.clone(),
        port: server_port,
        url: url.clone(),
        local_url: local_url.clone(),
    };

    // Get full server info for WebSocket broadcast
    if let Some(server_info) = preview_manager.get_server_info(&server_id) {
        let _ = state.state_tx.send(StateUpdate::PreviewUpdate {
            server_id: server_id.clone(),
            action: "started".to_string(),
            server: Some(PreviewServerWs {
                server_id: server_info.server_id,
                project_path: server_info.project_path,
                project_type: format!("{:?}", server_info.project_type),
                port: server_info.port,
                url: server_info.url,
                local_url: server_info.local_url,
                status: format!("{:?}", server_info.status).to_lowercase(),
                is_framework_server: server_info.is_framework_server,
                started_at: server_info.started_at,
            }),
        });
    }

    Ok(Json(response))
}

async fn preview_stop(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<PreviewStopRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get the app handle
    use tauri::Manager;
    let app_handle_guard = state.app_handle.read().await;
    let app_handle = app_handle_guard.as_ref()
        .ok_or((StatusCode::SERVICE_UNAVAILABLE, "Desktop app not available".to_string()))?;

    let preview_manager: tauri::State<'_, Arc<PreviewManager>> = app_handle.state();
    let process_registry: tauri::State<'_, Arc<ProcessRegistry>> = app_handle.state();

    // Stop the server
    crate::live_preview::stop_preview_server(
        preview_manager,
        process_registry,
        req.server_id.clone(),
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::PreviewUpdate {
        server_id: req.server_id.clone(),
        action: "stopped".to_string(),
        server: None,
    });

    Ok(StatusCode::OK)
}

async fn preview_status(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Query(query): Query<PreviewStatusQuery>,
) -> Result<Json<Option<serde_json::Value>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get the app handle
    use tauri::Manager;
    let app_handle_guard = state.app_handle.read().await;
    let app_handle = match app_handle_guard.as_ref() {
        Some(h) => h,
        None => return Ok(Json(None)),
    };

    let preview_manager: tauri::State<'_, Arc<PreviewManager>> = app_handle.state();

    if let Some(server_id) = query.server_id {
        // Get specific server using the accessor method
        if let Some(server) = preview_manager.get_server_info(&server_id) {
            Ok(Json(Some(serde_json::json!({
                "serverId": server.server_id,
                "projectPath": server.project_path,
                "projectType": format!("{:?}", server.project_type),
                "port": server.port,
                "url": server.url,
                "localUrl": server.local_url,
                "status": format!("{:?}", server.status).to_lowercase(),
                "isFrameworkServer": server.is_framework_server,
                "startedAt": server.started_at
            }))))
        } else {
            Ok(Json(None))
        }
    } else {
        // Return first running server or null
        let servers = preview_manager.list_all_servers();
        let running = servers.iter().find(|s| s.status == LivePreviewStatus::Running);
        if let Some(server) = running {
            Ok(Json(Some(serde_json::json!({
                "serverId": server.server_id,
                "projectPath": server.project_path,
                "projectType": format!("{:?}", server.project_type),
                "port": server.port,
                "url": server.url,
                "localUrl": server.local_url,
                "status": format!("{:?}", server.status).to_lowercase(),
                "isFrameworkServer": server.is_framework_server,
                "startedAt": server.started_at
            }))))
        } else {
            Ok(Json(None))
        }
    }
}

async fn preview_list(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get the app handle
    use tauri::Manager;
    let app_handle_guard = state.app_handle.read().await;
    let app_handle = match app_handle_guard.as_ref() {
        Some(h) => h,
        None => return Ok(Json(vec![])),
    };

    let preview_manager: tauri::State<'_, Arc<PreviewManager>> = app_handle.state();
    let servers = preview_manager.list_all_servers();

    let list: Vec<serde_json::Value> = servers.iter()
        .map(|server| serde_json::json!({
            "serverId": server.server_id,
            "projectPath": server.project_path,
            "projectType": format!("{:?}", server.project_type),
            "port": server.port,
            "url": server.url,
            "localUrl": server.local_url,
            "status": format!("{:?}", server.status).to_lowercase(),
            "isFrameworkServer": server.is_framework_server,
            "startedAt": server.started_at
        }))
        .collect();

    Ok(Json(list))
}

// ============================================================================
// Tunnel API
// ============================================================================

#[derive(Debug, Serialize)]
struct TunnelCheckResponse {
    installed: bool,
    version: Option<String>,
}

async fn tunnel_check(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
) -> Result<Json<TunnelCheckResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Check if cloudflared is installed
    let output = std::process::Command::new("cloudflared")
        .arg("--version")
        .output();

    match output {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout).to_string();
            Ok(Json(TunnelCheckResponse {
                installed: true,
                version: Some(version.trim().to_string()),
            }))
        }
        _ => Ok(Json(TunnelCheckResponse {
            installed: false,
            version: None,
        })),
    }
}

// Request/Response types for tunnel
#[derive(Debug, Deserialize)]
struct TunnelStartRequest {
    port: u16,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TunnelStartResponse {
    tunnel_id: String,
}

#[derive(Debug, Deserialize)]
struct TunnelStopRequest {
    tunnel_id: String,
}

async fn tunnel_start(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<TunnelStartRequest>,
) -> Result<Json<TunnelStartResponse>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get the app handle
    use tauri::Manager;
    let app_handle_guard = state.app_handle.read().await;
    let app_handle = app_handle_guard.as_ref()
        .ok_or((StatusCode::SERVICE_UNAVAILABLE, "Desktop app not available".to_string()))?;

    let tunnel_manager: tauri::State<'_, Arc<TunnelManager>> = app_handle.state();
    let process_registry: tauri::State<'_, Arc<ProcessRegistry>> = app_handle.state();

    // Get a webview window for emitting events
    let window = app_handle.get_webview_window("main")
        .ok_or((StatusCode::SERVICE_UNAVAILABLE, "No main window available".to_string()))?;

    // Call the actual start function
    let tunnel_id = crate::tunnel::start_tunnel(
        window,
        tunnel_manager.clone(),
        process_registry.clone(),
        req.port,
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::TunnelUpdate {
        tunnel_id: tunnel_id.clone(),
        action: "starting".to_string(),
        tunnel: Some(TunnelInfoWs {
            tunnel_id: tunnel_id.clone(),
            port: req.port,
            url: None,
            status: "starting".to_string(),
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64,
        }),
    });

    Ok(Json(TunnelStartResponse { tunnel_id }))
}

async fn tunnel_stop(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
    Json(req): Json<TunnelStopRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get the app handle
    use tauri::Manager;
    let app_handle_guard = state.app_handle.read().await;
    let app_handle = app_handle_guard.as_ref()
        .ok_or((StatusCode::SERVICE_UNAVAILABLE, "Desktop app not available".to_string()))?;

    let tunnel_manager: tauri::State<'_, Arc<TunnelManager>> = app_handle.state();
    let process_registry: tauri::State<'_, Arc<ProcessRegistry>> = app_handle.state();

    // Stop the tunnel
    crate::tunnel::stop_tunnel(
        tunnel_manager,
        process_registry,
        req.tunnel_id.clone(),
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    // Broadcast to WebSocket clients
    let _ = state.state_tx.send(StateUpdate::TunnelUpdate {
        tunnel_id: req.tunnel_id.clone(),
        action: "stopped".to_string(),
        tunnel: None,
    });

    Ok(StatusCode::OK)
}

async fn tunnel_list(
    State(state): State<Arc<AppState>>,
    auth: Option<TypedHeader<Authorization<Bearer>>>,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    validate_token(&state, auth).await?;

    // Get the app handle
    use tauri::Manager;
    let app_handle_guard = state.app_handle.read().await;
    let app_handle = match app_handle_guard.as_ref() {
        Some(h) => h,
        None => return Ok(Json(vec![])),
    };

    let tunnel_manager: tauri::State<'_, Arc<TunnelManager>> = app_handle.state();
    let tunnels = tunnel_manager.list_all_tunnels();

    let list: Vec<serde_json::Value> = tunnels.iter()
        .map(|tunnel| serde_json::json!({
            "tunnelId": tunnel.tunnel_id,
            "port": tunnel.port,
            "url": tunnel.url,
            "status": format!("{:?}", tunnel.status).to_lowercase(),
            "createdAt": tunnel.created_at
        }))
        .collect();

    Ok(Json(list))
}
