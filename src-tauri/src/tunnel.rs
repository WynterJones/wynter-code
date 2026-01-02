use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, State};
use uuid::Uuid;

use crate::process_registry::ProcessRegistry;

/// Minimum port for tunnels (non-privileged ports only)
const MIN_TUNNEL_PORT: u16 = 1024;

/// Validate that a port is in a safe range for tunneling
fn validate_tunnel_port(port: u16) -> Result<(), String> {
    if port < MIN_TUNNEL_PORT {
        return Err(format!(
            "Security: Port {} is in the privileged range (< {}). Use a port >= {}",
            port, MIN_TUNNEL_PORT, MIN_TUNNEL_PORT
        ));
    }
    // Note: No upper bound check needed - u16 max is 65535, which is the valid port max
    Ok(())
}

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum TunnelStatus {
    Starting,
    Connected,
    Reconnecting,
    Failed,
    Stopped,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TunnelInfo {
    pub tunnel_id: String,
    pub port: u16,
    pub url: Option<String>,
    pub status: TunnelStatus,
    pub error: Option<String>,
    pub created_at: i64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TunnelEvent {
    pub tunnel_id: String,
    pub event_type: String,
    pub url: Option<String>,
    pub status: Option<TunnelStatus>,
    pub message: Option<String>,
}

struct TunnelInstance {
    port: u16,
    url: Option<String>,
    status: TunnelStatus,
    #[allow(dead_code)]
    child_pid: Option<u32>,
    created_at: i64,
}

pub struct TunnelManager {
    tunnels: Mutex<HashMap<String, TunnelInstance>>,
}

impl TunnelManager {
    pub fn new() -> Self {
        Self {
            tunnels: Mutex::new(HashMap::new()),
        }
    }

    /// Get info for a specific tunnel by ID
    #[allow(dead_code)]
    pub fn get_tunnel_info(&self, tunnel_id: &str) -> Option<TunnelInfo> {
        let tunnels = self.tunnels.lock().expect("Tunnel manager mutex poisoned");
        tunnels.get(tunnel_id).map(|instance| TunnelInfo {
            tunnel_id: tunnel_id.to_string(),
            port: instance.port,
            url: instance.url.clone(),
            status: instance.status.clone(),
            error: None,
            created_at: instance.created_at,
        })
    }

    /// List all tunnels
    pub fn list_all_tunnels(&self) -> Vec<TunnelInfo> {
        let tunnels = self.tunnels.lock().expect("Tunnel manager mutex poisoned");
        tunnels.iter().map(|(id, instance)| TunnelInfo {
            tunnel_id: id.clone(),
            port: instance.port,
            url: instance.url.clone(),
            status: instance.status.clone(),
            error: None,
            created_at: instance.created_at,
        }).collect()
    }

    /// Get tunnel URL and status for immediate response
    #[allow(dead_code)]
    pub fn get_tunnel_status(&self, tunnel_id: &str) -> Option<(Option<String>, TunnelStatus)> {
        let tunnels = self.tunnels.lock().expect("Tunnel manager mutex poisoned");
        tunnels.get(tunnel_id).map(|t| (t.url.clone(), t.status.clone()))
    }
}

impl Default for TunnelManager {
    fn default() -> Self {
        Self::new()
    }
}

#[tauri::command]
pub async fn check_cloudflared_installed() -> Result<bool, String> {
    let output = Command::new("which")
        .arg("cloudflared")
        .output()
        .map_err(|e| format!("Failed to check cloudflared: {}", e))?;

    Ok(output.status.success())
}

#[tauri::command]
pub async fn start_tunnel(
    window: tauri::WebviewWindow,
    state: State<'_, Arc<TunnelManager>>,
    registry: State<'_, Arc<ProcessRegistry>>,
    port: u16,
) -> Result<String, String> {
    // Security: Validate port is in allowed range
    validate_tunnel_port(port)?;

    let tunnel_id = Uuid::new_v4().to_string();
    let created_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    // Create initial tunnel instance
    {
        let mut tunnels = state.tunnels.lock().expect("Tunnel manager mutex poisoned");
        tunnels.insert(
            tunnel_id.clone(),
            TunnelInstance {
                port,
                url: None,
                status: TunnelStatus::Starting,
                child_pid: None,
                created_at,
            },
        );
    }

    // Emit starting event
    #[cfg(debug_assertions)]
    if let Err(e) = window.emit(
        "tunnel-event",
        TunnelEvent {
            tunnel_id: tunnel_id.clone(),
            event_type: "status_change".to_string(),
            url: None,
            status: Some(TunnelStatus::Starting),
            message: Some("Starting tunnel...".to_string()),
        },
    ) {
        eprintln!("[DEBUG] Failed to emit 'tunnel-event': {}", e);
    }
    #[cfg(not(debug_assertions))]
    let _ = window.emit(
        "tunnel-event",
        TunnelEvent {
            tunnel_id: tunnel_id.clone(),
            event_type: "status_change".to_string(),
            url: None,
            status: Some(TunnelStatus::Starting),
            message: Some("Starting tunnel...".to_string()),
        },
    );

    // Spawn cloudflared process
    let mut child = Command::new("cloudflared")
        .args(["tunnel", "--url", &format!("http://localhost:{}", port)])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            let mut tunnels = state.tunnels.lock().expect("Tunnel manager mutex poisoned");
            tunnels.remove(&tunnel_id);
            format!("Failed to start cloudflared: {}", e)
        })?;

    let child_pid = child.id();

    // Register with process registry for safe termination
    registry.register(child_pid);

    // Update with PID
    {
        let mut tunnels = state.tunnels.lock().expect("Tunnel manager mutex poisoned");
        if let Some(tunnel) = tunnels.get_mut(&tunnel_id) {
            tunnel.child_pid = Some(child_pid);
        }
    }

    // Spawn thread to monitor output and capture URL
    let tunnel_id_clone = tunnel_id.clone();
    let state_clone = state.inner().clone();
    let window_clone = window.clone();

    std::thread::spawn(move || {
        // cloudflared outputs to stderr
        if let Some(stderr) = child.stderr.take() {
            let reader = BufReader::new(stderr);
            let url_regex = regex::Regex::new(r"https://[a-z0-9-]+\.trycloudflare\.com").unwrap();

            for line in reader.lines() {
                if let Ok(line) = line {
                    // Check for URL in output
                    if let Some(url_match) = url_regex.find(&line) {
                        let url = url_match.as_str().to_string();

                        // Update tunnel with URL
                        {
                            let mut tunnels = state_clone.tunnels.lock().expect("Tunnel manager mutex poisoned");
                            if let Some(tunnel) = tunnels.get_mut(&tunnel_id_clone) {
                                tunnel.url = Some(url.clone());
                                tunnel.status = TunnelStatus::Connected;
                            }
                        }

                        // Emit URL ready event
                        #[cfg(debug_assertions)]
                        if let Err(e) = window_clone.emit(
                            "tunnel-event",
                            TunnelEvent {
                                tunnel_id: tunnel_id_clone.clone(),
                                event_type: "url_ready".to_string(),
                                url: Some(url.clone()),
                                status: Some(TunnelStatus::Connected),
                                message: Some("Tunnel connected!".to_string()),
                            },
                        ) {
                            eprintln!("[DEBUG] Failed to emit 'tunnel-event': {}", e);
                        }
                        #[cfg(not(debug_assertions))]
                        let _ = window_clone.emit(
                            "tunnel-event",
                            TunnelEvent {
                                tunnel_id: tunnel_id_clone.clone(),
                                event_type: "url_ready".to_string(),
                                url: Some(url),
                                status: Some(TunnelStatus::Connected),
                                message: Some("Tunnel connected!".to_string()),
                            },
                        );
                    }

                    // Check for reconnection messages
                    if line.contains("Retrying") || line.contains("reconnect") {
                        {
                            let mut tunnels = state_clone.tunnels.lock().expect("Tunnel manager mutex poisoned");
                            if let Some(tunnel) = tunnels.get_mut(&tunnel_id_clone) {
                                tunnel.status = TunnelStatus::Reconnecting;
                            }
                        }

                        #[cfg(debug_assertions)]
                        if let Err(e) = window_clone.emit(
                            "tunnel-event",
                            TunnelEvent {
                                tunnel_id: tunnel_id_clone.clone(),
                                event_type: "status_change".to_string(),
                                url: None,
                                status: Some(TunnelStatus::Reconnecting),
                                message: Some("Reconnecting...".to_string()),
                            },
                        ) {
                            eprintln!("[DEBUG] Failed to emit 'tunnel-event': {}", e);
                        }
                        #[cfg(not(debug_assertions))]
                        let _ = window_clone.emit(
                            "tunnel-event",
                            TunnelEvent {
                                tunnel_id: tunnel_id_clone.clone(),
                                event_type: "status_change".to_string(),
                                url: None,
                                status: Some(TunnelStatus::Reconnecting),
                                message: Some("Reconnecting...".to_string()),
                            },
                        );
                    }

                    // Emit output for debugging
                    #[cfg(debug_assertions)]
                    if let Err(e) = window_clone.emit(
                        "tunnel-event",
                        TunnelEvent {
                            tunnel_id: tunnel_id_clone.clone(),
                            event_type: "output".to_string(),
                            url: None,
                            status: None,
                            message: Some(line.clone()),
                        },
                    ) {
                        eprintln!("[DEBUG] Failed to emit 'tunnel-event': {}", e);
                    }
                    #[cfg(not(debug_assertions))]
                    let _ = window_clone.emit(
                        "tunnel-event",
                        TunnelEvent {
                            tunnel_id: tunnel_id_clone.clone(),
                            event_type: "output".to_string(),
                            url: None,
                            status: None,
                            message: Some(line),
                        },
                    );
                }
            }
        }

        // Process ended - clean up
        let exit_status = child.wait();
        let error_msg = match exit_status {
            Ok(status) if status.success() => None,
            Ok(status) => Some(format!("Process exited with code: {:?}", status.code())),
            Err(e) => Some(format!("Failed to wait on process: {}", e)),
        };

        {
            let mut tunnels = state_clone.tunnels.lock().expect("Tunnel manager mutex poisoned");
            if let Some(tunnel) = tunnels.get_mut(&tunnel_id_clone) {
                tunnel.status = TunnelStatus::Stopped;
            }
        }

        #[cfg(debug_assertions)]
        if let Err(e) = window_clone.emit(
            "tunnel-event",
            TunnelEvent {
                tunnel_id: tunnel_id_clone.clone(),
                event_type: "status_change".to_string(),
                url: None,
                status: Some(TunnelStatus::Stopped),
                message: error_msg.clone(),
            },
        ) {
            eprintln!("[DEBUG] Failed to emit 'tunnel-event': {}", e);
        }
        #[cfg(not(debug_assertions))]
        let _ = window_clone.emit(
            "tunnel-event",
            TunnelEvent {
                tunnel_id: tunnel_id_clone,
                event_type: "status_change".to_string(),
                url: None,
                status: Some(TunnelStatus::Stopped),
                message: error_msg,
            },
        );
    });

    Ok(tunnel_id)
}

#[tauri::command]
pub async fn stop_tunnel(
    state: State<'_, Arc<TunnelManager>>,
    registry: State<'_, Arc<ProcessRegistry>>,
    tunnel_id: String,
) -> Result<(), String> {
    let child_pid = {
        let tunnels = state.tunnels.lock().expect("Tunnel manager mutex poisoned");
        tunnels
            .get(&tunnel_id)
            .and_then(|t| t.child_pid)
    };

    if let Some(pid) = child_pid {
        // Kill the cloudflared process
        let _ = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
        // Unregister from process registry
        registry.unregister(pid);
    }

    // Remove from manager
    let mut tunnels = state.tunnels.lock().expect("Tunnel manager mutex poisoned");
    tunnels.remove(&tunnel_id);

    Ok(())
}

#[tauri::command]
pub fn list_tunnels(state: State<'_, Arc<TunnelManager>>) -> Result<Vec<TunnelInfo>, String> {
    let tunnels = state.tunnels.lock().expect("Tunnel manager mutex poisoned");

    let tunnel_list: Vec<TunnelInfo> = tunnels
        .iter()
        .map(|(id, instance)| TunnelInfo {
            tunnel_id: id.clone(),
            port: instance.port,
            url: instance.url.clone(),
            status: instance.status.clone(),
            error: None,
            created_at: instance.created_at,
        })
        .collect();

    Ok(tunnel_list)
}
