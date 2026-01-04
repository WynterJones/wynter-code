use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use futures_util::{SinkExt, StreamExt};
use hkdf::Hkdf;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, RwLock};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use x25519_dalek::{PublicKey, StaticSecret};

use crate::mobile_api::StateUpdate;

const HKDF_INFO: &[u8] = b"wynter-relay-v1";

/// HTTP request tunneled through relay
#[derive(Debug, Clone, Serialize, Deserialize)]
struct HttpRequest {
    #[serde(rename = "type")]
    msg_type: String,
    request_id: String,
    method: String,
    endpoint: String,
    body: Option<serde_json::Value>,
}

/// HTTP response sent back through relay
#[derive(Debug, Clone, Serialize, Deserialize)]
struct HttpResponse {
    #[serde(rename = "type")]
    msg_type: String,
    request_id: String,
    status: u16,
    body: Option<serde_json::Value>,
    error: Option<String>,
}

/// HTTP stream chunk for SSE responses via relay (batched delivery)
#[derive(Debug, Clone, Serialize, Deserialize)]
struct HttpStreamChunk {
    #[serde(rename = "type")]
    msg_type: String,
    request_id: String,
    sequence: u32,
    chunks: Vec<String>,
    is_final: bool,
}

/// Outbound message types (for internal channel)
#[derive(Debug, Clone)]
enum OutboundMessage {
    Http(HttpResponse),
    HttpStream(HttpStreamChunk),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayConfig {
    pub url: String,
    pub enabled: bool,
    pub desktop_id: String,
    pub private_key: String,
    pub public_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub peer_public_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub peer_token: Option<String>,
    /// The device ID of the mobile peer (persisted for pre-keyed connections)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub peer_device_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayStatus {
    pub connected: bool,
    pub peer_online: bool,
    pub pending_count: u32,
    pub relay_url: Option<String>,
    pub desktop_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayPairingData {
    pub mode: String,
    pub relay_url: String,
    pub desktop_id: String,
    pub public_key: String,
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ClientMessage {
    Handshake {
        device_id: String,
        peer_id: String,
        token: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        public_key: Option<String>,
    },
    Message {
        envelope: EncryptedEnvelope,
    },
    Ping,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ServerMessage {
    HandshakeAck {
        success: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        error: Option<String>,
    },
    Message {
        envelope: EncryptedEnvelope,
    },
    PeerStatus {
        online: bool,
        pending_count: u32,
    },
    /// Sent when a peer connects and provides their public key for key exchange
    PeerConnected {
        peer_id: String,
        public_key: String,
    },
    Pong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EncryptedEnvelope {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    sender_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    recipient_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    timestamp: Option<u64>,
    nonce: String,
    ciphertext: String,
}

pub struct RelayClient {
    config: Arc<RwLock<Option<RelayConfig>>>,
    status: Arc<RwLock<RelayStatus>>,
    sender_tx: Arc<RwLock<Option<mpsc::Sender<OutboundMessage>>>>,
    state_broadcast: broadcast::Sender<StateUpdate>,
    shutdown_tx: Arc<RwLock<Option<mpsc::Sender<()>>>>,
    mobile_api_port: Arc<RwLock<Option<u16>>>,
    /// The actual device ID of the connected mobile peer (received via PeerConnected)
    peer_device_id: Arc<RwLock<Option<String>>>,
}

impl RelayClient {
    pub fn new(state_broadcast: broadcast::Sender<StateUpdate>) -> Self {
        Self {
            config: Arc::new(RwLock::new(None)),
            status: Arc::new(RwLock::new(RelayStatus {
                connected: false,
                peer_online: false,
                pending_count: 0,
                relay_url: None,
                desktop_id: None,
            })),
            sender_tx: Arc::new(RwLock::new(None)),
            state_broadcast,
            shutdown_tx: Arc::new(RwLock::new(None)),
            mobile_api_port: Arc::new(RwLock::new(None)),
            peer_device_id: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn configure(&self, url: String) -> Result<RelayConfig, String> {
        let (private_key, public_key) = generate_keypair();
        let desktop_id = uuid::Uuid::new_v4().to_string();
        let token = generate_token();

        let config = RelayConfig {
            url,
            enabled: true, // Ready to connect immediately - E2E starts after peer connects
            desktop_id,
            private_key,
            public_key,
            peer_public_key: None,
            peer_token: Some(token),
            peer_device_id: None,
        };

        self.save_config(&config)?;
        *self.config.write().await = Some(config.clone());

        Ok(config)
    }

    pub async fn connect(&self) -> Result<(), String> {
        // Disconnect any existing connection first to avoid channel conflicts
        if self.status.read().await.connected {
            let _ = self.disconnect().await;
        }

        let config = self.config.read().await.clone();
        let config = config.ok_or("Relay not configured")?;

        if !config.enabled {
            return Err("Relay is not enabled".to_string());
        }

        let peer_token = config
            .peer_token
            .as_ref()
            .ok_or("No peer token configured")?;

        // Derive encryption key if peer public key is already known (pre-paired)
        // Otherwise, we'll derive it when PeerConnected is received
        let initial_encryption_key: Option<[u8; 32]> = if let Some(ref peer_public_key) = config.peer_public_key {
            Some(derive_shared_key(&config.private_key, peer_public_key)?)
        } else {
            None
        };

        // Initialize peer_device_id from config if available (for pre-keyed connections)
        if let Some(ref peer_id) = config.peer_device_id {
            *self.peer_device_id.write().await = Some(peer_id.clone());
            println!("[relay] Using persisted peer device ID: {}", peer_id);
        }

        let ws_url = format!("{}/ws", config.url);
        let (ws_stream, _) = connect_async(&ws_url)
            .await
            .map_err(|e| format!("WebSocket connection failed: {}", e))?;

        let (mut write, mut read) = ws_stream.split();

        let handshake = ClientMessage::Handshake {
            device_id: config.desktop_id.clone(),
            peer_id: "mobile".to_string(),
            token: peer_token.clone(),
            public_key: Some(config.public_key.clone()),
        };

        let handshake_json = serde_json::to_string(&handshake)
            .map_err(|e| format!("Failed to serialize handshake: {}", e))?;

        write
            .send(Message::Text(handshake_json))
            .await
            .map_err(|e| format!("Failed to send handshake: {}", e))?;

        let (outbound_tx, mut outbound_rx) = mpsc::channel::<OutboundMessage>(32);
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);

        *self.sender_tx.write().await = Some(outbound_tx.clone());
        *self.shutdown_tx.write().await = Some(shutdown_tx);

        let status = self.status.clone();
        let config_clone = config.clone();
        let state_broadcast = self.state_broadcast.clone();
        let self_config = self.config.clone();
        let mobile_api_port = self.mobile_api_port.clone();
        let peer_device_id = self.peer_device_id.clone();

        // Encryption key can be updated when peer connects
        let encryption_key: Arc<RwLock<Option<[u8; 32]>>> = Arc::new(RwLock::new(initial_encryption_key));
        let encryption_key_for_loop = encryption_key.clone();

        tokio::spawn(async move {
            // Ping interval to keep WebSocket alive through NAT/mobile networks
            let mut ping_interval = tokio::time::interval(std::time::Duration::from_secs(30));
            ping_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

            loop {
                tokio::select! {
                    // Periodic ping to keep connection alive
                    _ = ping_interval.tick() => {
                        let ping_msg = ClientMessage::Ping;
                        if let Ok(json) = serde_json::to_string(&ping_msg) {
                            if write.send(Message::Text(json)).await.is_err() {
                                eprintln!("[relay] Failed to send ping, connection may be dead");
                                break;
                            }
                        }
                    }
                    msg = read.next() => {
                        match msg {
                            Some(Ok(Message::Text(text))) => {
                                if let Ok(server_msg) = serde_json::from_str::<ServerMessage>(&text) {
                                    match server_msg {
                                        ServerMessage::HandshakeAck { success, error } => {
                                            if success {
                                                println!("[relay] Connected to relay server");
                                                let mut s = status.write().await;
                                                s.connected = true;
                                                s.relay_url = Some(config_clone.url.clone());
                                                s.desktop_id = Some(config_clone.desktop_id.clone());
                                            } else {
                                                eprintln!("[relay] Handshake failed: {:?}", error);
                                                break;
                                            }
                                        }
                                        ServerMessage::PeerConnected { peer_id: actual_peer_id, public_key } => {
                                            println!("[relay] Peer connected: {} with public key", actual_peer_id);
                                            // Store the actual peer device ID for message routing
                                            *peer_device_id.write().await = Some(actual_peer_id.clone());
                                            // Derive encryption key from peer's public key
                                            match derive_shared_key(&config_clone.private_key, &public_key) {
                                                Ok(key) => {
                                                    *encryption_key_for_loop.write().await = Some(key);
                                                    // Update stored config with peer's public key and device ID, then persist
                                                    if let Some(ref mut cfg) = *self_config.write().await {
                                                        cfg.peer_public_key = Some(public_key.clone());
                                                        cfg.peer_device_id = Some(actual_peer_id.clone());
                                                        // Persist config so subsequent connections can pre-derive key
                                                        persist_relay_config(cfg);
                                                    }
                                                    let mut s = status.write().await;
                                                    s.peer_online = true;
                                                    println!("[relay] Encryption key derived, ready for E2E communication");
                                                }
                                                Err(e) => {
                                                    eprintln!("[relay] Failed to derive encryption key: {}", e);
                                                }
                                            }
                                        }
                                        ServerMessage::PeerStatus { online, pending_count } => {
                                            let mut s = status.write().await;
                                            s.peer_online = online;
                                            s.pending_count = pending_count;
                                            println!("[relay] Peer status: online={}, pending={}", online, pending_count);
                                        }
                                        ServerMessage::Message { envelope } => {
                                            let key_guard = encryption_key_for_loop.read().await;
                                            if let Some(ref key) = *key_guard {
                                                if let Ok(plaintext) = decrypt_message(&envelope, key) {
                                                    // Try to parse as HTTP request first
                                                    if let Ok(http_req) = serde_json::from_slice::<HttpRequest>(&plaintext) {
                                                        if http_req.msg_type == "http_request" {
                                                            // Handle HTTP request tunneling
                                                            let port = mobile_api_port.read().await.unwrap_or(8765);
                                                            let outbound_tx_clone = outbound_tx.clone();
                                                            let _request_id = http_req.request_id.clone();
                                                            // Get the relay token for auth
                                                            let auth_token = config_clone.peer_token.clone().unwrap_or_default();

                                                            // Route /mobile/chat to streaming handler
                                                            if http_req.endpoint == "/mobile/chat" {
                                                                tokio::spawn(async move {
                                                                    handle_http_request_streaming(
                                                                        http_req,
                                                                        port,
                                                                        &auth_token,
                                                                        outbound_tx_clone,
                                                                    )
                                                                    .await;
                                                                });
                                                            } else {
                                                                tokio::spawn(async move {
                                                                    let response = handle_http_request(http_req, port, &auth_token).await;
                                                                    let _ = outbound_tx_clone.send(OutboundMessage::Http(response)).await;
                                                                });
                                                            }
                                                            continue;
                                                        }
                                                    }

                                                    // Otherwise try as StateUpdate
                                                    if let Ok(state_update) = serde_json::from_slice::<StateUpdate>(&plaintext) {
                                                        let _ = state_broadcast.send(state_update);
                                                    }
                                                }
                                            } else {
                                                eprintln!("[relay] Received encrypted message but no encryption key available");
                                            }
                                        }
                                        ServerMessage::Pong => {}
                                    }
                                }
                            }
                            Some(Ok(Message::Close(_))) | None => {
                                println!("[relay] Connection closed");
                                break;
                            }
                            Some(Err(e)) => {
                                eprintln!("[relay] WebSocket error: {}", e);
                                break;
                            }
                            _ => {}
                        }
                    }
                    update = outbound_rx.recv() => {
                        if let Some(outbound_msg) = update {
                            // Check if peer is online before sending (especially important for streaming)
                            let is_peer_online = status.read().await.peer_online;
                            if !is_peer_online {
                                // Skip sending if peer is offline - don't waste resources
                                // For stream chunks, this prevents queueing up messages for disconnected peers
                                if matches!(outbound_msg, OutboundMessage::HttpStream(_)) {
                                    println!("[relay] Skipping stream chunk - peer is offline");
                                    continue;
                                }
                            }

                            let key_guard = encryption_key_for_loop.read().await;
                            let peer_id_guard = peer_device_id.read().await;
                            if let (Some(ref key), Some(ref recipient_id)) = (*key_guard, peer_id_guard.as_ref()) {
                                let plaintext = match &outbound_msg {
                                    OutboundMessage::Http(http_response) => serde_json::to_vec(http_response),
                                    OutboundMessage::HttpStream(stream_chunk) => serde_json::to_vec(stream_chunk),
                                };

                                if let Ok(plaintext) = plaintext {
                                    if let Ok(envelope) = encrypt_message(
                                        &plaintext,
                                        &config_clone.desktop_id,
                                        recipient_id,
                                        key,
                                    ) {
                                        let msg = ClientMessage::Message { envelope };
                                        if let Ok(json) = serde_json::to_string(&msg) {
                                            let _ = write.send(Message::Text(json)).await;
                                        }
                                    }
                                }
                            } else {
                                eprintln!("[relay] Cannot send message: no encryption key or peer ID available");
                            }
                        }
                    }
                    _ = shutdown_rx.recv() => {
                        println!("[relay] Shutdown requested");
                        let _ = write.send(Message::Close(None)).await;
                        break;
                    }
                }
            }

            let mut s = status.write().await;
            s.connected = false;
            s.peer_online = false;
        });

        Ok(())
    }

    pub async fn disconnect(&self) -> Result<(), String> {
        if let Some(shutdown_tx) = self.shutdown_tx.write().await.take() {
            let _ = shutdown_tx.send(()).await;
        }

        *self.sender_tx.write().await = None;

        let mut status = self.status.write().await;
        status.connected = false;
        status.peer_online = false;

        Ok(())
    }

    pub async fn get_status(&self) -> RelayStatus {
        self.status.read().await.clone()
    }

    pub async fn generate_pairing_data(&self) -> Result<RelayPairingData, String> {
        let config = self.config.read().await.clone();
        let config = config.ok_or("Relay not configured")?;

        Ok(RelayPairingData {
            mode: "relay".to_string(),
            relay_url: config.url,
            desktop_id: config.desktop_id,
            public_key: config.public_key,
            token: config.peer_token.unwrap_or_default(),
        })
    }

    pub async fn set_peer_public_key(&self, peer_public_key: String) -> Result<(), String> {
        let mut config = self.config.write().await;
        if let Some(ref mut cfg) = *config {
            cfg.peer_public_key = Some(peer_public_key);
            cfg.enabled = true;
            self.save_config(cfg)?;
        }
        Ok(())
    }

    pub async fn set_mobile_api_port(&self, port: u16) {
        *self.mobile_api_port.write().await = Some(port);
    }

    pub async fn get_config(&self) -> Option<RelayConfig> {
        self.config.read().await.clone()
    }

    pub async fn load_config(&self) -> Result<Option<RelayConfig>, String> {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let config_path = std::path::Path::new(&home)
            .join(".wynter-code")
            .join("relay_config.json");

        if !config_path.exists() {
            return Ok(None);
        }

        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read relay config: {}", e))?;

        let config: RelayConfig = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse relay config: {}", e))?;

        *self.config.write().await = Some(config.clone());

        Ok(Some(config))
    }

    fn save_config(&self, config: &RelayConfig) -> Result<(), String> {
        use std::io::Write;
        #[cfg(unix)]
        use std::os::unix::fs::PermissionsExt;

        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let config_dir = std::path::Path::new(&home).join(".wynter-code");
        let config_path = config_dir.join("relay_config.json");

        std::fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;

        #[cfg(unix)]
        {
            let _ = std::fs::set_permissions(&config_dir, std::fs::Permissions::from_mode(0o700));
        }

        let content = serde_json::to_string_pretty(config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        let mut file = std::fs::File::create(&config_path)
            .map_err(|e| format!("Failed to create config file: {}", e))?;

        file.write_all(content.as_bytes())
            .map_err(|e| format!("Failed to write config file: {}", e))?;

        #[cfg(unix)]
        {
            let _ = std::fs::set_permissions(&config_path, std::fs::Permissions::from_mode(0o600));
        }

        Ok(())
    }
}

fn generate_keypair() -> (String, String) {
    let secret = StaticSecret::random_from_rng(rand::thread_rng());
    let public = PublicKey::from(&secret);

    let private_key = BASE64.encode(secret.as_bytes());
    let public_key = BASE64.encode(public.as_bytes());

    (private_key, public_key)
}

fn generate_token() -> String {
    use rand::Rng;
    let mut bytes = [0u8; 24];
    rand::thread_rng().fill(&mut bytes);
    BASE64.encode(&bytes)
}

/// Standalone function to save relay config to disk
fn persist_relay_config(config: &RelayConfig) {
    use std::io::Write;
    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;

    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let config_dir = std::path::Path::new(&home).join(".wynter-code");
    let config_path = config_dir.join("relay_config.json");

    if std::fs::create_dir_all(&config_dir).is_err() {
        return;
    }

    #[cfg(unix)]
    {
        let _ = std::fs::set_permissions(&config_dir, std::fs::Permissions::from_mode(0o700));
    }

    if let Ok(content) = serde_json::to_string_pretty(config) {
        if let Ok(mut file) = std::fs::File::create(&config_path) {
            let _ = file.write_all(content.as_bytes());
            #[cfg(unix)]
            {
                let _ = std::fs::set_permissions(&config_path, std::fs::Permissions::from_mode(0o600));
            }
        }
    }
}

fn derive_shared_key(private_key_b64: &str, peer_public_key_b64: &str) -> Result<[u8; 32], String> {
    let private_bytes = BASE64
        .decode(private_key_b64)
        .map_err(|e| format!("Invalid private key: {}", e))?;

    let public_bytes = BASE64
        .decode(peer_public_key_b64)
        .map_err(|e| format!("Invalid peer public key: {}", e))?;

    if private_bytes.len() != 32 {
        return Err("Private key must be 32 bytes".to_string());
    }
    if public_bytes.len() != 32 {
        return Err("Public key must be 32 bytes".to_string());
    }

    let mut private_arr = [0u8; 32];
    private_arr.copy_from_slice(&private_bytes);

    let mut public_arr = [0u8; 32];
    public_arr.copy_from_slice(&public_bytes);

    let secret = StaticSecret::from(private_arr);
    let peer_public = PublicKey::from(public_arr);

    let shared_secret = secret.diffie_hellman(&peer_public);

    let hk = Hkdf::<Sha256>::new(None, shared_secret.as_bytes());
    let mut okm = [0u8; 32];
    hk.expand(HKDF_INFO, &mut okm)
        .map_err(|_| "HKDF expansion failed".to_string())?;

    Ok(okm)
}

fn encrypt_message(
    plaintext: &[u8],
    sender_id: &str,
    recipient_id: &str,
    key: &[u8; 32],
) -> Result<EncryptedEnvelope, String> {
    let cipher = XChaCha20Poly1305::new_from_slice(key)
        .map_err(|e| format!("Invalid key: {}", e))?;

    let mut nonce_bytes = [0u8; 24];
    rand::Rng::fill(&mut rand::thread_rng(), &mut nonce_bytes);
    let nonce = XNonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    Ok(EncryptedEnvelope {
        sender_id: Some(sender_id.to_string()),
        recipient_id: Some(recipient_id.to_string()),
        timestamp: Some(timestamp),
        nonce: BASE64.encode(&nonce_bytes),
        ciphertext: BASE64.encode(&ciphertext),
    })
}

fn decrypt_message(envelope: &EncryptedEnvelope, key: &[u8; 32]) -> Result<Vec<u8>, String> {
    let cipher = XChaCha20Poly1305::new_from_slice(key)
        .map_err(|e| format!("Invalid key: {}", e))?;

    let nonce_bytes = BASE64
        .decode(&envelope.nonce)
        .map_err(|e| format!("Invalid nonce: {}", e))?;

    if nonce_bytes.len() != 24 {
        return Err("Nonce must be 24 bytes".to_string());
    }

    let nonce = XNonce::from_slice(&nonce_bytes);

    let ciphertext = BASE64
        .decode(&envelope.ciphertext)
        .map_err(|e| format!("Invalid ciphertext: {}", e))?;

    cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| format!("Decryption failed: {}", e))
}

/// Handle an HTTP request by forwarding to the local mobile API server
async fn handle_http_request(req: HttpRequest, port: u16, auth_token: &str) -> HttpResponse {
    let url = format!("http://127.0.0.1:{}/api/v1{}", port, req.endpoint);

    println!("[relay] Forwarding HTTP {} {} to local API", req.method, req.endpoint);

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return HttpResponse {
                msg_type: "http_response".to_string(),
                request_id: req.request_id,
                status: 500,
                body: None,
                error: Some(format!("Failed to create HTTP client: {}", e)),
            };
        }
    };

    let request_builder = match req.method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PATCH" => client.patch(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => {
            return HttpResponse {
                msg_type: "http_response".to_string(),
                request_id: req.request_id,
                status: 400,
                body: None,
                error: Some(format!("Unsupported HTTP method: {}", req.method)),
            };
        }
    };

    // Add Authorization header with the relay token for internal auth bypass
    let request_builder = request_builder
        .header("Authorization", format!("Bearer {}", auth_token));

    // Add body if present
    let request_builder = if let Some(body) = req.body {
        request_builder
            .header("Content-Type", "application/json")
            .json(&body)
    } else {
        request_builder
    };

    match request_builder.send().await {
        Ok(response) => {
            let status = response.status().as_u16();
            // Get the response text first to preserve it for error reporting
            let response_text = response.text().await.unwrap_or_default();

            // Try to parse as JSON
            match serde_json::from_str::<serde_json::Value>(&response_text) {
                Ok(body) => {
                    println!("[relay] HTTP {} {} -> {} (JSON response)", req.method, req.endpoint, status);
                    HttpResponse {
                        msg_type: "http_response".to_string(),
                        request_id: req.request_id,
                        status,
                        body: Some(body),
                        error: None,
                    }
                }
                Err(_) => {
                    // For non-2xx responses with non-JSON body, report the error
                    if status >= 400 {
                        println!("[relay] HTTP {} {} -> {} error: {}", req.method, req.endpoint, status, response_text);
                        HttpResponse {
                            msg_type: "http_response".to_string(),
                            request_id: req.request_id,
                            status,
                            body: None,
                            error: Some(response_text),
                        }
                    } else {
                        // Success with empty or non-JSON body (e.g., 204 No Content)
                        println!("[relay] HTTP {} {} -> {} (no body)", req.method, req.endpoint, status);
                        HttpResponse {
                            msg_type: "http_response".to_string(),
                            request_id: req.request_id,
                            status,
                            body: None,
                            error: None,
                        }
                    }
                }
            }
        }
        Err(e) => {
            println!("[relay] HTTP {} {} -> request failed: {}", req.method, req.endpoint, e);
            HttpResponse {
                msg_type: "http_response".to_string(),
                request_id: req.request_id,
                status: 500,
                body: None,
                error: Some(format!("HTTP request failed: {}", e)),
            }
        }
    }
}

/// Handle SSE streaming HTTP request with batched relay delivery (200ms batching)
async fn handle_http_request_streaming(
    req: HttpRequest,
    port: u16,
    auth_token: &str,
    outbound_tx: mpsc::Sender<OutboundMessage>,
) {
    use futures_util::TryStreamExt;

    let url = format!("http://127.0.0.1:{}/api/v1{}", port, req.endpoint);
    let request_id = req.request_id.clone();

    println!("[relay] Forwarding streaming HTTP {} {} to local API", req.method, req.endpoint);

    // No total timeout for streaming - sessions can last hours
    // Use connect_timeout for fast failure if API server is down
    // Use read_timeout to detect stalled streams (5 minutes of no data)
    let client = match reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .read_timeout(std::time::Duration::from_secs(300))
        .tcp_keepalive(std::time::Duration::from_secs(60))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            let _ = outbound_tx
                .send(OutboundMessage::HttpStream(HttpStreamChunk {
                    msg_type: "http_stream_chunk".to_string(),
                    request_id,
                    sequence: 0,
                    chunks: vec![format!(r#"{{"type":"error","error":"{}"}}"#, e)],
                    is_final: true,
                }))
                .await;
            return;
        }
    };

    let response = match client
        .post(&url)
        .header("Authorization", format!("Bearer {}", auth_token))
        .header("Content-Type", "application/json")
        .header("Accept", "text/event-stream")
        .json(&req.body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            let _ = outbound_tx
                .send(OutboundMessage::HttpStream(HttpStreamChunk {
                    msg_type: "http_stream_chunk".to_string(),
                    request_id,
                    sequence: 0,
                    chunks: vec![format!(r#"{{"type":"error","error":"{}"}}"#, e)],
                    is_final: true,
                }))
                .await;
            return;
        }
    };

    // Stream the response with 200ms batching
    let mut byte_stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut sequence: u32 = 0;
    let mut pending_lines: Vec<String> = Vec::new();
    let mut last_send = std::time::Instant::now();
    const BATCH_INTERVAL_MS: u128 = 200;

    while let Ok(Some(bytes)) = byte_stream.try_next().await {
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        // Extract complete lines
        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.starts_with("data: ") {
                let data = line[6..].trim().to_string();
                let is_done = data == "[DONE]";
                pending_lines.push(data);

                if is_done {
                    // Send final batch immediately
                    let _ = outbound_tx
                        .send(OutboundMessage::HttpStream(HttpStreamChunk {
                            msg_type: "http_stream_chunk".to_string(),
                            request_id: request_id.clone(),
                            sequence,
                            chunks: std::mem::take(&mut pending_lines),
                            is_final: true,
                        }))
                        .await;
                    println!("[relay] Streaming complete for {}", req.endpoint);
                    return;
                }
            }
        }

        // Check if batch interval elapsed
        if last_send.elapsed().as_millis() >= BATCH_INTERVAL_MS && !pending_lines.is_empty() {
            let _ = outbound_tx
                .send(OutboundMessage::HttpStream(HttpStreamChunk {
                    msg_type: "http_stream_chunk".to_string(),
                    request_id: request_id.clone(),
                    sequence,
                    chunks: std::mem::take(&mut pending_lines),
                    is_final: false,
                }))
                .await;
            sequence += 1;
            last_send = std::time::Instant::now();
        }
    }

    // Send any remaining chunks (stream ended without [DONE])
    if !pending_lines.is_empty() {
        let _ = outbound_tx
            .send(OutboundMessage::HttpStream(HttpStreamChunk {
                msg_type: "http_stream_chunk".to_string(),
                request_id,
                sequence,
                chunks: pending_lines,
                is_final: true,
            }))
            .await;
    }
}

#[tauri::command]
pub async fn relay_configure(
    url: String,
    relay_client: tauri::State<'_, Arc<RelayClient>>,
) -> Result<RelayConfig, String> {
    relay_client.configure(url).await
}

#[tauri::command]
pub async fn relay_connect(
    relay_client: tauri::State<'_, Arc<RelayClient>>,
) -> Result<(), String> {
    relay_client.connect().await
}

#[tauri::command]
pub async fn relay_disconnect(
    relay_client: tauri::State<'_, Arc<RelayClient>>,
) -> Result<(), String> {
    relay_client.disconnect().await
}

#[tauri::command]
pub async fn relay_status(
    relay_client: tauri::State<'_, Arc<RelayClient>>,
) -> Result<RelayStatus, String> {
    Ok(relay_client.get_status().await)
}

#[tauri::command]
pub async fn relay_generate_pairing_code(
    relay_client: tauri::State<'_, Arc<RelayClient>>,
) -> Result<RelayPairingData, String> {
    relay_client.generate_pairing_data().await
}

#[tauri::command]
pub async fn relay_set_peer_key(
    peer_public_key: String,
    relay_client: tauri::State<'_, Arc<RelayClient>>,
) -> Result<(), String> {
    relay_client.set_peer_public_key(peer_public_key).await
}

#[tauri::command]
pub async fn relay_get_config(
    relay_client: tauri::State<'_, Arc<RelayClient>>,
) -> Result<Option<RelayConfig>, String> {
    Ok(relay_client.get_config().await)
}

#[tauri::command]
pub async fn relay_load_config(
    relay_client: tauri::State<'_, Arc<RelayClient>>,
) -> Result<Option<RelayConfig>, String> {
    relay_client.load_config().await
}

#[tauri::command]
pub async fn relay_set_mobile_api_port(
    port: u16,
    relay_client: tauri::State<'_, Arc<RelayClient>>,
) -> Result<(), String> {
    relay_client.set_mobile_api_port(port).await;
    Ok(())
}
