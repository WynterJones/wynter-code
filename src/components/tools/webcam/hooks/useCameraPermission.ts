import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export type CameraPermissionStatus =
  | "Authorized"
  | "Denied"
  | "NotDetermined"
  | "Unknown";

export function useCameraPermission() {
  const [status, setStatus] = useState<CameraPermissionStatus>("Unknown");
  const [isChecking, setIsChecking] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const checkPermission = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await invoke<CameraPermissionStatus>(
        "check_camera_permission"
      );
      setStatus(result);
      return result;
    } catch (error) {
      console.error("Failed to check camera permission:", error);
      setStatus("Unknown");
      return "Unknown" as CameraPermissionStatus;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await invoke<CameraPermissionStatus>(
        "request_camera_permission"
      );
      setStatus(result);
      return result;
    } catch (error) {
      console.error("Failed to request camera permission:", error);
      return "Unknown" as CameraPermissionStatus;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  const openSettings = useCallback(async () => {
    try {
      await invoke("open_camera_privacy_settings");
    } catch (error) {
      console.error("Failed to open camera settings:", error);
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    status,
    isChecking,
    isRequesting,
    isAuthorized: status === "Authorized",
    isDenied: status === "Denied",
    isNotDetermined: status === "NotDetermined",
    checkPermission,
    requestPermission,
    openSettings,
  };
}
