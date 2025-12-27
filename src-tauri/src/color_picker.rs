use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewWindowBuilder};

// Store last window position
static LAST_POSITION: Mutex<Option<(f64, f64)>> = Mutex::new(None);

// Store magnifier window ID for self-exclusion from screenshots
static MAGNIFIER_WINDOW_ID: Mutex<Option<u32>> = Mutex::new(None);

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MagnifierData {
    pub pixels: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub center_color: ColorResult,
    pub cursor_x: f64,
    pub cursor_y: f64,
}

/// Pick the color at the current cursor position using screen capture
#[cfg(target_os = "macos")]
#[tauri::command]
#[allow(deprecated)]
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
#[allow(deprecated)]
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

/// Capture a region of pixels around the cursor for the magnifier
#[cfg(target_os = "macos")]
#[tauri::command]
#[allow(deprecated)]
pub async fn capture_magnifier_region(app: AppHandle, zoom_in: bool) -> Result<MagnifierData, String> {
    use cocoa::base::id;
    use cocoa::foundation::{NSArray, NSPoint};
    use core_graphics::display::CGDisplay;
    use core_graphics::geometry::{CGPoint, CGRect, CGSize};
    use objc::runtime::Class;
    use objc::{msg_send, sel, sel_impl};

    // Zoomed out (default): larger area, less magnification
    // Zoomed in (shift): smaller area, more magnification
    let capture_size: i32 = if zoom_in { 11 } else { 21 }; // 21x21 default, 11x11 when zoomed

    unsafe {
        // Get cursor position from NSEvent (global screen coordinates)
        let event_class = Class::get("NSEvent").ok_or("NSEvent not found")?;
        let mouse_location: NSPoint = msg_send![event_class, mouseLocation];

        // Get all screens and find the one containing the cursor
        let screen_class = Class::get("NSScreen").ok_or("NSScreen not found")?;
        let screens: id = msg_send![screen_class, screens];
        let screen_count: usize = NSArray::count(screens) as usize;

        // Find screen containing cursor and get total screen height for Y conversion
        // macOS coordinate system has origin at bottom-left of the primary screen
        // CGDisplay coordinate system has origin at top-left
        let mut containing_screen: id = msg_send![screen_class, mainScreen];
        let primary_screen: id = if screen_count > 0 {
            NSArray::objectAtIndex(screens, 0u64)
        } else {
            containing_screen
        };
        let primary_frame: cocoa::foundation::NSRect = msg_send![primary_screen, frame];

        for i in 0..screen_count {
            let screen: id = NSArray::objectAtIndex(screens, i as u64);
            let frame: cocoa::foundation::NSRect = msg_send![screen, frame];

            // Check if cursor is within this screen's frame
            if mouse_location.x >= frame.origin.x
                && mouse_location.x < frame.origin.x + frame.size.width
                && mouse_location.y >= frame.origin.y
                && mouse_location.y < frame.origin.y + frame.size.height
            {
                containing_screen = screen;
                break;
            }
        }

        // Get the frame of the containing screen
        let _screen_frame: cocoa::foundation::NSRect = msg_send![containing_screen, frame];

        // For CGDisplay, we need to use the primary screen's height for Y flipping
        // because CGDisplay uses top-left origin relative to the primary display
        let primary_height = primary_frame.size.height + primary_frame.origin.y;

        // NSEvent.mouseLocation is in the global coordinate system (bottom-left origin)
        // CGDisplay coordinates are top-left origin
        // The conversion is: cg_y = primary_screen_max_y - ns_y
        let cursor_x_cg = mouse_location.x;
        let cursor_y_cg = primary_height - mouse_location.y;

        // CGDisplay::screenshot works in points (logical coordinates)
        let half_size = capture_size / 2;

        let x = (cursor_x_cg as i32 - half_size).max(0);
        let y = (cursor_y_cg as i32 - half_size).max(0);

        let rect = CGRect::new(
            &CGPoint::new(x as f64, y as f64),
            &CGSize::new(capture_size as f64, capture_size as f64),
        );

        // Get magnifier window ID for exclusion (if set)
        let window_id = MAGNIFIER_WINDOW_ID.lock().unwrap().unwrap_or(0);

        // Capture screenshot, excluding the magnifier window if it exists
        let list_option = if window_id > 0 {
            core_graphics::display::kCGWindowListOptionOnScreenBelowWindow
        } else {
            core_graphics::display::kCGWindowListOptionOnScreenOnly
        };

        let image = CGDisplay::screenshot(
            rect,
            list_option,
            window_id,
            core_graphics::display::kCGWindowImageDefault,
        )
        .ok_or("Failed to capture screen region")?;

        // Update magnifier window position to center on cursor
        // Window size depends on zoom mode
        let window_size = if zoom_in { 130.0 } else { 170.0 };
        let window_height = window_size + 30.0; // Extra for color label

        if let Some(window) = app.get_webview_window("color-magnifier") {
            // CG coordinates (top-left origin) can be used directly for window position
            let win_x = cursor_x_cg - (window_size / 2.0);
            let win_y = cursor_y_cg - (window_size / 2.0);

            let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                x: win_x,
                y: win_y,
            }));

            // Resize window based on zoom mode
            let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                width: window_size,
                height: window_height,
            }));

            // Keep focus on the magnifier window
            let _ = window.set_focus();
        }

        // Get pixel data from the captured image
        let data = image.data();
        let bytes = data.bytes();
        let bytes_per_row = image.bytes_per_row();
        let actual_width = image.width();
        let actual_height = image.height();

        // The screenshot returns physical pixels on Retina displays
        // We need to sample to get logical pixels (capture_size x capture_size)
        let output_size = capture_size as usize;
        let step = if actual_width > capture_size as usize {
            actual_width as usize / output_size
        } else {
            1
        };

        let mut rgba_pixels: Vec<u8> = Vec::with_capacity(output_size * output_size * 4);

        for row in 0..output_size {
            for col in 0..output_size {
                let src_row = (row * step).min(actual_height as usize - 1);
                let src_col = (col * step).min(actual_width as usize - 1);
                let offset = src_row * bytes_per_row as usize + src_col * 4;

                if offset + 3 < bytes.len() {
                    let b = bytes[offset];
                    let g = bytes[offset + 1];
                    let r = bytes[offset + 2];
                    let a = bytes[offset + 3];
                    rgba_pixels.extend_from_slice(&[r, g, b, a]);
                } else {
                    rgba_pixels.extend_from_slice(&[128, 128, 128, 255]);
                }
            }
        }

        // Get center pixel color
        let center = output_size / 2;
        let center_offset = (center * output_size + center) * 4;
        let center_color = if center_offset + 3 < rgba_pixels.len() {
            ColorResult::new(
                rgba_pixels[center_offset],
                rgba_pixels[center_offset + 1],
                rgba_pixels[center_offset + 2],
                rgba_pixels[center_offset + 3] as f32 / 255.0,
            )
        } else {
            ColorResult::new(128, 128, 128, 1.0)
        };

        Ok(MagnifierData {
            pixels: rgba_pixels,
            width: output_size as u32,
            height: output_size as u32,
            center_color,
            cursor_x: cursor_x_cg,
            cursor_y: cursor_y_cg,
        })
    }
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub async fn capture_magnifier_region(_app: AppHandle, _zoom_in: bool) -> Result<MagnifierData, String> {
    Err("Magnifier is only available on macOS".to_string())
}

/// Start color picking mode - creates the magnifier overlay window
#[tauri::command]
pub async fn start_color_picking_mode(app: AppHandle) -> Result<(), String> {
    // Close existing magnifier if any
    if let Some(window) = app.get_webview_window("color-magnifier") {
        let _ = window.destroy();
    }

    // Create magnifier window with transparency (start with larger zoomed-out size)
    let window = WebviewWindowBuilder::new(
        &app,
        "color-magnifier",
        tauri::WebviewUrl::App("/color-magnifier".into()),
    )
    .title("")
    .inner_size(170.0, 200.0) // Default larger size for zoomed-out view
    .decorations(false)
    .transparent(true) // Enable transparent background
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .visible(true)
    .focused(true)
    .shadow(false) // No shadow for transparent window
    .build()
    .map_err(|e| e.to_string())?;

    // Store window ID for screenshot exclusion
    #[cfg(target_os = "macos")]
    #[allow(deprecated)]
    {
        use cocoa::base::id;
        use objc::{msg_send, sel, sel_impl};

        if let Ok(ns_window) = window.ns_window() {
            unsafe {
                let ns_window = ns_window as id;
                let window_number: i64 = msg_send![ns_window, windowNumber];
                *MAGNIFIER_WINDOW_ID.lock().unwrap() = Some(window_number as u32);
            }
        }
    }

    Ok(())
}

/// Stop color picking mode - closes magnifier and optionally opens color picker
#[tauri::command]
pub async fn stop_color_picking_mode(
    app: AppHandle,
    picked_color: Option<ColorResult>,
) -> Result<(), String> {
    // Clear magnifier window ID
    *MAGNIFIER_WINDOW_ID.lock().unwrap() = None;

    // Close magnifier window
    if let Some(window) = app.get_webview_window("color-magnifier") {
        window.close().map_err(|e| e.to_string())?;
    }

    // If a color was picked, open the color picker window with it
    if let Some(color) = picked_color {
        open_color_picker_window(app, Some(color)).await?;
    }

    Ok(())
}

/// Update magnifier window position to follow cursor
#[tauri::command]
pub async fn update_magnifier_position(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("color-magnifier") {
        // Offset the window so it doesn't appear directly under cursor
        // Place it 20px to the right and 20px down
        let offset_x = x + 20.0;
        let offset_y = y + 20.0;

        window
            .set_position(tauri::Position::Logical(tauri::LogicalPosition {
                x: offset_x,
                y: offset_y,
            }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
