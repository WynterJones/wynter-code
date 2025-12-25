use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenFrame {
    pub pixels: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

/// Capture the full screen as RGBA pixels
#[cfg(target_os = "macos")]
#[tauri::command]
pub async fn capture_screen_frame() -> Result<ScreenFrame, String> {
    use core_graphics::display::CGDisplay;
    use core_graphics::geometry::{CGPoint, CGRect, CGSize};

    let display = CGDisplay::main();
    let bounds = display.bounds();

    let rect = CGRect::new(
        &CGPoint::new(bounds.origin.x, bounds.origin.y),
        &CGSize::new(bounds.size.width, bounds.size.height),
    );

    let image = CGDisplay::screenshot(
        rect,
        core_graphics::display::kCGWindowListOptionOnScreenOnly,
        core_graphics::window::kCGNullWindowID,
        core_graphics::display::kCGWindowImageDefault,
    )
    .ok_or("Failed to capture screen")?;

    let data = image.data();
    let bytes = data.bytes();
    let bytes_per_row = image.bytes_per_row();
    let width = image.width();
    let height = image.height();

    // Convert BGRA to RGBA
    let mut rgba_pixels: Vec<u8> = Vec::with_capacity(width * height * 4);

    for row in 0..height {
        for col in 0..width {
            let offset = row * bytes_per_row + col * 4;
            if offset + 3 < bytes.len() {
                let b = bytes[offset];
                let g = bytes[offset + 1];
                let r = bytes[offset + 2];
                let a = bytes[offset + 3];
                rgba_pixels.extend_from_slice(&[r, g, b, a]);
            }
        }
    }

    Ok(ScreenFrame {
        pixels: rgba_pixels,
        width: width as u32,
        height: height as u32,
    })
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub async fn capture_screen_frame() -> Result<ScreenFrame, String> {
    Err("Screen capture is only available on macOS".to_string())
}

/// Check if screen recording permission is available
#[tauri::command]
pub fn check_gif_recording_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        use core_graphics::display::CGDisplay;
        use core_graphics::geometry::{CGPoint, CGRect, CGSize};

        let rect = CGRect::new(
            &CGPoint::new(0.0, 0.0),
            &CGSize::new(1.0, 1.0),
        );

        CGDisplay::screenshot(
            rect,
            core_graphics::display::kCGWindowListOptionOnScreenOnly,
            core_graphics::window::kCGNullWindowID,
            core_graphics::display::kCGWindowImageDefault,
        ).is_some()
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

/// Open system preferences for screen recording permission
#[tauri::command]
pub fn request_gif_recording_permission() {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")
            .spawn();
    }
}
