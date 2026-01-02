use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebouncedEventKind};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

// Directories to ignore - these cause too much noise
const IGNORED_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".output",
    "target",
    ".turbo",
    ".cache",
    "__pycache__",
    ".pytest_cache",
    "coverage",
    ".nyc_output",
];

fn should_ignore_path(path: &Path) -> bool {
    for component in path.components() {
        if let std::path::Component::Normal(name) = component {
            if let Some(name_str) = name.to_str() {
                if IGNORED_DIRS.contains(&name_str) {
                    return true;
                }
            }
        }
    }
    false
}

pub struct FileWatcherManager {
    watchers: Mutex<HashMap<String, WatcherHandle>>,
}

struct WatcherHandle {
    _watcher: notify_debouncer_mini::Debouncer<RecommendedWatcher>,
}

impl FileWatcherManager {
    pub fn new() -> Self {
        Self {
            watchers: Mutex::new(HashMap::new()),
        }
    }

    pub fn start_watching(&self, app: AppHandle, path: String) -> Result<(), String> {
        let mut watchers = self.watchers.lock().map_err(|e| e.to_string())?;

        // Stop existing watcher for this path if any
        watchers.remove(&path);

        let watch_path = PathBuf::from(&path);
        let path_clone = path.clone();
        let app_clone = app.clone();

        // Create a debounced watcher with 1 second debounce time
        let mut debouncer = new_debouncer(
            Duration::from_millis(1000),
            move |result: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
                match result {
                    Ok(events) => {
                        // Filter out ignored directories and get relevant events
                        let relevant_events: Vec<_> = events
                            .iter()
                            .filter(|e| {
                                matches!(e.kind, DebouncedEventKind::Any | DebouncedEventKind::AnyContinuous)
                                    && !should_ignore_path(&e.path)
                            })
                            .collect();

                        if !relevant_events.is_empty() {
                            // Collect changed paths for the event payload
                            let changed_paths: Vec<String> = relevant_events
                                .iter()
                                .map(|e| e.path.to_string_lossy().to_string())
                                .collect();

                            // Emit event to frontend
                            if let Some(window) = app_clone.get_webview_window("main") {
                                #[cfg(debug_assertions)]
                                if let Err(e) = window.emit("fs-change", serde_json::json!({
                                    "watchPath": path_clone.clone(),
                                    "changedPaths": changed_paths.clone(),
                                })) {
                                    eprintln!("[DEBUG] Failed to emit 'fs-change': {}", e);
                                }
                                #[cfg(not(debug_assertions))]
                                let _ = window.emit("fs-change", serde_json::json!({
                                    "watchPath": path_clone,
                                    "changedPaths": changed_paths,
                                }));
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("File watcher error: {:?}", e);
                    }
                }
            },
        )
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

        // Start watching the path recursively
        debouncer
            .watcher()
            .watch(&watch_path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch path: {}", e))?;

        watchers.insert(
            path,
            WatcherHandle {
                _watcher: debouncer,
            },
        );

        Ok(())
    }

    pub fn stop_watching(&self, path: &str) -> Result<(), String> {
        let mut watchers = self.watchers.lock().map_err(|e| e.to_string())?;
        watchers.remove(path);
        Ok(())
    }

    #[allow(dead_code)]
    pub fn stop_all(&self) -> Result<(), String> {
        let mut watchers = self.watchers.lock().map_err(|e| e.to_string())?;
        watchers.clear();
        Ok(())
    }
}

#[tauri::command]
pub fn start_file_watcher(
    app: AppHandle,
    path: String,
    state: tauri::State<'_, Arc<FileWatcherManager>>,
) -> Result<(), String> {
    state.start_watching(app, path)
}

#[tauri::command]
pub fn stop_file_watcher(
    path: String,
    state: tauri::State<'_, Arc<FileWatcherManager>>,
) -> Result<(), String> {
    state.stop_watching(&path)
}
