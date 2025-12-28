use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CameraPermissionStatus {
    Authorized,
    Denied,
    NotDetermined,
    Unknown,
}

/// Check camera permission status using a test capture approach
/// This works by trying to access the camera via system command
#[tauri::command]
pub fn check_camera_permission() -> CameraPermissionStatus {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        // Use tccutil to check if camera permission is set for the app
        // This is a simple heuristic - we check if the system would allow camera access
        // by attempting a minimal AVFoundation operation via swift command
        let output = Command::new("swift")
            .arg("-e")
            .arg(r#"
import AVFoundation
let status = AVCaptureDevice.authorizationStatus(for: .video)
switch status {
case .authorized: print("authorized")
case .denied: print("denied")
case .restricted: print("denied")
case .notDetermined: print("notDetermined")
@unknown default: print("unknown")
}
"#)
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let result = stdout.trim();
                match result {
                    "authorized" => CameraPermissionStatus::Authorized,
                    "denied" => CameraPermissionStatus::Denied,
                    "notDetermined" => CameraPermissionStatus::NotDetermined,
                    _ => CameraPermissionStatus::Unknown,
                }
            }
            Err(_) => CameraPermissionStatus::Unknown,
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        // On other platforms, assume authorized (browser handles permissions)
        CameraPermissionStatus::Authorized
    }
}

/// Request camera permission by triggering a permission prompt
/// This uses Swift to call AVCaptureDevice.requestAccess which shows the system dialog
#[tauri::command]
pub async fn request_camera_permission() -> CameraPermissionStatus {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        let output = Command::new("swift")
            .arg("-e")
            .arg(r#"
import AVFoundation
import Foundation

let semaphore = DispatchSemaphore(value: 0)
var granted = false

AVCaptureDevice.requestAccess(for: .video) { result in
    granted = result
    semaphore.signal()
}

semaphore.wait()
print(granted ? "authorized" : "denied")
"#)
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let result = stdout.trim();
                if result == "authorized" {
                    CameraPermissionStatus::Authorized
                } else {
                    CameraPermissionStatus::Denied
                }
            }
            Err(_) => CameraPermissionStatus::Unknown,
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        CameraPermissionStatus::Authorized
    }
}

/// Open the Camera privacy settings in System Preferences
#[tauri::command]
pub fn open_camera_privacy_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Camera")
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
