use tauri::{AppHandle, Manager, WebviewWindowBuilder};

const REGION_SELECTOR_WINDOW_LABEL: &str = "gif-region-selector";

#[tauri::command]
pub async fn open_gif_region_selector_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(REGION_SELECTOR_WINDOW_LABEL) {
        match window.is_visible() {
            Ok(_) => {
                window.show().map_err(|e| e.to_string())?;
                window.set_focus().map_err(|e| e.to_string())?;
                return Ok(());
            }
            Err(_) => {
                let _ = window.destroy();
            }
        }
    }

    let primary_monitor = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("No primary monitor found")?;

    let size = primary_monitor.size();
    let position = primary_monitor.position();

    let builder = WebviewWindowBuilder::new(
        &app,
        REGION_SELECTOR_WINDOW_LABEL,
        tauri::WebviewUrl::App("/gif-region-selector".into()),
    )
    .title("GIF Region Selector")
    .inner_size(size.width as f64, size.height as f64)
    .position(position.x as f64, position.y as f64)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .visible(true)
    .shadow(false)
    .fullscreen(false);

    builder.build().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn close_gif_region_selector_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(REGION_SELECTOR_WINDOW_LABEL) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn is_gif_region_selector_open(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window(REGION_SELECTOR_WINDOW_LABEL) {
        Ok(window.is_visible().unwrap_or(false))
    } else {
        Ok(false)
    }
}

