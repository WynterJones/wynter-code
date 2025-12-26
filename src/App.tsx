import { AppShell } from "@/components/layout/AppShell";
import { ColorPickerWindow } from "@/components/colorpicker/ColorPickerWindow";
import { MagnifierWindow } from "@/components/colorpicker/MagnifierWindow";
import { FloatingWebcamWindow, CostTrackingPopup } from "@/components/tools/webcam";
import { LauncherWindow } from "@/components/launcher";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppFont } from "@/hooks/useAppFont";
import { useSettingsStore } from "@/stores/settingsStore";

type WindowType = "main" | "color-picker" | "color-magnifier" | "floating-webcam" | "webcam-cost-popup" | "launcher";

function App() {
  useAppFont();
  const [windowType, setWindowType] = useState<WindowType>("main");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    // Check window type based on path
    const path = window.location.pathname;
    if (path === "/color-picker") {
      setWindowType("color-picker");
    } else if (path === "/color-magnifier") {
      setWindowType("color-magnifier");
    } else if (path === "/floating-webcam") {
      setWindowType("floating-webcam");
    } else if (path === "/webcam-cost-popup") {
      setWindowType("webcam-cost-popup");
    } else if (path === "/launcher") {
      setWindowType("launcher");
    } else {
      setWindowType("main");

      // Initialize Lightcast with saved settings (only on main window)
      const initLightcast = async () => {
        const { lightcastHotkey, lightcastEnabled } = useSettingsStore.getState();

        // Apply saved hotkey (Rust defaults to alt-space, so update if different)
        if (lightcastHotkey !== "alt-space") {
          try {
            await invoke("update_lightcast_hotkey", { hotkey: lightcastHotkey });
          } catch (error) {
            console.error("Failed to restore Lightcast hotkey:", error);
          }
        }

        // Apply saved enabled state (Rust defaults to enabled)
        if (!lightcastEnabled) {
          try {
            await invoke("disable_lightcast");
          } catch (error) {
            console.error("Failed to apply Lightcast disabled state:", error);
          }
        }
      };

      initLightcast();
    }
  }, []);

  // Render appropriate window based on type
  if (windowType === "color-picker") {
    return <ColorPickerWindow />;
  }

  if (windowType === "color-magnifier") {
    return <MagnifierWindow />;
  }

  if (windowType === "floating-webcam") {
    return <FloatingWebcamWindow />;
  }

  if (windowType === "webcam-cost-popup") {
    return <CostTrackingPopup />;
  }

  if (windowType === "launcher") {
    return <LauncherWindow />;
  }

  return <AppShell />;
}

export default App;
