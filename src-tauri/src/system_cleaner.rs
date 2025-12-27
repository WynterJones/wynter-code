use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::SystemTime;
use chrono::{DateTime, Local};

// Blocked paths for safety - cannot delete files from these
const BLOCKED_PATHS: &[&str] = &[
    "/usr",
    "/bin",
    "/sbin",
    "/System",
    "/Library",
    "/private",
    "/var",
    "/etc",
    "/cores",
];

// Cache locations on macOS
const CACHE_LOCATIONS: &[CacheLocationDef] = &[
    // Browser caches
    CacheLocationDef { path: "Library/Caches/Google/Chrome", name: "Google Chrome", category: "browser" },
    CacheLocationDef { path: "Library/Caches/com.google.Chrome", name: "Chrome Data", category: "browser" },
    CacheLocationDef { path: "Library/Caches/Firefox", name: "Firefox", category: "browser" },
    CacheLocationDef { path: "Library/Caches/org.mozilla.firefox", name: "Firefox Data", category: "browser" },
    CacheLocationDef { path: "Library/Caches/com.apple.Safari", name: "Safari", category: "browser" },
    CacheLocationDef { path: "Library/Caches/com.brave.Browser", name: "Brave", category: "browser" },
    CacheLocationDef { path: "Library/Caches/com.microsoft.edgemac", name: "Edge", category: "browser" },

    // Dev tool caches
    CacheLocationDef { path: ".npm/_cacache", name: "npm Cache", category: "dev" },
    CacheLocationDef { path: "Library/Caches/pnpm", name: "pnpm Cache", category: "dev" },
    CacheLocationDef { path: ".pnpm-store", name: "pnpm Store", category: "dev" },
    CacheLocationDef { path: "Library/Caches/Yarn", name: "Yarn Cache", category: "dev" },
    CacheLocationDef { path: ".cargo/registry/cache", name: "Cargo Cache", category: "dev" },
    CacheLocationDef { path: "Library/Caches/Homebrew", name: "Homebrew", category: "dev" },
    CacheLocationDef { path: "Library/Caches/com.apple.dt.Xcode", name: "Xcode Cache", category: "dev" },
    CacheLocationDef { path: "Library/Developer/Xcode/DerivedData", name: "Xcode DerivedData", category: "dev" },
    CacheLocationDef { path: "Library/Developer/Xcode/iOS DeviceSupport", name: "iOS Device Support", category: "dev" },
    CacheLocationDef { path: ".gradle/caches", name: "Gradle Cache", category: "dev" },
    CacheLocationDef { path: ".m2/repository", name: "Maven Cache", category: "dev" },
    CacheLocationDef { path: "Library/Caches/pip", name: "pip Cache", category: "dev" },
    CacheLocationDef { path: "Library/Caches/CocoaPods", name: "CocoaPods", category: "dev" },

    // System caches
    CacheLocationDef { path: "Library/Logs", name: "Application Logs", category: "system" },
    CacheLocationDef { path: "Library/Caches/com.spotify.client", name: "Spotify", category: "app" },
    CacheLocationDef { path: "Library/Caches/com.apple.Music", name: "Apple Music", category: "app" },
    CacheLocationDef { path: "Library/Caches/com.apple.appstore", name: "App Store", category: "app" },
    CacheLocationDef { path: "Library/Caches/com.docker.docker", name: "Docker", category: "dev" },
    CacheLocationDef { path: "Library/Caches/JetBrains", name: "JetBrains IDEs", category: "dev" },
    CacheLocationDef { path: "Library/Caches/com.microsoft.VSCode", name: "VS Code", category: "dev" },
];

struct CacheLocationDef {
    path: &'static str,
    name: &'static str,
    category: &'static str,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanableItem {
    pub id: String,
    pub path: String,
    pub name: String,
    pub size: u64,
    pub formatted_size: String,
    pub last_modified: u64,
    pub last_modified_formatted: String,
    pub item_type: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub items: Vec<CleanableItem>,
    pub total_size: u64,
    pub total_size_formatted: String,
    pub scanned_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub formatted_size: String,
    pub bundle_id: Option<String>,
    pub version: Option<String>,
    pub icon_data: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResult {
    pub deleted_count: u32,
    pub failed_count: u32,
    pub space_recovered: u64,
    pub space_recovered_formatted: String,
    pub failed_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheLocation {
    pub path: String,
    pub name: String,
    pub category: String,
    pub size: u64,
    pub formatted_size: String,
    pub exists: bool,
}

fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.1} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

fn format_timestamp(time: SystemTime) -> String {
    let datetime: DateTime<Local> = time.into();
    datetime.format("%b %d, %Y").to_string()
}

fn is_blocked_path(path: &Path) -> bool {
    let path_str = path.to_string_lossy();
    BLOCKED_PATHS.iter().any(|blocked| path_str.starts_with(blocked))
}

fn calculate_folder_size(path: &Path) -> u64 {
    let mut size: u64 = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                size += calculate_folder_size(&entry_path);
            } else if let Ok(metadata) = fs::metadata(&entry_path) {
                size += metadata.len();
            }
        }
    }
    size
}

fn get_file_info(path: &Path) -> Option<(u64, u64, String)> {
    let metadata = fs::metadata(path).ok()?;
    let size = if metadata.is_dir() {
        calculate_folder_size(path)
    } else {
        metadata.len()
    };
    let modified = metadata.modified().ok()?;
    let modified_ts = modified.duration_since(SystemTime::UNIX_EPOCH).ok()?.as_secs();
    let modified_str = format_timestamp(modified);
    Some((size, modified_ts, modified_str))
}

#[tauri::command]
pub async fn scan_large_files(min_size_mb: u64) -> Result<ScanResult, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let min_size_bytes = min_size_mb * 1024 * 1024;

    let mut items: Vec<CleanableItem> = Vec::new();
    let mut total_size: u64 = 0;
    let mut scanned_count: u32 = 0;

    fn scan_directory(
        dir: &Path,
        min_size: u64,
        items: &mut Vec<CleanableItem>,
        total_size: &mut u64,
        scanned_count: &mut u32,
        depth: usize,
    ) {
        if depth > 8 {
            return;
        }

        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            // Skip hidden files and directories
            if name.starts_with('.') {
                continue;
            }

            // Skip common large dirs we don't want to scan into
            if path.is_dir() {
                let skip_dirs = ["node_modules", "Library", ".Trash", "Applications", "System"];
                if skip_dirs.contains(&name.as_str()) {
                    continue;
                }

                // Recurse into subdirectories
                scan_directory(&path, min_size, items, total_size, scanned_count, depth + 1);
                continue;
            }

            *scanned_count += 1;

            // Check file size
            if let Some((size, modified_ts, modified_str)) = get_file_info(&path) {
                if size >= min_size {
                    let id = format!("file_{}", items.len());
                    items.push(CleanableItem {
                        id,
                        path: path.to_string_lossy().to_string(),
                        name: name.clone(),
                        size,
                        formatted_size: format_size(size),
                        last_modified: modified_ts,
                        last_modified_formatted: modified_str,
                        item_type: "large_file".to_string(),
                        description: Some(get_file_extension(&name)),
                    });
                    *total_size += size;
                }
            }
        }
    }

    scan_directory(&home, min_size_bytes, &mut items, &mut total_size, &mut scanned_count, 0);

    // Sort by size descending
    items.sort_by(|a, b| b.size.cmp(&a.size));

    Ok(ScanResult {
        items,
        total_size,
        total_size_formatted: format_size(total_size),
        scanned_count,
    })
}

fn get_file_extension(name: &str) -> String {
    Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_uppercase())
        .unwrap_or_else(|| "File".to_string())
}

#[tauri::command]
pub fn get_cache_locations() -> Vec<CacheLocation> {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return Vec::new(),
    };

    CACHE_LOCATIONS
        .iter()
        .map(|def| {
            let full_path = home.join(def.path);
            let exists = full_path.exists();
            let size = if exists { calculate_folder_size(&full_path) } else { 0 };

            CacheLocation {
                path: full_path.to_string_lossy().to_string(),
                name: def.name.to_string(),
                category: def.category.to_string(),
                size,
                formatted_size: format_size(size),
                exists,
            }
        })
        .filter(|loc| loc.exists && loc.size > 0)
        .collect()
}

#[tauri::command]
pub async fn scan_app_caches() -> Result<ScanResult, String> {
    let locations = get_cache_locations();

    let items: Vec<CleanableItem> = locations
        .iter()
        .enumerate()
        .map(|(i, loc)| {
            let modified = fs::metadata(&loc.path)
                .and_then(|m| m.modified())
                .ok();

            let (modified_ts, modified_str) = modified
                .map(|m| {
                    let ts = m.duration_since(SystemTime::UNIX_EPOCH)
                        .map(|d| d.as_secs())
                        .unwrap_or(0);
                    (ts, format_timestamp(m))
                })
                .unwrap_or((0, "Unknown".to_string()));

            CleanableItem {
                id: format!("cache_{}", i),
                path: loc.path.clone(),
                name: loc.name.clone(),
                size: loc.size,
                formatted_size: loc.formatted_size.clone(),
                last_modified: modified_ts,
                last_modified_formatted: modified_str,
                item_type: loc.category.clone(),
                description: None,
            }
        })
        .collect();

    let total_size: u64 = items.iter().map(|i| i.size).sum();

    Ok(ScanResult {
        items,
        total_size,
        total_size_formatted: format_size(total_size),
        scanned_count: CACHE_LOCATIONS.len() as u32,
    })
}

#[tauri::command]
pub async fn scan_installed_apps() -> Result<Vec<InstalledApp>, String> {
    let apps_dir = Path::new("/Applications");

    if !apps_dir.exists() {
        return Err("Applications folder not found".to_string());
    }

    let mut apps: Vec<InstalledApp> = Vec::new();

    let entries = fs::read_dir(apps_dir)
        .map_err(|e| format!("Cannot read /Applications: {}. This may require Full Disk Access in System Settings > Privacy & Security.", e))?;

    for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            // Only include .app bundles
            if !name.ends_with(".app") {
                continue;
            }

            // Calculate size
            let size = calculate_folder_size(&path);

            // Try to read Info.plist for bundle info
            let info_plist = path.join("Contents/Info.plist");
            let (bundle_id, version, icon_file) = if info_plist.exists() {
                parse_info_plist(&info_plist)
            } else {
                (None, None, None)
            };

            // Get icon as base64 data URL
            let icon_data = get_app_icon_base64(&path, icon_file);

            let app_name = name.trim_end_matches(".app").to_string();

            apps.push(InstalledApp {
                name: app_name,
                path: path.to_string_lossy().to_string(),
                size,
                formatted_size: format_size(size),
                bundle_id,
                version,
                icon_data,
            });
        }

    // Sort by size descending
    apps.sort_by(|a, b| b.size.cmp(&a.size));

    Ok(apps)
}

fn parse_info_plist(path: &Path) -> (Option<String>, Option<String>, Option<String>) {
    // Use plutil to convert plist to json and parse
    let output = std::process::Command::new("plutil")
        .args(["-convert", "json", "-o", "-", path.to_str().unwrap_or("")])
        .output();

    if let Ok(output) = output {
        if output.status.success() {
            if let Ok(json) = String::from_utf8(output.stdout) {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&json) {
                    let bundle_id = parsed.get("CFBundleIdentifier")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let version = parsed.get("CFBundleShortVersionString")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    // Get icon file name from plist
                    let icon_file = parsed.get("CFBundleIconFile")
                        .and_then(|v| v.as_str())
                        .map(|s| {
                            // Add .icns extension if not present
                            if s.ends_with(".icns") {
                                s.to_string()
                            } else {
                                format!("{}.icns", s)
                            }
                        });
                    return (bundle_id, version, icon_file);
                }
            }
        }
    }

    (None, None, None)
}

fn get_app_icon_base64(app_path: &Path, icon_file: Option<String>) -> Option<String> {
    let resources_path = app_path.join("Contents/Resources");

    // Try the icon file from Info.plist first, then common fallbacks
    let icon_names = [
        icon_file.as_deref(),
        Some("AppIcon.icns"),
        Some("Icon.icns"),
        Some("app.icns"),
    ];

    let mut icns_path = None;
    for name in icon_names.iter().flatten() {
        let path = resources_path.join(name);
        if path.exists() {
            icns_path = Some(path);
            break;
        }
    }

    let icns_path = icns_path?;

    // Use sips to convert icns to PNG and output to stdout
    let output = std::process::Command::new("sips")
        .args([
            "-s", "format", "png",
            "-Z", "64",  // Resize to 64x64
            icns_path.to_str()?,
            "--out", "/dev/stdout",
        ])
        .output()
        .ok()?;

    if output.status.success() && !output.stdout.is_empty() {
        use base64::{Engine as _, engine::general_purpose::STANDARD};
        let base64_data = STANDARD.encode(&output.stdout);
        Some(format!("data:image/png;base64,{}", base64_data))
    } else {
        None
    }
}

#[tauri::command]
pub async fn cleaner_delete_to_trash(paths: Vec<String>) -> Result<DeleteResult, String> {
    let mut deleted_count: u32 = 0;
    let mut failed_count: u32 = 0;
    let mut space_recovered: u64 = 0;
    let mut failed_paths: Vec<String> = Vec::new();

    for path_str in paths {
        let path = Path::new(&path_str);

        // Safety check
        if is_blocked_path(path) {
            failed_paths.push(format!("{} (blocked path)", path_str));
            failed_count += 1;
            continue;
        }

        if !path.exists() {
            failed_paths.push(format!("{} (not found)", path_str));
            failed_count += 1;
            continue;
        }

        // Get size before deletion
        let size = if path.is_dir() {
            calculate_folder_size(path)
        } else {
            fs::metadata(path).map(|m| m.len()).unwrap_or(0)
        };

        // Move to trash
        match trash::delete(path) {
            Ok(_) => {
                deleted_count += 1;
                space_recovered += size;
            }
            Err(e) => {
                failed_paths.push(format!("{} ({})", path_str, e));
                failed_count += 1;
            }
        }
    }

    Ok(DeleteResult {
        deleted_count,
        failed_count,
        space_recovered,
        space_recovered_formatted: format_size(space_recovered),
        failed_paths,
    })
}

#[tauri::command]
pub async fn uninstall_app(app_path: String) -> Result<DeleteResult, String> {
    let path = Path::new(&app_path);

    // Validate it's in /Applications
    if !app_path.starts_with("/Applications/") {
        return Err("Can only uninstall apps from /Applications".to_string());
    }

    if !path.exists() {
        return Err("App not found".to_string());
    }

    // Get size
    let size = calculate_folder_size(path);

    // Move app to trash
    match trash::delete(path) {
        Ok(_) => Ok(DeleteResult {
            deleted_count: 1,
            failed_count: 0,
            space_recovered: size,
            space_recovered_formatted: format_size(size),
            failed_paths: Vec::new(),
        }),
        Err(e) => Err(format!("Failed to uninstall: {}", e)),
    }
}
