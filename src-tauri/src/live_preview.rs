use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::net::TcpListener;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, State};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum ProjectType {
    Vite,
    Next,
    Nuxt,
    ReactCra,
    VueCli,
    Angular,
    Remix,
    Astro,
    Svelte,
    Static,
    Unknown,
}

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum PreviewStatus {
    Idle,
    Detecting,
    Starting,
    Running,
    Stopping,
    Error,
}

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum PackageManager {
    Npm,
    Pnpm,
    Yarn,
    Bun,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDetectionResult {
    pub project_type: ProjectType,
    pub has_dev_script: bool,
    pub dev_command: Option<String>,
    pub package_manager: PackageManager,
    pub suggested_port: u16,
    pub has_index_html: bool,
    pub framework_name: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewServerInfo {
    pub server_id: String,
    pub project_path: String,
    pub project_type: ProjectType,
    pub port: u16,
    pub url: String,
    pub local_url: Option<String>,
    pub status: PreviewStatus,
    pub error: Option<String>,
    pub started_at: i64,
    pub is_framework_server: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewEvent {
    pub server_id: String,
    pub event_type: String,
    pub url: Option<String>,
    pub status: Option<PreviewStatus>,
    pub message: Option<String>,
}

struct PreviewInstance {
    project_path: String,
    project_type: ProjectType,
    port: u16,
    url: String,
    local_url: Option<String>,
    status: PreviewStatus,
    child_pid: Option<u32>,
    is_framework_server: bool,
    created_at: i64,
    shutdown_signal: Option<Arc<Mutex<bool>>>,
}

pub struct PreviewManager {
    servers: Mutex<HashMap<String, PreviewInstance>>,
}

impl PreviewManager {
    pub fn new() -> Self {
        Self {
            servers: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for PreviewManager {
    fn default() -> Self {
        Self::new()
    }
}

fn detect_package_manager(project_path: &Path) -> PackageManager {
    if project_path.join("bun.lockb").exists() {
        PackageManager::Bun
    } else if project_path.join("pnpm-lock.yaml").exists() {
        PackageManager::Pnpm
    } else if project_path.join("yarn.lock").exists() {
        PackageManager::Yarn
    } else {
        PackageManager::Npm
    }
}

fn get_dev_command(pm: &PackageManager) -> &'static str {
    match pm {
        PackageManager::Npm => "npm",
        PackageManager::Pnpm => "pnpm",
        PackageManager::Yarn => "yarn",
        PackageManager::Bun => "bun",
    }
}

fn find_available_port(start_port: u16) -> u16 {
    let mut port = start_port;
    while port < 65535 {
        if TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok() {
            return port;
        }
        port += 1;
    }
    start_port
}

fn is_port_in_use(port: u16) -> bool {
    // Check both IPv4 and IPv6 - if either fails, port is in use
    let ipv4_in_use = TcpListener::bind(format!("127.0.0.1:{}", port)).is_err();
    let ipv6_in_use = TcpListener::bind(format!("[::1]:{}", port)).is_err();
    ipv4_in_use || ipv6_in_use
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortCheckResult {
    pub port: u16,
    pub in_use: bool,
    pub next_available: u16,
}

#[tauri::command]
pub async fn check_port_status(port: u16) -> Result<PortCheckResult, String> {
    let in_use = is_port_in_use(port);
    let next_available = if in_use {
        find_available_port(port)
    } else {
        port
    };

    Ok(PortCheckResult {
        port,
        in_use,
        next_available,
    })
}

#[tauri::command]
pub async fn kill_process_on_port(port: u16) -> Result<(), String> {
    // Use lsof to find the process listening on the port, then kill it
    let output = Command::new("lsof")
        .args(["-t", "-i", &format!(":{}", port)])
        .output()
        .map_err(|e| format!("Failed to run lsof: {}", e))?;

    let pids = String::from_utf8_lossy(&output.stdout);
    let pids: Vec<&str> = pids.trim().lines().collect();

    if pids.is_empty() {
        return Err(format!("No process found on port {}", port));
    }

    for pid in pids {
        if !pid.is_empty() {
            let _ = Command::new("kill")
                .args(["-9", pid])
                .output();
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn detect_project_type(project_path: String) -> Result<ProjectDetectionResult, String> {
    let path = Path::new(&project_path);

    if !path.exists() {
        return Err("Project path does not exist".to_string());
    }

    let package_manager = detect_package_manager(path);
    let has_index_html = path.join("index.html").exists() || path.join("public/index.html").exists();

    // Check for framework config files
    let project_type = if path.join("vite.config.ts").exists()
        || path.join("vite.config.js").exists()
        || path.join("vite.config.mjs").exists()
    {
        ProjectType::Vite
    } else if path.join("next.config.js").exists()
        || path.join("next.config.mjs").exists()
        || path.join("next.config.ts").exists()
    {
        ProjectType::Next
    } else if path.join("nuxt.config.ts").exists() || path.join("nuxt.config.js").exists() {
        ProjectType::Nuxt
    } else if path.join("angular.json").exists() {
        ProjectType::Angular
    } else if path.join("remix.config.js").exists() || path.join("remix.config.ts").exists() {
        ProjectType::Remix
    } else if path.join("astro.config.mjs").exists() || path.join("astro.config.ts").exists() {
        ProjectType::Astro
    } else if path.join("svelte.config.js").exists() {
        ProjectType::Svelte
    } else {
        // Check package.json for framework hints
        let pkg_path = path.join("package.json");
        if pkg_path.exists() {
            if let Ok(content) = fs::read_to_string(&pkg_path) {
                if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
                    let deps = pkg.get("dependencies").cloned().unwrap_or_default();
                    let dev_deps = pkg.get("devDependencies").cloned().unwrap_or_default();

                    if deps.get("react-scripts").is_some() || dev_deps.get("react-scripts").is_some()
                    {
                        return Ok(ProjectDetectionResult {
                            project_type: ProjectType::ReactCra,
                            has_dev_script: true,
                            dev_command: Some(format!("{} start", get_dev_command(&package_manager))),
                            package_manager,
                            suggested_port: 3000,
                            has_index_html,
                            framework_name: "Create React App".to_string(),
                        });
                    }

                    if deps.get("@vue/cli-service").is_some()
                        || dev_deps.get("@vue/cli-service").is_some()
                    {
                        return Ok(ProjectDetectionResult {
                            project_type: ProjectType::VueCli,
                            has_dev_script: true,
                            dev_command: Some(format!("{} serve", get_dev_command(&package_manager))),
                            package_manager,
                            suggested_port: 8080,
                            has_index_html,
                            framework_name: "Vue CLI".to_string(),
                        });
                    }
                }
            }
        }

        if has_index_html {
            ProjectType::Static
        } else {
            ProjectType::Unknown
        }
    };

    // Determine dev command and port based on project type
    let (dev_command, suggested_port, framework_name) = match &project_type {
        ProjectType::Vite => (
            Some(format!("{} run dev", get_dev_command(&package_manager))),
            5173,
            "Vite".to_string(),
        ),
        ProjectType::Next => (
            Some(format!("{} run dev", get_dev_command(&package_manager))),
            3000,
            "Next.js".to_string(),
        ),
        ProjectType::Nuxt => (
            Some(format!("{} run dev", get_dev_command(&package_manager))),
            3000,
            "Nuxt".to_string(),
        ),
        ProjectType::Angular => (
            Some(format!("{} start", get_dev_command(&package_manager))),
            4200,
            "Angular".to_string(),
        ),
        ProjectType::Remix => (
            Some(format!("{} run dev", get_dev_command(&package_manager))),
            3000,
            "Remix".to_string(),
        ),
        ProjectType::Astro => (
            Some(format!("{} run dev", get_dev_command(&package_manager))),
            4321,
            "Astro".to_string(),
        ),
        ProjectType::Svelte => (
            Some(format!("{} run dev", get_dev_command(&package_manager))),
            5173,
            "SvelteKit".to_string(),
        ),
        ProjectType::ReactCra => (
            Some(format!("{} start", get_dev_command(&package_manager))),
            3000,
            "Create React App".to_string(),
        ),
        ProjectType::VueCli => (
            Some(format!("{} serve", get_dev_command(&package_manager))),
            8080,
            "Vue CLI".to_string(),
        ),
        ProjectType::Static => (None, 9876, "Static Site".to_string()),
        ProjectType::Unknown => (None, 9876, "Unknown".to_string()),
    };

    let has_dev_script = dev_command.is_some();

    Ok(ProjectDetectionResult {
        project_type,
        has_dev_script,
        dev_command,
        package_manager,
        suggested_port,
        has_index_html,
        framework_name,
    })
}

#[tauri::command]
pub async fn get_local_ip() -> Result<String, String> {
    local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .map_err(|e| format!("Failed to get local IP: {}", e))
}

#[tauri::command]
pub async fn start_preview_server(
    window: tauri::Window,
    state: State<'_, Arc<PreviewManager>>,
    project_path: String,
    port: Option<u16>,
    use_framework_server: bool,
) -> Result<String, String> {
    let server_id = Uuid::new_v4().to_string();
    let created_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let path = Path::new(&project_path);
    if !path.exists() {
        return Err("Project path does not exist".to_string());
    }

    let detection = detect_project_type(project_path.clone()).await?;
    let actual_port = port.unwrap_or_else(|| find_available_port(detection.suggested_port));
    let url = format!("http://localhost:{}", actual_port);

    // Get local IP for mobile access
    let local_url = get_local_ip().await.ok().map(|ip| format!("http://{}:{}", ip, actual_port));

    // Create initial server instance
    {
        let mut servers = state.servers.lock().unwrap();
        servers.insert(
            server_id.clone(),
            PreviewInstance {
                project_path: project_path.clone(),
                project_type: detection.project_type.clone(),
                port: actual_port,
                url: url.clone(),
                local_url: local_url.clone(),
                status: PreviewStatus::Starting,
                child_pid: None,
                is_framework_server: use_framework_server && detection.has_dev_script,
                created_at,
                shutdown_signal: None,
            },
        );
    }

    // Emit starting event
    let _ = window.emit(
        "preview-event",
        PreviewEvent {
            server_id: server_id.clone(),
            event_type: "status_change".to_string(),
            url: Some(url.clone()),
            status: Some(PreviewStatus::Starting),
            message: Some("Starting preview server...".to_string()),
        },
    );

    if use_framework_server && detection.has_dev_script {
        // Start framework dev server
        start_framework_server(
            window,
            state.inner().clone(),
            server_id.clone(),
            project_path,
            detection,
            actual_port,
        )?;
    } else {
        // Start static file server
        start_static_server(
            window,
            state.inner().clone(),
            server_id.clone(),
            project_path,
            actual_port,
        )?;
    }

    Ok(server_id)
}

fn start_framework_server(
    window: tauri::Window,
    state: Arc<PreviewManager>,
    server_id: String,
    project_path: String,
    detection: ProjectDetectionResult,
    port: u16,
) -> Result<(), String> {
    let dev_cmd = detection
        .dev_command
        .ok_or("No dev command available")?;

    let pm = get_dev_command(&detection.package_manager);

    // Parse the command
    let parts: Vec<&str> = dev_cmd.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Invalid dev command".to_string());
    }

    // Build the command with port override
    let mut cmd = Command::new(pm);
    cmd.current_dir(&project_path);

    // Add args based on package manager command
    for part in &parts[1..] {
        cmd.arg(part);
    }

    // Add port flag based on framework
    match detection.project_type {
        ProjectType::Vite | ProjectType::Svelte | ProjectType::Astro => {
            cmd.arg("--port").arg(port.to_string());
        }
        ProjectType::Next => {
            cmd.arg("-p").arg(port.to_string());
        }
        ProjectType::Nuxt => {
            cmd.env("PORT", port.to_string());
        }
        ProjectType::Angular => {
            cmd.arg("--port").arg(port.to_string());
        }
        ProjectType::ReactCra => {
            cmd.env("PORT", port.to_string());
        }
        ProjectType::VueCli => {
            cmd.arg("--port").arg(port.to_string());
        }
        _ => {}
    }

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| {
        let mut servers = state.servers.lock().unwrap();
        servers.remove(&server_id);
        format!("Failed to start dev server: {}", e)
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
    let state_clone = state.clone();
    let window_clone = window.clone();
    let url = format!("http://localhost:{}", port);

    std::thread::spawn(move || {
        let stderr = child.stderr.take();
        let stdout = child.stdout.take();

        // Monitor both stdout and stderr for "ready" indicators
        let ready_patterns = [
            "ready in",
            "Local:",
            "localhost:",
            "compiled successfully",
            "Server running",
            "started server",
            "listening on",
        ];

        let mut server_ready = false;

        // Read stderr in a separate thread
        if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                // Check for ready pattern
                if !server_ready {
                    for pattern in &ready_patterns {
                        if line.to_lowercase().contains(&pattern.to_lowercase()) {
                            server_ready = true;

                            {
                                let mut servers = state_clone.servers.lock().unwrap();
                                if let Some(server) = servers.get_mut(&server_id_clone) {
                                    server.status = PreviewStatus::Running;
                                }
                            }

                            let _ = window_clone.emit(
                                "preview-event",
                                PreviewEvent {
                                    server_id: server_id_clone.clone(),
                                    event_type: "ready".to_string(),
                                    url: Some(url.clone()),
                                    status: Some(PreviewStatus::Running),
                                    message: Some("Server is ready!".to_string()),
                                },
                            );
                            break;
                        }
                    }
                }

                // Emit output
                let _ = window_clone.emit(
                    "preview-event",
                    PreviewEvent {
                        server_id: server_id_clone.clone(),
                        event_type: "output".to_string(),
                        url: None,
                        status: None,
                        message: Some(line),
                    },
                );
            }
        }

        // Also monitor stdout
        if let Some(stdout) = stdout {
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                if !server_ready {
                    for pattern in &ready_patterns {
                        if line.to_lowercase().contains(&pattern.to_lowercase()) {
                            server_ready = true;

                            {
                                let mut servers = state_clone.servers.lock().unwrap();
                                if let Some(server) = servers.get_mut(&server_id_clone) {
                                    server.status = PreviewStatus::Running;
                                }
                            }

                            let _ = window_clone.emit(
                                "preview-event",
                                PreviewEvent {
                                    server_id: server_id_clone.clone(),
                                    event_type: "ready".to_string(),
                                    url: Some(url.clone()),
                                    status: Some(PreviewStatus::Running),
                                    message: Some("Server is ready!".to_string()),
                                },
                            );
                            break;
                        }
                    }
                }

                let _ = window_clone.emit(
                    "preview-event",
                    PreviewEvent {
                        server_id: server_id_clone.clone(),
                        event_type: "output".to_string(),
                        url: None,
                        status: None,
                        message: Some(line),
                    },
                );
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
                server.status = PreviewStatus::Idle;
            }
        }

        let _ = window_clone.emit(
            "preview-event",
            PreviewEvent {
                server_id: server_id_clone,
                event_type: "stopped".to_string(),
                url: None,
                status: Some(PreviewStatus::Idle),
                message: error_msg,
            },
        );
    });

    Ok(())
}

fn start_static_server(
    window: tauri::Window,
    state: Arc<PreviewManager>,
    server_id: String,
    project_path: String,
    port: u16,
) -> Result<(), String> {
    let shutdown_signal = Arc::new(Mutex::new(false));

    // Store shutdown signal
    {
        let mut servers = state.servers.lock().unwrap();
        if let Some(server) = servers.get_mut(&server_id) {
            server.shutdown_signal = Some(shutdown_signal.clone());
        }
    }

    let server = tiny_http::Server::http(format!("0.0.0.0:{}", port))
        .map_err(|e| format!("Failed to start server: {}", e))?;

    let url = format!("http://localhost:{}", port);

    // Update status to running
    {
        let mut servers = state.servers.lock().unwrap();
        if let Some(server) = servers.get_mut(&server_id) {
            server.status = PreviewStatus::Running;
        }
    }

    // Emit ready event
    let _ = window.emit(
        "preview-event",
        PreviewEvent {
            server_id: server_id.clone(),
            event_type: "ready".to_string(),
            url: Some(url.clone()),
            status: Some(PreviewStatus::Running),
            message: Some("Static server is ready!".to_string()),
        },
    );

    let server_id_clone = server_id.clone();
    let state_clone = state.clone();
    let window_clone = window.clone();

    std::thread::spawn(move || {
        let hot_reload_script = r#"
<script>
(function() {
    var ws = new WebSocket('ws://' + window.location.hostname + ':' + (parseInt(window.location.port) + 1));
    ws.onmessage = function(e) {
        if (e.data === 'reload') window.location.reload();
    };
    ws.onclose = function() {
        setTimeout(function() { window.location.reload(); }, 2000);
    };
})();
</script>
"#;

        loop {
            // Check shutdown signal
            if *shutdown_signal.lock().unwrap() {
                break;
            }

            // Use recv_timeout to allow checking shutdown signal periodically
            match server.recv_timeout(std::time::Duration::from_millis(500)) {
                Ok(Some(request)) => {
                    let path = request.url().to_string();
                    let file_path = if path == "/" {
                        Path::new(&project_path).join("index.html")
                    } else {
                        Path::new(&project_path).join(path.trim_start_matches('/'))
                    };

                    let response = if file_path.exists() && file_path.is_file() {
                        if let Ok(mut file) = fs::File::open(&file_path) {
                            let mut content = Vec::new();
                            if file.read_to_end(&mut content).is_ok() {
                                let content_type = match file_path.extension().and_then(|e| e.to_str()) {
                                    Some("html") => {
                                        // Inject hot reload script
                                        if let Ok(html) = String::from_utf8(content.clone()) {
                                            let injected = html.replace("</body>", &format!("{}</body>", hot_reload_script));
                                            content = injected.into_bytes();
                                        }
                                        "text/html"
                                    }
                                    Some("css") => "text/css",
                                    Some("js") | Some("mjs") => "application/javascript",
                                    Some("json") => "application/json",
                                    Some("png") => "image/png",
                                    Some("jpg") | Some("jpeg") => "image/jpeg",
                                    Some("gif") => "image/gif",
                                    Some("svg") => "image/svg+xml",
                                    Some("woff") => "font/woff",
                                    Some("woff2") => "font/woff2",
                                    Some("ttf") => "font/ttf",
                                    Some("ico") => "image/x-icon",
                                    _ => "application/octet-stream",
                                };

                                tiny_http::Response::from_data(content)
                                    .with_header(
                                        tiny_http::Header::from_bytes(&b"Content-Type"[..], content_type.as_bytes()).unwrap()
                                    )
                            } else {
                                tiny_http::Response::from_string("Failed to read file")
                                    .with_status_code(500)
                            }
                        } else {
                            tiny_http::Response::from_string("Failed to open file")
                                .with_status_code(500)
                        }
                    } else {
                        // Try index.html for SPA routing
                        let index_path = Path::new(&project_path).join("index.html");
                        if index_path.exists() {
                            if let Ok(html) = fs::read_to_string(&index_path) {
                                let injected = html.replace("</body>", &format!("{}</body>", hot_reload_script));
                                tiny_http::Response::from_string(injected)
                                    .with_header(
                                        tiny_http::Header::from_bytes(&b"Content-Type"[..], b"text/html").unwrap()
                                    )
                            } else {
                                tiny_http::Response::from_string("Not found")
                                    .with_status_code(404)
                            }
                        } else {
                            tiny_http::Response::from_string("Not found")
                                .with_status_code(404)
                        }
                    };

                    let _ = request.respond(response);
                }
                Ok(None) => {
                    // Timeout, continue loop to check shutdown
                    continue;
                }
                Err(_) => {
                    break;
                }
            }
        }

        // Server stopped
        {
            let mut servers = state_clone.servers.lock().unwrap();
            if let Some(server) = servers.get_mut(&server_id_clone) {
                server.status = PreviewStatus::Idle;
            }
        }

        let _ = window_clone.emit(
            "preview-event",
            PreviewEvent {
                server_id: server_id_clone,
                event_type: "stopped".to_string(),
                url: None,
                status: Some(PreviewStatus::Idle),
                message: None,
            },
        );
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_preview_server(
    state: State<'_, Arc<PreviewManager>>,
    server_id: String,
) -> Result<(), String> {
    let (child_pid, shutdown_signal) = {
        let servers = state.servers.lock().unwrap();
        servers.get(&server_id).map(|s| (s.child_pid, s.shutdown_signal.clone())).unwrap_or((None, None))
    };

    // For framework servers, kill the process
    if let Some(pid) = child_pid {
        let _ = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
    }

    // For static servers, set shutdown signal
    if let Some(signal) = shutdown_signal {
        let mut sig = signal.lock().unwrap();
        *sig = true;
    }

    // Remove from manager
    let mut servers = state.servers.lock().unwrap();
    servers.remove(&server_id);

    Ok(())
}

#[tauri::command]
pub fn list_preview_servers(state: State<'_, Arc<PreviewManager>>) -> Result<Vec<PreviewServerInfo>, String> {
    let servers = state.servers.lock().unwrap();

    let server_list: Vec<PreviewServerInfo> = servers
        .iter()
        .map(|(id, instance)| PreviewServerInfo {
            server_id: id.clone(),
            project_path: instance.project_path.clone(),
            project_type: instance.project_type.clone(),
            port: instance.port,
            url: instance.url.clone(),
            local_url: instance.local_url.clone(),
            status: instance.status.clone(),
            error: None,
            started_at: instance.created_at,
            is_framework_server: instance.is_framework_server,
        })
        .collect();

    Ok(server_list)
}
