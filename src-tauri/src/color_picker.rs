use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewWindowBuilder};

// Store last window position
static LAST_POSITION: Mutex<Option<(f64, f64)>> = Mutex::new(None);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorResult {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: f32,
    pub hex: String,
}

impl ColorResult {
    pub fn new(r: u8, g: u8, b: u8, a: f32) -> Self {
        let hex = format!("{:02X}{:02X}{:02X}", r, g, b);
        Self { r, g, b, a, hex }
    }
}

/// Pick the color at the current cursor position using screen capture
#[cfg(target_os = "macos")]
#[tauri::command]
pub async fn pick_screen_color() -> Result<ColorResult, String> {
    use cocoa::base::id;
    use cocoa::foundation::NSPoint;
    use objc::runtime::Class;
    use objc::{msg_send, sel, sel_impl};

    unsafe {
        // Get cursor position
        let event_class = Class::get("NSEvent").ok_or("NSEvent not found")?;
        let mouse_location: NSPoint = msg_send![event_class, mouseLocation];

        // Get the main screen to convert coordinates
        let screen_class = Class::get("NSScreen").ok_or("NSScreen not found")?;
        let main_screen: id = msg_send![screen_class, mainScreen];
        let screen_frame: cocoa::foundation::NSRect = msg_send![main_screen, frame];

        // Convert to screen coordinates (macOS uses bottom-left origin, CGDisplay uses top-left)
        let x = mouse_location.x as i32;
        let y = (screen_frame.size.height - mouse_location.y) as i32;

        // Capture 1x1 pixel at cursor position
        let rect = core_graphics::geometry::CGRect::new(
            &core_graphics::geometry::CGPoint::new(x as f64, y as f64),
            &core_graphics::geometry::CGSize::new(1.0, 1.0),
        );

        let image = core_graphics::display::CGDisplay::screenshot(
            rect,
            core_graphics::display::kCGWindowListOptionOnScreenOnly,
            core_graphics::window::kCGNullWindowID,
            core_graphics::display::kCGWindowImageDefault,
        )
        .ok_or("Failed to capture screen")?;

        // Get pixel data from the image
        let data = image.data();
        let pixel_data = data.bytes();

        if pixel_data.len() >= 4 {
            // macOS uses BGRA format
            let b = pixel_data[0];
            let g = pixel_data[1];
            let r = pixel_data[2];
            let a = pixel_data[3];

            Ok(ColorResult::new(r, g, b, a as f32 / 255.0))
        } else {
            Err("Invalid pixel data".to_string())
        }
    }
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub async fn pick_screen_color() -> Result<ColorResult, String> {
    Err("Color picker is only available on macOS".to_string())
}

/// Open the color picker window
#[tauri::command]
pub async fn open_color_picker_window(
    app: AppHandle,
    color: Option<ColorResult>,
) -> Result<(), String> {
    // Check if window already exists and is valid
    if let Some(window) = app.get_webview_window("color-picker") {
        // Try to check if window is still valid by getting its visibility
        match window.is_visible() {
            Ok(_) => {
                // Window is valid, show and focus it
                window.show().map_err(|e| e.to_string())?;
                window.set_focus().map_err(|e| e.to_string())?;

                // Send color to the window if provided
                if let Some(c) = color {
                    window.emit("color-picked", c).map_err(|e| e.to_string())?;
                }
                return Ok(());
            }
            Err(_) => {
                // Window is invalid/closed, destroy it and create new one
                let _ = window.destroy();
            }
        }
    }

    // Create new window
    let mut builder = WebviewWindowBuilder::new(
        &app,
        "color-picker",
        tauri::WebviewUrl::App("/color-picker".into()),
    )
    .title("Color Picker")
    .inner_size(280.0, 510.0)
    .resizable(false)
    .always_on_top(true)
    .decorations(false)
    .shadow(true)
    .visible(true)
    .skip_taskbar(true);

    // Use last position if available, otherwise center
    if let Some((x, y)) = *LAST_POSITION.lock().unwrap() {
        builder = builder.position(x, y);
    } else {
        builder = builder.center();
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    // Send color to the window after a short delay to ensure it's ready
    if let Some(c) = color {
        let window_clone = window.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
            let _ = window_clone.emit("color-picked", c);
        });
    }

    Ok(())
}

/// Close the color picker window
#[tauri::command]
pub async fn close_color_picker_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("color-picker") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Get the current cursor position (for window positioning)
#[cfg(target_os = "macos")]
#[tauri::command]
pub fn get_cursor_position() -> Result<(f64, f64), String> {
    use cocoa::base::id;
    use cocoa::foundation::NSPoint;
    use objc::runtime::Class;
    use objc::{msg_send, sel, sel_impl};

    unsafe {
        let event_class = Class::get("NSEvent").ok_or("NSEvent not found")?;
        let mouse_location: NSPoint = msg_send![event_class, mouseLocation];

        let screen_class = Class::get("NSScreen").ok_or("NSScreen not found")?;
        let main_screen: id = msg_send![screen_class, mainScreen];
        let screen_frame: cocoa::foundation::NSRect = msg_send![main_screen, frame];

        // Convert to screen coordinates (flip Y)
        let x = mouse_location.x;
        let y = screen_frame.size.height - mouse_location.y;

        Ok((x, y))
    }
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn get_cursor_position() -> Result<(f64, f64), String> {
    Err("Not supported on this platform".to_string())
}

/// Pick color and immediately open the picker window with that color
#[tauri::command]
pub async fn pick_color_and_show(app: AppHandle) -> Result<ColorResult, String> {
    let color = pick_screen_color().await?;
    open_color_picker_window(app, Some(color.clone())).await?;
    Ok(color)
}

/// Check if screen recording permission is granted (macOS)
#[cfg(target_os = "macos")]
#[tauri::command]
pub fn check_screen_recording_permission() -> bool {
    use core_graphics::display::CGDisplay;

    // Try to capture a tiny screenshot - this will fail if no permission
    let rect = core_graphics::geometry::CGRect::new(
        &core_graphics::geometry::CGPoint::new(0.0, 0.0),
        &core_graphics::geometry::CGSize::new(1.0, 1.0),
    );

    CGDisplay::screenshot(
        rect,
        core_graphics::display::kCGWindowListOptionOnScreenOnly,
        core_graphics::window::kCGNullWindowID,
        core_graphics::display::kCGWindowImageDefault,
    ).is_some()
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn check_screen_recording_permission() -> bool {
    true // Non-macOS platforms don't need this permission
}

/// Request screen recording permission (opens System Preferences)
#[cfg(target_os = "macos")]
#[tauri::command]
pub fn request_screen_recording_permission() {
    // Open System Preferences to Screen Recording
    let _ = std::process::Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")
        .spawn();
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn request_screen_recording_permission() {
    // No-op on other platforms
}

/// Save the color picker window position
#[tauri::command]
pub fn save_color_picker_position(x: f64, y: f64) {
    *LAST_POSITION.lock().unwrap() = Some((x, y));
}
