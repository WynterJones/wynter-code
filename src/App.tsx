import { AppShell } from "@/components/layout/AppShell";
import { FloatingWebcamWindow, CostTrackingPopup } from "@/components/tools/webcam";
import { LauncherWindow } from "@/components/launcher";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppFont } from "@/hooks/useAppFont";
import { useSettingsStore } from "@/stores/settingsStore";
import { useEnvStore } from "@/stores/envStore";

type WindowType = "main" | "floating-webcam" | "webcam-cost-popup" | "launcher";

function App() {
  useAppFont();
  const [windowType, setWindowType] = useState<WindowType>("main");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    // Check window type based on path
    const path = window.location.pathname;
    if (path === "/floating-webcam") {
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

      // Initialize vibrancy with saved settings
      const initVibrancy = async () => {
        const { vibrancyEnabled, vibrancyDarkness } = useSettingsStore.getState();
        if (vibrancyEnabled) {
          try {
            await invoke("apply_vibrancy_to_all_windows", {
              material: "dark",
              opacity: 1.0,
            });
            document.documentElement.classList.add("vibrancy-enabled");
            document.documentElement.style.setProperty(
              "--vibrancy-darkness",
              vibrancyDarkness.toString()
            );
          } catch (error) {
            console.error("Failed to initialize vibrancy:", error);
          }
        }
      };

      // Initialize stored environment variables
      const initEnvVars = async () => {
        try {
          await useEnvStore.getState().initializeEnvVars();
        } catch (error) {
          console.error("Failed to initialize env vars:", error);
        }
      };

      initLightcast();
      initVibrancy();
      initEnvVars();
    }
  }, []);

  // Render appropriate window based on type
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
