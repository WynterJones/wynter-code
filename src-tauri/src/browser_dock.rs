use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Url, WebviewBuilder, WebviewUrl, WindowBuilder, WindowEvent};

static BROWSER_STATE: Mutex<Option<BrowserState>> = Mutex::new(None);
static CURRENT_URL: Mutex<Option<String>> = Mutex::new(None);

const BROWSER_WINDOW_LABEL: &str = "browser-main";
const TOOLBAR_WEBVIEW_LABEL: &str = "browser-toolbar";
const CONTENT_WEBVIEW_LABEL: &str = "browser-content";

const TOOLBAR_HEIGHT: f64 = 100.0;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserState {
    pub url: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

fn build_init_script(custom_css: Option<String>, custom_js: Option<String>) -> String {
    let css_injection = custom_css
        .map(|css| {
            let escaped_css = css.replace('`', "\\`").replace("${", "\\${");
            format!(
                r#"
(function() {{
    const style = document.createElement('style');
    style.id = 'browser-dock-custom-css';
    style.textContent = `{}`;
    document.head.appendChild(style);
}})();
"#,
                escaped_css
            )
        })
        .unwrap_or_default();

    let js_injection = custom_js
        .map(|js| {
            format!(
                r#"
(function() {{
    try {{
        {}
    }} catch (e) {{
        console.error('[BrowserDock] Custom JS error:', e);
    }}
}})();
"#,
                js
            )
        })
        .unwrap_or_default();

    format!("{}\n{}", css_injection, js_injection)
}

#[tauri::command]
pub async fn create_browser_window(
    app: AppHandle,
    url: String,
    width: f64,
    height: f64,
    custom_css: Option<String>,
    custom_js: Option<String>,
) -> Result<(), String> {
    // If window already exists, close it first
    if let Some(window) = app.get_window(BROWSER_WINDOW_LABEL) {
        // Save state before closing
        if let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size()) {
            let mut state = BROWSER_STATE.lock().expect("browser state lock poisoned");
            if let Some(s) = state.as_mut() {
                s.x = pos.x as f64;
                s.y = pos.y as f64;
                s.width = size.width as f64;
                s.height = size.height as f64;
            }
        }
        let _ = window.destroy();
    }

    let parsed_url = url.parse::<Url>().map_err(|e| format!("Invalid URL: {}", e))?;

    // Get saved state or use defaults
    let (pos_x, pos_y, saved_width, saved_height) = {
        let state = BROWSER_STATE.lock().expect("browser state lock poisoned");
        match &*state {
            Some(s) => (s.x, s.y, s.width, s.height),
            None => (100.0, 100.0, width, height),
        }
    };

    let init_script = build_init_script(custom_css, custom_js);

    // Create the window first (without webview)
    let window = WindowBuilder::new(&app, BROWSER_WINDOW_LABEL)
        .title("Browser")
        .inner_size(saved_width, saved_height)
        .position(pos_x, pos_y)
        .decorations(true)
        .resizable(true)
        .visible(false) // Start hidden, show after webviews are added
        .build()
        .map_err(|e| e.to_string())?;

    // Create toolbar webview (fixed height at top) - loads our React app
    let toolbar_webview = WebviewBuilder::new(
        TOOLBAR_WEBVIEW_LABEL,
        WebviewUrl::App("/browser-toolbar".into()),
    );

    window
        .add_child(
            toolbar_webview,
            LogicalPosition::new(0.0, 0.0),
            LogicalSize::new(saved_width, TOOLBAR_HEIGHT),
        )
        .map_err(|e| format!("Failed to add toolbar webview: {}", e))?;

    // Create content webview (rest of window) - loads external URL
    let content_webview = WebviewBuilder::new(
        CONTENT_WEBVIEW_LABEL,
        WebviewUrl::External(parsed_url.clone()),
    )
    .initialization_script(&init_script);

    window
        .add_child(
            content_webview,
            LogicalPosition::new(0.0, TOOLBAR_HEIGHT),
            LogicalSize::new(saved_width, saved_height - TOOLBAR_HEIGHT),
        )
        .map_err(|e| format!("Failed to add content webview: {}", e))?;

    // Set up window resize event handler to keep webviews properly sized
    let app_handle = app.clone();
    let window_clone = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Resized(physical_size) = event {
            // Convert physical pixels to logical pixels using scale factor
            let scale_factor = window_clone.scale_factor().unwrap_or(1.0);
            let width = physical_size.width as f64 / scale_factor;
            let height = physical_size.height as f64 / scale_factor;

            // Resize toolbar to match window width (height stays fixed)
            if let Some(toolbar) = app_handle.get_webview(TOOLBAR_WEBVIEW_LABEL) {
                let _ = toolbar.set_size(LogicalSize::new(width, TOOLBAR_HEIGHT));
            }

            // Resize content to fill remaining space below toolbar
            if let Some(content) = app_handle.get_webview(CONTENT_WEBVIEW_LABEL) {
                let _ = content.set_size(LogicalSize::new(width, height - TOOLBAR_HEIGHT));
            }
        }
    });

    // Show window after webviews are added
    window.show().map_err(|e| e.to_string())?;

    // Update state
    *BROWSER_STATE.lock().expect("browser state lock poisoned") = Some(BrowserState {
        url: url.clone(),
        x: pos_x,
        y: pos_y,
        width: saved_width,
        height: saved_height,
    });

    *CURRENT_URL.lock().expect("current url lock poisoned") = Some(url);

    Ok(())
}

#[tauri::command]
pub async fn navigate_browser_content(
    app: AppHandle,
    url: String,
    custom_css: Option<String>,
    custom_js: Option<String>,
) -> Result<(), String> {
    let window = app
        .get_window(BROWSER_WINDOW_LABEL)
        .ok_or_else(|| "Browser window not found".to_string())?;

    let parsed_url = url.parse::<Url>().map_err(|e| format!("Invalid URL: {}", e))?;

    // Get current window state (convert physical to logical pixels)
    let scale_factor = window.scale_factor().map_err(|e| e.to_string())?;
    let (pos_x, pos_y, width, height) = {
        let pos = window.outer_position().map_err(|e| e.to_string())?;
        let size = window.inner_size().map_err(|e| e.to_string())?;
        (
            pos.x as f64,
            pos.y as f64,
            size.width as f64 / scale_factor,
            size.height as f64 / scale_factor,
        )
    };

    // Remove the old content webview
    if let Some(webview) = app.get_webview(CONTENT_WEBVIEW_LABEL) {
        let _ = webview.close();
    }

    // Build init script for the new URL
    let init_script = build_init_script(custom_css, custom_js);

    // Create new content webview with the new URL
    let content_webview = WebviewBuilder::new(
        CONTENT_WEBVIEW_LABEL,
        WebviewUrl::External(parsed_url.clone()),
    )
    .initialization_script(&init_script);

    window
        .add_child(
            content_webview,
            LogicalPosition::new(0.0, TOOLBAR_HEIGHT),
            LogicalSize::new(width, height - TOOLBAR_HEIGHT),
        )
        .map_err(|e| format!("Failed to add content webview: {}", e))?;

    // Update state
    *BROWSER_STATE.lock().expect("browser state lock poisoned") = Some(BrowserState {
        url: url.clone(),
        x: pos_x,
        y: pos_y,
        width,
        height,
    });

    *CURRENT_URL.lock().expect("current url lock poisoned") = Some(url);

    Ok(())
}

#[tauri::command]
pub async fn get_current_url() -> Result<Option<String>, String> {
    let url = CURRENT_URL.lock().expect("current url lock poisoned").clone();
    Ok(url)
}

#[tauri::command]
pub async fn close_browser_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_window(BROWSER_WINDOW_LABEL) {
        // Save state before closing
        if let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size()) {
            let mut state = BROWSER_STATE.lock().expect("browser state lock poisoned");
            if let Some(s) = state.as_mut() {
                s.x = pos.x as f64;
                s.y = pos.y as f64;
                s.width = size.width as f64;
                s.height = size.height as f64;
            }
        }
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn is_browser_open(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_window(BROWSER_WINDOW_LABEL) {
        Ok(window.is_visible().unwrap_or(false))
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn get_browser_state(app: AppHandle) -> Result<Option<BrowserState>, String> {
    if let Some(window) = app.get_window(BROWSER_WINDOW_LABEL) {
        let pos = window.outer_position().map_err(|e| e.to_string())?;
        let size = window.outer_size().map_err(|e| e.to_string())?;
        let url = CURRENT_URL
            .lock()
            .expect("current url lock poisoned")
            .clone()
            .unwrap_or_default();

        Ok(Some(BrowserState {
            url,
            x: pos.x as f64,
            y: pos.y as f64,
            width: size.width as f64,
            height: size.height as f64,
        }))
    } else {
        Ok(None)
    }
}
