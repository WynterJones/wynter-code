use std::sync::Mutex;
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindowBuilder};

static COST_POPUP_POSITION: Mutex<Option<(f64, f64)>> = Mutex::new(None);

const COST_POPUP_LABEL: &str = "webcam-cost-popup";

#[tauri::command]
pub async fn create_cost_popup(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(COST_POPUP_LABEL) {
        match window.is_visible() {
            Ok(_) => {
                window.show().map_err(|e| e.to_string())?;
                window
                    .set_position(PhysicalPosition::new(x as i32, y as i32))
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
        COST_POPUP_LABEL,
        tauri::WebviewUrl::App("/webcam-cost-popup".into()),
    )
    .title("")
    .inner_size(200.0, 100.0)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .visible(true)
    .shadow(false);

    if let Some((px, py)) = *COST_POPUP_POSITION.lock().unwrap() {
        builder = builder.position(px, py);
    } else {
        builder = builder.position(x, y);
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        use cocoa::base::id;
        use objc::{msg_send, sel, sel_impl};

        // NSWindowSharingType values:
        // NSWindowSharingNone = 0 - The window's contents cannot be read by another process
        // NSWindowSharingReadOnly = 1 - The window's contents can be read but not modified
        // NSWindowSharingReadWrite = 2 - The window's contents can be read and modified
        const NS_WINDOW_SHARING_NONE: u64 = 0;

        if let Ok(ns_window) = window.ns_window() {
            let ns_window = ns_window as id;
            unsafe {
                let _: () = msg_send![ns_window, setSharingType: NS_WINDOW_SHARING_NONE];
            }
        }
    }

    *COST_POPUP_POSITION.lock().unwrap() = Some((x, y));

    Ok(())
}

#[tauri::command]
pub async fn close_cost_popup(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(COST_POPUP_LABEL) {
        if let Ok(pos) = window.outer_position() {
            *COST_POPUP_POSITION.lock().unwrap() = Some((pos.x as f64, pos.y as f64));
        }
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn update_cost_popup_position(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(COST_POPUP_LABEL) {
        window
            .set_position(PhysicalPosition::new(x as i32, y as i32))
            .map_err(|e| e.to_string())?;
        *COST_POPUP_POSITION.lock().unwrap() = Some((x, y));
    }
    Ok(())
}

#[tauri::command]
pub async fn is_cost_popup_open(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window(COST_POPUP_LABEL) {
        Ok(window.is_visible().unwrap_or(false))
    } else {
        Ok(false)
    }
}
