use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
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
    #[allow(dead_code)]
    project_path: String,
    #[allow(dead_code)]
    port: u16,
    #[allow(dead_code)]
    url: String,
    status: StorybookStatus,
    child_pid: Option<u32>,
    #[allow(dead_code)]
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

    // Build the full command with port and --no-open to prevent browser auto-open
    // For npm/pnpm/yarn scripts, we need -- to pass args to the underlying command
    let full_command = if command.starts_with("npm run") || command.starts_with("pnpm run") || command.starts_with("yarn run") || command.starts_with("bun run") {
        format!("{} -- -p {} --no-open", command, port)
    } else {
        format!("{} -p {} --no-open", command, port)
    };

    // Use interactive shell to run the command to ensure PATH and environment are available
    // This is important for nvm/fnm/volta users where node is in a non-standard location
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.args(["/C", &full_command]);
        c
    } else {
        let mut c = Command::new("bash");
        // Use -l for login shell to load .bash_profile/.zprofile where nvm is typically configured
        // Use -c to run the command
        c.args(["-l", "-c", &full_command]);
        c
    };

    cmd.current_dir(&project_path);

    // Inherit environment variables from the parent process
    cmd.envs(std::env::vars());

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

        // Shared flag for server ready
        let server_ready = Arc::new(Mutex::new(false));

        // Collect stderr output for error reporting
        let stderr_output = Arc::new(Mutex::new(Vec::<String>::new()));

        // Patterns that indicate Storybook is ready
        let ready_keywords: Vec<&str> = vec![
            "storybook started",
            "storybook 7",
            "storybook 8",
            "for manager and",
            "webpack compiled",
            "build finished",
            "ready in",
        ];

        let port_str = port.to_string();

        // Clone everything for threads
        let server_ready_stderr = server_ready.clone();
        let server_ready_stdout = server_ready.clone();
        let state_stderr = state_clone.clone();
        let state_stdout = state_clone.clone();
        let window_stderr = window_clone.clone();
        let window_stdout = window_clone.clone();
        let url_stderr = url_clone.clone();
        let url_stdout = url_clone.clone();
        let server_id_stderr = server_id_clone.clone();
        let server_id_stdout = server_id_clone.clone();
        let keywords_stderr = ready_keywords.clone();
        let keywords_stdout = ready_keywords.clone();
        let port_stderr = port_str.clone();
        let port_stdout = port_str.clone();
        let stderr_output_clone = stderr_output.clone();

        // Helper to mark ready
        let mark_ready = |server_id: &str, state: &Arc<StorybookManager>, window: &tauri::Window, url: &str, ready_flag: &Arc<Mutex<bool>>| {
            let mut ready = ready_flag.lock().unwrap();
            if *ready {
                return false;
            }
            *ready = true;
            drop(ready);

            {
                let mut servers = state.servers.lock().unwrap();
                if let Some(server) = servers.get_mut(server_id) {
                    server.status = StorybookStatus::Running;
                }
            }

            let _ = window.emit(
                "storybook-event",
                StorybookEvent {
                    server_id: server_id.to_string(),
                    event_type: "ready".to_string(),
                    url: Some(url.to_string()),
                    status: Some(StorybookStatus::Running),
                    message: Some("Storybook is ready!".to_string()),
                },
            );
            true
        };

        // Monitor stderr in a separate thread
        let stderr_handle = if let Some(stderr) = stderr {
            Some(std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines().map_while(Result::ok) {
                    // Capture stderr for error reporting
                    {
                        let mut output = stderr_output_clone.lock().unwrap();
                        output.push(line.clone());
                        // Keep only last 20 lines
                        if output.len() > 20 {
                            output.remove(0);
                        }
                    }

                    let line_lower = line.to_lowercase();

                    // Check for ready keywords
                    for keyword in &keywords_stderr {
                        if line_lower.contains(*keyword) {
                            mark_ready(&server_id_stderr, &state_stderr, &window_stderr, &url_stderr, &server_ready_stderr);
                            break;
                        }
                    }

                    // Check for localhost URL with port
                    if line_lower.contains("localhost:") && line_lower.contains(&port_stderr) {
                        mark_ready(&server_id_stderr, &state_stderr, &window_stderr, &url_stderr, &server_ready_stderr);
                    }
                }
            }))
        } else {
            None
        };

        // Monitor stdout in a separate thread
        let stdout_handle = if let Some(stdout) = stdout {
            Some(std::thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines().map_while(Result::ok) {
                    let line_lower = line.to_lowercase();

                    // Check for ready keywords
                    for keyword in &keywords_stdout {
                        if line_lower.contains(*keyword) {
                            mark_ready(&server_id_stdout, &state_stdout, &window_stdout, &url_stdout, &server_ready_stdout);
                            break;
                        }
                    }

                    // Check for localhost URL with port
                    if line_lower.contains("localhost:") && line_lower.contains(&port_stdout) {
                        mark_ready(&server_id_stdout, &state_stdout, &window_stdout, &url_stdout, &server_ready_stdout);
                    }
                }
            }))
        } else {
            None
        };

        // Wait a bit then check if we should auto-mark as ready (fallback)
        std::thread::sleep(Duration::from_secs(10));
        {
            let ready = server_ready.lock().unwrap();
            if !*ready {
                drop(ready);
                // Check if process is still running - if so, assume it's ready
                if child.try_wait().ok().flatten().is_none() {
                    let mut ready = server_ready.lock().unwrap();
                    if !*ready {
                        *ready = true;
                        drop(ready);

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
                                message: Some("Storybook appears to be ready".to_string()),
                            },
                        );
                    }
                }
            }
        }

        // Wait for output threads to finish
        if let Some(handle) = stderr_handle {
            let _ = handle.join();
        }
        if let Some(handle) = stdout_handle {
            let _ = handle.join();
        }

        // Process ended
        let exit_status = child.wait();
        let error_msg = match exit_status {
            Ok(status) if status.success() => None,
            Ok(status) => {
                // Include stderr output in error message
                let stderr_lines = stderr_output.lock().unwrap();
                let stderr_str = if stderr_lines.is_empty() {
                    String::new()
                } else {
                    format!("\n{}", stderr_lines.join("\n"))
                };
                Some(format!("Process exited with code: {:?}{}", status.code(), stderr_str))
            },
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

    // Kill the process and its children
    if let Some(pid) = child_pid {
        // Kill the process group to ensure all children are killed
        let _ = Command::new("pkill")
            .args(["-P", &pid.to_string()])
            .output();
        let _ = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
    }

    // Remove from manager
    let mut servers = state.servers.lock().unwrap();
    servers.remove(&server_id);

    Ok(())
}
