use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime, WebviewWindow};

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, clear_vibrancy, NSVisualEffectMaterial};

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_acrylic, clear_acrylic};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VibrancySupportInfo {
    pub supported: bool,
    pub platform: String,
    pub materials: Vec<MaterialOption>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialOption {
    pub id: String,
    pub name: String,
    pub description: String,
}

fn get_available_materials() -> Vec<MaterialOption> {
    #[cfg(target_os = "macos")]
    {
        vec![
            MaterialOption {
                id: "sidebar".into(),
                name: "Sidebar".into(),
                description: "Default sidebar appearance".into(),
            },
            MaterialOption {
                id: "window".into(),
                name: "Window".into(),
                description: "Standard window background".into(),
            },
            MaterialOption {
                id: "content".into(),
                name: "Content".into(),
                description: "Content background".into(),
            },
            MaterialOption {
                id: "under-window".into(),
                name: "Under Window".into(),
                description: "Behind window content".into(),
            },
            MaterialOption {
                id: "hud".into(),
                name: "HUD".into(),
                description: "Heads-up display style".into(),
            },
            MaterialOption {
                id: "popover".into(),
                name: "Popover".into(),
                description: "Popover appearance".into(),
            },
            MaterialOption {
                id: "menu".into(),
                name: "Menu".into(),
                description: "Menu bar style".into(),
            },
            MaterialOption {
                id: "titlebar".into(),
                name: "Titlebar".into(),
                description: "Title bar appearance".into(),
            },
            MaterialOption {
                id: "dark".into(),
                name: "Dark".into(),
                description: "Dark vibrant appearance".into(),
            },
            MaterialOption {
                id: "ultra-dark".into(),
                name: "Ultra Dark".into(),
                description: "Very dark appearance".into(),
            },
        ]
    }

    #[cfg(target_os = "windows")]
    {
        vec![MaterialOption {
            id: "acrylic".into(),
            name: "Acrylic".into(),
            description: "Windows 10/11 acrylic blur".into(),
        }]
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        vec![]
    }
}

/// Get vibrancy support status for current platform
#[tauri::command]
pub fn get_vibrancy_support() -> VibrancySupportInfo {
    VibrancySupportInfo {
        supported: cfg!(any(target_os = "macos", target_os = "windows")),
        platform: std::env::consts::OS.to_string(),
        materials: get_available_materials(),
    }
}

/// Apply vibrancy to a specific window
#[tauri::command]
#[allow(deprecated)]
pub fn apply_window_vibrancy<R: Runtime>(
    window: WebviewWindow<R>,
    material: String,
    #[allow(unused_variables)] opacity: f64,
) -> Result<(), String> {
    println!("[Vibrancy] apply_window_vibrancy called with material: {}", material);

    #[cfg(target_os = "macos")]
    {
        // Clear existing vibrancy first to allow changing materials
        let _ = clear_vibrancy(&window);

        let ns_material = match material.as_str() {
            "titlebar" => NSVisualEffectMaterial::Titlebar,
            "selection" => NSVisualEffectMaterial::Selection,
            "menu" => NSVisualEffectMaterial::Menu,
            "popover" => NSVisualEffectMaterial::Popover,
            "sidebar" => NSVisualEffectMaterial::Sidebar,
            "header" => NSVisualEffectMaterial::HeaderView,
            "sheet" => NSVisualEffectMaterial::Sheet,
            "window" => NSVisualEffectMaterial::WindowBackground,
            "hud" => NSVisualEffectMaterial::HudWindow,
            "fullscreen" => NSVisualEffectMaterial::FullScreenUI,
            "tooltip" => NSVisualEffectMaterial::Tooltip,
            "content" => NSVisualEffectMaterial::ContentBackground,
            "under-window" => NSVisualEffectMaterial::UnderWindowBackground,
            "under-page" => NSVisualEffectMaterial::UnderPageBackground,
            "dark" | "ultra-dark" => NSVisualEffectMaterial::Dark,
            "medium-light" => NSVisualEffectMaterial::MediumLight,
            "light" => NSVisualEffectMaterial::Light,
            _ => NSVisualEffectMaterial::Sidebar,
        };

        apply_vibrancy(&window, ns_material, None, None)
            .map_err(|e| format!("Failed to apply vibrancy: {:?}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        // Clear existing acrylic first
        let _ = clear_acrylic(&window);

        let tint_opacity = (opacity * 255.0) as u8;
        apply_acrylic(&window, Some((20, 20, 32, tint_opacity)))
            .map_err(|e| format!("Failed to apply acrylic: {:?}", e))?;
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (window, material);
    }

    Ok(())
}

/// Clear vibrancy from a window
#[tauri::command]
pub fn clear_window_vibrancy<R: Runtime>(
    window: WebviewWindow<R>,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        clear_vibrancy(&window).map_err(|e| format!("Failed to clear vibrancy: {:?}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        clear_acrylic(&window).map_err(|e| format!("Failed to clear acrylic: {:?}", e))?;
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = window;
    }

    Ok(())
}

/// Apply vibrancy to all open windows
#[tauri::command]
pub fn apply_vibrancy_to_all_windows(
    app: AppHandle,
    material: String,
    opacity: f64,
) -> Result<(), String> {
    let windows = app.webview_windows();

    println!("[Vibrancy] Applying material '{}' with opacity {} to {} windows", material, opacity, windows.len());

    for (label, window) in windows {
        println!("[Vibrancy] Applying to window: {}", label);
        if let Err(e) = apply_window_vibrancy(window, material.clone(), opacity) {
            eprintln!("[Vibrancy] Failed to apply vibrancy to window '{}': {}", label, e);
        } else {
            println!("[Vibrancy] Successfully applied to window: {}", label);
        }
    }

    Ok(())
}
