use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{Emitter, State};
use uuid::Uuid;

// ============================================================================
// HTTP Client Types
// ============================================================================

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpRequestPayload {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub query_params: HashMap<String, String>,
    pub body: Option<String>,
    pub body_type: String,
    pub auth: AuthPayload,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthPayload {
    #[serde(rename = "type")]
    pub auth_type: String,
    pub bearer_token: Option<String>,
    pub basic_username: Option<String>,
    pub basic_password: Option<String>,
    pub api_key_name: Option<String>,
    pub api_key_value: Option<String>,
    pub api_key_location: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpResponsePayload {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub body_size: usize,
    pub response_time: u64,
}

// ============================================================================
// Webhook Server Types
// ============================================================================

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebhookServerInfo {
    pub id: String,
    pub port: u16,
    pub path: String,
    pub is_running: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebhookRequestEvent {
    pub id: String,
    pub server_id: String,
    pub method: String,
    pub path: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub timestamp: i64,
}

struct WebhookServerInstance {
    port: u16,
    path: String,
    shutdown_signal: Arc<Mutex<bool>>,
}

pub struct WebhookManager {
    servers: Mutex<HashMap<String, WebhookServerInstance>>,
}

impl WebhookManager {
    pub fn new() -> Self {
        Self {
            servers: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for WebhookManager {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// HTTP Client Command
// ============================================================================

#[tauri::command]
pub async fn send_http_request(payload: HttpRequestPayload) -> Result<HttpResponsePayload, String> {
    let start = Instant::now();

    // Build URL with query params
    let mut url = match reqwest::Url::parse(&payload.url) {
        Ok(u) => u,
        Err(e) => return Err(format!("Invalid URL: {}", e)),
    };

    // Add query params
    for (key, value) in &payload.query_params {
        url.query_pairs_mut().append_pair(key, value);
    }

    // Add API key to query if configured
    if payload.auth.auth_type == "api-key" && payload.auth.api_key_location == Some("query".to_string()) {
        if let (Some(name), Some(value)) = (&payload.auth.api_key_name, &payload.auth.api_key_value) {
            url.query_pairs_mut().append_pair(name, value);
        }
    }

    // Create client
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Build request
    let method = payload.method.parse::<reqwest::Method>()
        .map_err(|e| format!("Invalid HTTP method: {}", e))?;

    let mut request = client.request(method, url);

    // Add headers
    for (key, value) in &payload.headers {
        request = request.header(key.as_str(), value.as_str());
    }

    // Add auth headers
    match payload.auth.auth_type.as_str() {
        "bearer" => {
            if let Some(token) = &payload.auth.bearer_token {
                request = request.header("Authorization", format!("Bearer {}", token));
            }
        }
        "basic" => {
            if let (Some(username), Some(password)) = (&payload.auth.basic_username, &payload.auth.basic_password) {
                let credentials = base64::Engine::encode(
                    &base64::engine::general_purpose::STANDARD,
                    format!("{}:{}", username, password),
                );
                request = request.header("Authorization", format!("Basic {}", credentials));
            }
        }
        "api-key" => {
            if payload.auth.api_key_location != Some("query".to_string()) {
                if let (Some(name), Some(value)) = (&payload.auth.api_key_name, &payload.auth.api_key_value) {
                    request = request.header(name.as_str(), value.as_str());
                }
            }
        }
        _ => {}
    }

    // Add body
    if let Some(body) = &payload.body {
        if !body.is_empty() {
            // Set content-type based on body type if not already set
            let has_content_type = payload.headers.keys().any(|k| k.to_lowercase() == "content-type");
            if !has_content_type {
                match payload.body_type.as_str() {
                    "json" => {
                        request = request.header("Content-Type", "application/json");
                    }
                    "form-data" => {
                        request = request.header("Content-Type", "multipart/form-data");
                    }
                    "x-www-form-urlencoded" => {
                        request = request.header("Content-Type", "application/x-www-form-urlencoded");
                    }
                    _ => {}
                }
            }
            request = request.body(body.clone());
        }
    }

    // Send request
    let response = request.send().await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("").to_string();

    // Collect headers
    let headers: HashMap<String, String> = response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();

    // Read body
    let body = response.text().await.unwrap_or_default();
    let body_size = body.len();

    let response_time = start.elapsed().as_millis() as u64;

    Ok(HttpResponsePayload {
        status,
        status_text,
        headers,
        body,
        body_size,
        response_time,
    })
}

// ============================================================================
// Webhook Server Commands
// ============================================================================

#[tauri::command]
pub async fn start_webhook_server(
    window: tauri::Window,
    state: State<'_, Arc<WebhookManager>>,
    port: u16,
    path: String,
) -> Result<String, String> {
    let server_id = Uuid::new_v4().to_string();
    let shutdown_signal = Arc::new(Mutex::new(false));

    // Create server
    let server = tiny_http::Server::http(format!("0.0.0.0:{}", port))
        .map_err(|e| format!("Failed to start webhook server: {}", e))?;

    // Store instance
    {
        let mut servers = state.servers.lock().unwrap();
        servers.insert(
            server_id.clone(),
            WebhookServerInstance {
                port,
                path: path.clone(),
                shutdown_signal: shutdown_signal.clone(),
            },
        );
    }

    let server_id_clone = server_id.clone();
    let path_clone = path.clone();

    std::thread::spawn(move || {
        loop {
            // Check shutdown signal
            if *shutdown_signal.lock().unwrap() {
                break;
            }

            match server.recv_timeout(std::time::Duration::from_millis(500)) {
                Ok(Some(mut request)) => {
                    let request_path = request.url().to_string();

                    // Only process requests matching the configured path
                    if request_path.starts_with(&path_clone) || path_clone == "/" {
                        // Collect headers
                        let headers: HashMap<String, String> = request
                            .headers()
                            .iter()
                            .map(|h| (h.field.to_string(), h.value.to_string()))
                            .collect();

                        // Read body
                        let mut body = String::new();
                        let mut reader = request.as_reader();
                        let _ = reader.take(1024 * 1024).read_to_string(&mut body);

                        let event = WebhookRequestEvent {
                            id: Uuid::new_v4().to_string(),
                            server_id: server_id_clone.clone(),
                            method: request.method().to_string(),
                            path: request_path.clone(),
                            headers,
                            body,
                            timestamp: SystemTime::now()
                                .duration_since(UNIX_EPOCH)
                                .unwrap()
                                .as_millis() as i64,
                        };

                        // Emit event to frontend
                        let _ = window.emit("webhook-request", serde_json::json!({
                            "serverId": server_id_clone,
                            "request": event
                        }));

                        // Send response
                        let response = tiny_http::Response::from_string("{\"status\":\"ok\"}")
                            .with_header(
                                tiny_http::Header::from_bytes(&b"Content-Type"[..], b"application/json").unwrap()
                            )
                            .with_status_code(200);
                        let _ = request.respond(response);
                    } else {
                        // Not found for other paths
                        let response = tiny_http::Response::from_string("Not Found")
                            .with_status_code(404);
                        let _ = request.respond(response);
                    }
                }
                Ok(None) => continue,
                Err(_) => break,
            }
        }
    });

    Ok(server_id)
}

#[tauri::command]
pub async fn stop_webhook_server(
    state: State<'_, Arc<WebhookManager>>,
    server_id: String,
) -> Result<(), String> {
    let mut servers = state.servers.lock().unwrap();
    if let Some(instance) = servers.get(&server_id) {
        let mut signal = instance.shutdown_signal.lock().unwrap();
        *signal = true;
    }
    servers.remove(&server_id);
    Ok(())
}

#[tauri::command]
pub fn list_webhook_servers(
    state: State<'_, Arc<WebhookManager>>,
) -> Result<Vec<WebhookServerInfo>, String> {
    let servers = state.servers.lock().unwrap();
    let list: Vec<WebhookServerInfo> = servers
        .iter()
        .map(|(id, instance)| WebhookServerInfo {
            id: id.clone(),
            port: instance.port,
            path: instance.path.clone(),
            is_running: !*instance.shutdown_signal.lock().unwrap(),
        })
        .collect();
    Ok(list)
}
