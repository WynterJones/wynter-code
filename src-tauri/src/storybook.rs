use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, State};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum StorybookStatus {
    Idle,
    Starting,
    Running,
    Stopping,
    Error,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorybookEvent {
    pub server_id: String,
    pub event_type: String,
    pub url: Option<String>,
    pub status: Option<StorybookStatus>,
    pub message: Option<String>,
}

struct StorybookInstance {
    project_path: String,
    port: u16,
    url: String,
    status: StorybookStatus,
    child_pid: Option<u32>,
    created_at: i64,
}

pub struct StorybookManager {
    servers: Mutex<HashMap<String, StorybookInstance>>,
}

impl StorybookManager {
    pub fn new() -> Self {
        Self {
            servers: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for StorybookManager {
    fn default() -> Self {
        Self::new()
    }
}

#[tauri::command]
pub async fn start_storybook_server(
    window: tauri::Window,
    state: State<'_, Arc<StorybookManager>>,
    project_path: String,
    port: u16,
    command: String,
) -> Result<String, String> {
    let server_id = Uuid::new_v4().to_string();
    let created_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let url = format!("http://localhost:{}", port);

    // Create initial server instance
    {
        let mut servers = state.servers.lock().unwrap();
        servers.insert(
            server_id.clone(),
            StorybookInstance {
                project_path: project_path.clone(),
                port,
                url: url.clone(),
                status: StorybookStatus::Starting,
                child_pid: None,
                created_at,
            },
        );
    }

    // Emit starting event
    let _ = window.emit(
        "storybook-event",
        StorybookEvent {
            server_id: server_id.clone(),
            event_type: "status_change".to_string(),
            url: Some(url.clone()),
            status: Some(StorybookStatus::Starting),
            message: Some("Starting Storybook...".to_string()),
        },
    );

    // Parse command
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Invalid command".to_string());
    }

    let mut cmd = Command::new(parts[0]);
    cmd.current_dir(&project_path);

    for part in &parts[1..] {
        cmd.arg(part);
    }

    // Add port flag for Storybook
    cmd.arg("-p").arg(port.to_string());

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| {
        let mut servers = state.servers.lock().unwrap();
        servers.remove(&server_id);
        format!("Failed to start Storybook: {}", e)
    })?;

    let child_pid = child.id();

    // Update with PID
    {
        let mut servers = state.servers.lock().unwrap();
        if let Some(server) = servers.get_mut(&server_id) {
            server.child_pid = Some(child_pid);
        }
    }

    // Spawn thread to monitor output
    let server_id_clone = server_id.clone();
    let state_clone = state.inner().clone();
    let window_clone = window.clone();
    let url_clone = url.clone();

    std::thread::spawn(move || {
        let stderr = child.stderr.take();
        let stdout = child.stdout.take();

        let ready_patterns = [
            "storybook",
            "started",
            "localhost:",
            "local:",
            "ready",
            "webpack compiled",
        ];

        let mut server_ready = false;

        // Monitor stderr
        if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                if !server_ready {
                    let line_lower = line.to_lowercase();
                    for pattern in &ready_patterns {
                        if line_lower.contains(&pattern.to_lowercase())
                            && line_lower.contains(&port.to_string())
                        {
                            server_ready = true;

                            {
                                let mut servers = state_clone.servers.lock().unwrap();
                                if let Some(server) = servers.get_mut(&server_id_clone) {
                                    server.status = StorybookStatus::Running;
                                }
                            }

                            let _ = window_clone.emit(
                                "storybook-event",
                                StorybookEvent {
                                    server_id: server_id_clone.clone(),
                                    event_type: "ready".to_string(),
                                    url: Some(url_clone.clone()),
                                    status: Some(StorybookStatus::Running),
                                    message: Some("Storybook is ready!".to_string()),
                                },
                            );
                            break;
                        }
                    }
                }
            }
        }

        // Monitor stdout
        if let Some(stdout) = stdout {
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                if !server_ready {
                    let line_lower = line.to_lowercase();
                    for pattern in &ready_patterns {
                        if line_lower.contains(&pattern.to_lowercase())
                            && line_lower.contains(&port.to_string())
                        {
                            server_ready = true;

                            {
                                let mut servers = state_clone.servers.lock().unwrap();
                                if let Some(server) = servers.get_mut(&server_id_clone) {
                                    server.status = StorybookStatus::Running;
                                }
                            }

                            let _ = window_clone.emit(
                                "storybook-event",
                                StorybookEvent {
                                    server_id: server_id_clone.clone(),
                                    event_type: "ready".to_string(),
                                    url: Some(url_clone.clone()),
                                    status: Some(StorybookStatus::Running),
                                    message: Some("Storybook is ready!".to_string()),
                                },
                            );
                            break;
                        }
                    }
                }
            }
        }

        // Process ended
        let exit_status = child.wait();
        let error_msg = match exit_status {
            Ok(status) if status.success() => None,
            Ok(status) => Some(format!("Process exited with code: {:?}", status.code())),
            Err(e) => Some(format!("Failed to wait on process: {}", e)),
        };

        {
            let mut servers = state_clone.servers.lock().unwrap();
            if let Some(server) = servers.get_mut(&server_id_clone) {
                server.status = StorybookStatus::Idle;
            }
        }

        let _ = window_clone.emit(
            "storybook-event",
            StorybookEvent {
                server_id: server_id_clone,
                event_type: "stopped".to_string(),
                url: None,
                status: Some(StorybookStatus::Idle),
                message: error_msg,
            },
        );
    });

    Ok(server_id)
}

#[tauri::command]
pub async fn stop_storybook_server(
    state: State<'_, Arc<StorybookManager>>,
    server_id: String,
) -> Result<(), String> {
    let child_pid = {
        let servers = state.servers.lock().unwrap();
        servers.get(&server_id).and_then(|s| s.child_pid)
    };

    // Kill the process
    if let Some(pid) = child_pid {
        let _ = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
    }

    // Remove from manager
    let mut servers = state.servers.lock().unwrap();
    servers.remove(&server_id);

    Ok(())
}
