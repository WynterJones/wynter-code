use std::sync::Mutex;
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindowBuilder};

static LAST_POSITION: Mutex<Option<(f64, f64)>> = Mutex::new(None);

const ADVENTURER_WINDOW_LABEL: &str = "adventurer-companion";

const DEFAULT_SIZE: f64 = 160.0;

/// Open (or reveal) the always-on-top floating adventurer companion window.
#[tauri::command]
pub async fn create_adventurer_window(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(ADVENTURER_WINDOW_LABEL) {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let mut builder = WebviewWindowBuilder::new(
        &app,
        ADVENTURER_WINDOW_LABEL,
        tauri::WebviewUrl::App("/adventurer-companion".into()),
    )
    .title("")
    .inner_size(DEFAULT_SIZE, DEFAULT_SIZE)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .visible(true)
    .shadow(false);

    if let Some((px, py)) = *LAST_POSITION.lock().expect("adventurer position lock poisoned") {
        builder = builder.position(px, py);
    } else {
        builder = builder.position(x, y);
    }

    let window = builder.build().map_err(|e| e.to_string())?;
    let _ = window; // Silence unused warning on Linux

    *LAST_POSITION.lock().expect("adventurer position lock poisoned") = Some((x, y));

    Ok(())
}

#[tauri::command]
pub async fn close_adventurer_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(ADVENTURER_WINDOW_LABEL) {
        if let Ok(pos) = window.outer_position() {
            *LAST_POSITION.lock().expect("adventurer position lock poisoned") =
                Some((pos.x as f64, pos.y as f64));
        }
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn update_adventurer_position(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(ADVENTURER_WINDOW_LABEL) {
        window
            .set_position(PhysicalPosition::new(x as i32, y as i32))
            .map_err(|e| e.to_string())?;
        *LAST_POSITION.lock().expect("adventurer position lock poisoned") = Some((x, y));
    }
    Ok(())
}

#[tauri::command]
pub async fn is_adventurer_open(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window(ADVENTURER_WINDOW_LABEL) {
        Ok(window.is_visible().unwrap_or(false))
    } else {
        Ok(false)
    }
}
