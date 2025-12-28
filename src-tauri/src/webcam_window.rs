use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewWindowBuilder};

static LAST_POSITION: Mutex<Option<(f64, f64)>> = Mutex::new(None);
static LAST_SIZE: Mutex<Option<(f64, f64)>> = Mutex::new(None);

const WEBCAM_WINDOW_LABEL: &str = "floating-webcam";
const COST_POPUP_LABEL: &str = "webcam-cost-popup";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowPosition {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSize {
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub async fn create_floating_webcam_window(
    app: AppHandle,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(WEBCAM_WINDOW_LABEL) {
        match window.is_visible() {
            Ok(_) => {
                window.show().map_err(|e| e.to_string())?;
                window.set_focus().map_err(|e| e.to_string())?;
                window
                    .set_position(PhysicalPosition::new(x as i32, y as i32))
                    .map_err(|e| e.to_string())?;
                window
                    .set_size(PhysicalSize::new(width as u32, height as u32))
                    .map_err(|e| e.to_string())?;
                return Ok(());
            }
            Err(_) => {
                let _ = window.destroy();
            }
        }
    }

    let mut builder = WebviewWindowBuilder::new(
        &app,
        WEBCAM_WINDOW_LABEL,
        tauri::WebviewUrl::App("/floating-webcam".into()),
    )
    .title("")
    .inner_size(width, height)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(true)
    .visible(true)
    .shadow(false);

    if let Some((px, py)) = *LAST_POSITION.lock().unwrap() {
        builder = builder.position(px, py);
    } else {
        builder = builder.position(x, y);
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    // Apply vibrancy effect on macOS
    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
        let _ = apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None);
    }

    // Apply acrylic effect on Windows
    #[cfg(target_os = "windows")]
    {
        use window_vibrancy::apply_acrylic;
        let _ = apply_acrylic(&window, Some((20, 20, 32, 200)));
    }

    let _ = window; // Silence unused warning on Linux

    *LAST_POSITION.lock().unwrap() = Some((x, y));
    *LAST_SIZE.lock().unwrap() = Some((width, height));

    Ok(())
}

#[tauri::command]
pub async fn close_floating_webcam_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(WEBCAM_WINDOW_LABEL) {
        if let Ok(pos) = window.outer_position() {
            *LAST_POSITION.lock().unwrap() = Some((pos.x as f64, pos.y as f64));
        }
        if let Ok(size) = window.outer_size() {
            *LAST_SIZE.lock().unwrap() = Some((size.width as f64, size.height as f64));
        }
        window.close().map_err(|e| e.to_string())?;
    }
    if let Some(cost_window) = app.get_webview_window(COST_POPUP_LABEL) {
        let _ = cost_window.close();
    }
    Ok(())
}

#[tauri::command]
pub async fn update_floating_webcam_position(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(WEBCAM_WINDOW_LABEL) {
        window
            .set_position(PhysicalPosition::new(x as i32, y as i32))
            .map_err(|e| e.to_string())?;
        *LAST_POSITION.lock().unwrap() = Some((x, y));
    }
    Ok(())
}

#[tauri::command]
pub async fn update_floating_webcam_size(
    app: AppHandle,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(WEBCAM_WINDOW_LABEL) {
        window
            .set_size(PhysicalSize::new(width as u32, height as u32))
            .map_err(|e| e.to_string())?;
        *LAST_SIZE.lock().unwrap() = Some((width, height));
    }
    Ok(())
}

#[tauri::command]
pub async fn get_floating_webcam_state(app: AppHandle) -> Result<Option<(WindowPosition, WindowSize)>, String> {
    if let Some(window) = app.get_webview_window(WEBCAM_WINDOW_LABEL) {
        let pos = window.outer_position().map_err(|e| e.to_string())?;
        let size = window.outer_size().map_err(|e| e.to_string())?;
        Ok(Some((
            WindowPosition {
                x: pos.x,
                y: pos.y,
            },
            WindowSize {
                width: size.width,
                height: size.height,
            },
        )))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn is_floating_webcam_open(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window(WEBCAM_WINDOW_LABEL) {
        Ok(window.is_visible().unwrap_or(false))
    } else {
        Ok(false)
    }
}
