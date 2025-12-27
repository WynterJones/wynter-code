use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

// Store current hotkey configuration
static CURRENT_HOTKEY: Mutex<Option<String>> = Mutex::new(None);
static LIGHTCAST_ENABLED: Mutex<bool> = Mutex::new(true);

// Cache for macOS apps - populated once and reused
static APP_CACHE: Mutex<Option<Vec<MacOSApp>>> = Mutex::new(None);

/// Initialize the launcher with the default hotkey
pub fn init_launcher() {
    if let Ok(mut guard) = CURRENT_HOTKEY.lock() {
        *guard = Some("alt-space".to_string());
    }
}

const LAUNCHER_WINDOW_LABEL: &str = "launcher";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacOSApp {
    pub name: String,
    pub path: String,
    pub bundle_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentFile {
    pub name: String,
    pub path: String,
    pub last_used: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileResult {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
}

/// Synchronous version for use from global shortcut handler (must run on main thread)
pub fn toggle_launcher_window_sync(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window(LAUNCHER_WINDOW_LABEL) {
        if window.is_visible().unwrap_or(false) {
            window.hide().map_err(|e| e.to_string())?;
            return Ok(false);
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
            return Ok(true);
        }
    }

    // Create new launcher window
    let window = WebviewWindowBuilder::new(
        &app,
        LAUNCHER_WINDOW_LABEL,
        tauri::WebviewUrl::App("/launcher".into()),
    )
    .title("")
    .inner_size(650.0, 480.0)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .visible(true)
    .shadow(true)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    // Set window level to floating on macOS
    #[cfg(target_os = "macos")]
    #[allow(deprecated)]
    {
        use cocoa::base::id;
        use objc::{msg_send, sel, sel_impl};

        if let Ok(ns_window) = window.ns_window() {
            let ns_window = ns_window as id;
            unsafe {
                // NSFloatingWindowLevel = 3
                let _: () = msg_send![ns_window, setLevel: 3i32];
            }
        }
    }

    Ok(true)
}

#[tauri::command]
pub async fn toggle_launcher_window(app: AppHandle) -> Result<bool, String> {
    toggle_launcher_window_sync(app)
}

#[tauri::command]
pub async fn hide_launcher_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(LAUNCHER_WINDOW_LABEL) {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn is_launcher_visible(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window(LAUNCHER_WINDOW_LABEL) {
        Ok(window.is_visible().unwrap_or(false))
    } else {
        Ok(false)
    }
}

/// Load all macOS apps (called once, cached for performance)
fn load_all_apps() -> Vec<MacOSApp> {
    // Use mdfind (Spotlight) to get all applications
    let output = match Command::new("mdfind")
        .args(["kMDItemContentTypeTree == 'com.apple.application-bundle'"])
        .output()
    {
        Ok(o) => o,
        Err(_) => return Vec::new(),
    };

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter(|path| {
            // Filter to main application directories
            path.starts_with("/Applications")
                || path.starts_with("/System/Applications")
                || path.contains("/Applications/")
        })
        .filter_map(|path| {
            let name = std::path::Path::new(path)
                .file_stem()?
                .to_str()?
                .to_string();

            Some(MacOSApp {
                name,
                path: path.to_string(),
                bundle_id: None, // Don't fetch bundle_id - it's slow and not used
            })
        })
        .collect()
}

/// Get cached apps or load them
fn get_cached_apps() -> Vec<MacOSApp> {
    let mut cache = match APP_CACHE.lock() {
        Ok(guard) => guard,
        Err(_) => return Vec::new(),
    };

    if cache.is_none() {
        *cache = Some(load_all_apps());
    }

    cache.as_ref().cloned().unwrap_or_default()
}

#[tauri::command]
pub async fn search_macos_apps(query: String) -> Result<Vec<MacOSApp>, String> {
    let all_apps = get_cached_apps();

    // Filter by query if provided
    if query.is_empty() {
        // Return top 50 apps alphabetically when no query
        let mut apps = all_apps;
        apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        apps.truncate(50);
        Ok(apps)
    } else {
        let query_lower = query.to_lowercase();
        let mut filtered: Vec<MacOSApp> = all_apps
            .into_iter()
            .filter(|app| app.name.to_lowercase().contains(&query_lower))
            .collect();

        // Sort by relevance (prefix match first, then alphabetical)
        filtered.sort_by(|a, b| {
            let a_starts = a.name.to_lowercase().starts_with(&query_lower);
            let b_starts = b.name.to_lowercase().starts_with(&query_lower);
            match (a_starts, b_starts) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            }
        });

        filtered.truncate(20);
        Ok(filtered)
    }
}

#[tauri::command]
pub async fn get_recent_files(limit: usize) -> Result<Vec<RecentFile>, String> {
    let home = std::env::var("HOME").unwrap_or_default();

    // Query for recently used files (last 7 days)
    let output = Command::new("mdfind")
        .args([
            "-onlyin",
            &home,
            "kMDItemLastUsedDate >= $time.today(-7)",
        ])
        .output()
        .map_err(|e| e.to_string())?;

    let files: Vec<RecentFile> = String::from_utf8_lossy(&output.stdout)
        .lines()
        .take(limit)
        .filter_map(|path| {
            let path_obj = std::path::Path::new(path);
            let name = path_obj.file_name()?.to_str()?.to_string();

            // Skip hidden files and system directories
            if name.starts_with('.') {
                return None;
            }

            Some(RecentFile {
                name,
                path: path.to_string(),
                last_used: None,
            })
        })
        .collect();

    Ok(files)
}

#[tauri::command]
pub async fn search_files(query: String, project_path: Option<String>) -> Result<Vec<FileResult>, String> {
    let search_path = project_path.unwrap_or_else(|| std::env::var("HOME").unwrap_or_default());

    let output = Command::new("mdfind")
        .args([
            "-onlyin",
            &search_path,
            &format!("kMDItemDisplayName == '*{}*'wc", query),
        ])
        .output()
        .map_err(|e| e.to_string())?;

    let files: Vec<FileResult> = String::from_utf8_lossy(&output.stdout)
        .lines()
        .take(30)
        .filter_map(|path| {
            let path_obj = std::path::Path::new(path);
            let name = path_obj.file_name()?.to_str()?.to_string();

            // Skip hidden files
            if name.starts_with('.') {
                return None;
            }

            let is_directory = path_obj.is_dir();

            Some(FileResult {
                name,
                path: path.to_string(),
                is_directory,
            })
        })
        .collect();

    Ok(files)
}

#[tauri::command]
pub async fn open_application(path: String) -> Result<(), String> {
    Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn reveal_in_finder(path: String) -> Result<(), String> {
    Command::new("open")
        .args(["-R", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_file(path: String) -> Result<(), String> {
    Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_app_icon_base64(app_path: String) -> Result<Option<String>, String> {
    // Try to get the app icon using sips
    let icns_path = format!("{}/Contents/Resources/AppIcon.icns", app_path);

    // Check if the icon exists
    if !std::path::Path::new(&icns_path).exists() {
        // Try alternative icon names
        let info_plist = format!("{}/Contents/Info.plist", app_path);
        if let Ok(output) = Command::new("defaults")
            .args(["read", &info_plist, "CFBundleIconFile"])
            .output()
        {
            let icon_name = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !icon_name.is_empty() {
                let alt_path = if icon_name.ends_with(".icns") {
                    format!("{}/Contents/Resources/{}", app_path, icon_name)
                } else {
                    format!("{}/Contents/Resources/{}.icns", app_path, icon_name)
                };

                if std::path::Path::new(&alt_path).exists() {
                    return convert_icns_to_base64(&alt_path);
                }
            }
        }
        return Ok(None);
    }

    convert_icns_to_base64(&icns_path)
}

fn convert_icns_to_base64(icns_path: &str) -> Result<Option<String>, String> {
    // Create a temporary PNG file
    let temp_png = format!("/tmp/app_icon_{}.png", std::process::id());

    // Convert icns to png using sips
    let result = Command::new("sips")
        .args(["-s", "format", "png", "-z", "64", "64", icns_path, "--out", &temp_png])
        .output();

    if result.is_err() {
        return Ok(None);
    }

    // Read the PNG file and convert to base64
    if let Ok(png_data) = std::fs::read(&temp_png) {
        let _ = std::fs::remove_file(&temp_png);
        let base64_str = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_data);
        Ok(Some(format!("data:image/png;base64,{}", base64_str)))
    } else {
        Ok(None)
    }
}

// Helper function to parse hotkey string into Shortcut
fn parse_hotkey(hotkey: &str) -> Option<Shortcut> {
    match hotkey {
        "alt-space" => Some(Shortcut::new(Some(Modifiers::ALT), Code::Space)),
        "cmd-space" => Some(Shortcut::new(Some(Modifiers::META), Code::Space)),
        "ctrl-space" => Some(Shortcut::new(Some(Modifiers::CONTROL), Code::Space)),
        "cmd-shift-space" => Some(Shortcut::new(Some(Modifiers::META | Modifiers::SHIFT), Code::Space)),
        "alt-shift-space" => Some(Shortcut::new(Some(Modifiers::ALT | Modifiers::SHIFT), Code::Space)),
        _ => None,
    }
}

#[tauri::command]
pub async fn update_lightcast_hotkey(app: AppHandle, hotkey: String) -> Result<(), String> {
    let new_shortcut = parse_hotkey(&hotkey).ok_or("Invalid hotkey format")?;

    // Get the current hotkey
    let current_hotkey = {
        let guard = CURRENT_HOTKEY.lock().map_err(|e| e.to_string())?;
        guard.clone()
    };

    // Unregister the old shortcut if it exists
    if let Some(old_hotkey) = current_hotkey {
        if let Some(old_shortcut) = parse_hotkey(&old_hotkey) {
            let _ = app.global_shortcut().unregister(old_shortcut);
        }
    }

    // Check if lightcast is enabled before registering new shortcut
    let is_enabled = {
        let guard = LIGHTCAST_ENABLED.lock().map_err(|e| e.to_string())?;
        *guard
    };

    if is_enabled {
        // Register the new shortcut
        app.global_shortcut()
            .on_shortcut(new_shortcut, |app_handle, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    let app = app_handle.clone();
                    let app_inner = app.clone();
                    // Must run on main thread for window operations
                    let _ = app.run_on_main_thread(move || {
                        let _ = toggle_launcher_window_sync(app_inner);
                    });
                }
            })
            .map_err(|e| format!("Failed to register hotkey: {}", e))?;
    }

    // Update the stored hotkey
    {
        let mut guard = CURRENT_HOTKEY.lock().map_err(|e| e.to_string())?;
        *guard = Some(hotkey);
    }

    Ok(())
}

#[tauri::command]
pub async fn enable_lightcast(app: AppHandle) -> Result<(), String> {
    let current_hotkey = {
        let guard = CURRENT_HOTKEY.lock().map_err(|e| e.to_string())?;
        guard.clone().unwrap_or_else(|| "alt-space".to_string())
    };

    let shortcut = parse_hotkey(&current_hotkey).ok_or("Invalid hotkey format")?;

    // Register the shortcut
    app.global_shortcut()
        .on_shortcut(shortcut, |app_handle, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let app = app_handle.clone();
                let app_inner = app.clone();
                // Must run on main thread for window operations
                let _ = app.run_on_main_thread(move || {
                    let _ = toggle_launcher_window_sync(app_inner);
                });
            }
        })
        .map_err(|e| format!("Failed to register hotkey: {}", e))?;

    // Update enabled state
    {
        let mut guard = LIGHTCAST_ENABLED.lock().map_err(|e| e.to_string())?;
        *guard = true;
    }

    Ok(())
}

#[tauri::command]
pub async fn disable_lightcast(app: AppHandle) -> Result<(), String> {
    let current_hotkey = {
        let guard = CURRENT_HOTKEY.lock().map_err(|e| e.to_string())?;
        guard.clone().unwrap_or_else(|| "alt-space".to_string())
    };

    if let Some(shortcut) = parse_hotkey(&current_hotkey) {
        let _ = app.global_shortcut().unregister(shortcut);
    }

    // Update enabled state
    {
        let mut guard = LIGHTCAST_ENABLED.lock().map_err(|e| e.to_string())?;
        *guard = false;
    }

    Ok(())
}

#[tauri::command]
pub async fn enable_autostart(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart_manager = app.autolaunch();
    autostart_manager.enable().map_err(|e| format!("Failed to enable autostart: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn disable_autostart(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart_manager = app.autolaunch();
    autostart_manager.disable().map_err(|e| format!("Failed to disable autostart: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn is_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart_manager = app.autolaunch();
    autostart_manager.is_enabled().map_err(|e| format!("Failed to check autostart status: {}", e))
}

/// Open a tool in the main window from the launcher
#[tauri::command]
pub async fn open_tool_in_main_window(
    app: AppHandle,
    action: String,
    sub_tool_id: Option<String>,
) -> Result<(), String> {
    use tauri::Emitter;
    use serde_json::json;

    // Get the main window
    if let Some(main_window) = app.get_webview_window("main") {
        // Show and focus the main window
        main_window.show().map_err(|e| e.to_string())?;
        main_window.set_focus().map_err(|e| e.to_string())?;

        // Emit the tool action event to the main window with optional sub-tool ID
        let payload = json!({
            "action": action,
            "subToolId": sub_tool_id
        });
        main_window
            .emit("launcher-open-tool", payload)
            .map_err(|e| e.to_string())?;

        Ok(())
    } else {
        Err("Main window not found".to_string())
    }
}
