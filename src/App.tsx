import { LauncherWindow } from "@/components/launcher";
import { BrowserToolbar } from "@/components/browser-dock";
import { useEffect, lazy, Suspense } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppFont } from "@/hooks/useAppFont";
import { useSettingsStore } from "@/stores/settingsStore";
import { useEnvStore } from "@/stores/envStore";
import { initializeMobileApi } from "@/stores/mobileApiStore";
import { ScreenReaderAnnouncerProvider } from "@/components/ui";

// Lazy load AppShell so it doesn't load when on /launcher route
const AppShell = lazy(() =>
  import("@/components/layout/AppShell").then((m) => ({ default: m.AppShell }))
);

type WindowType = "main" | "launcher" | "browser-toolbar";

// Determine window type synchronously to avoid flash
const getWindowType = (): WindowType => {
  const pathname = window.location.pathname;
  if (pathname === "/launcher") return "launcher";
  if (pathname === "/browser-toolbar") return "browser-toolbar";
  return "main";
};

function App() {
  useAppFont();
  // Determine window type immediately (no state change = no flash)
  const windowType = getWindowType();

  useEffect(() => {
    document.documentElement.classList.add("dark");

    // Only run main window initialization if we're on main
    if (windowType === "main") {

      // Initialize Lightcast with saved settings (only on main window)
      const initLightcast = async () => {
        const { lightcastHotkey, lightcastEnabled } = useSettingsStore.getState();

        // Pre-warm app cache so lightcast opens faster
        try {
          await invoke("warm_app_cache");
        } catch (error) {
          console.error("Failed to warm app cache:", error);
        }

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

      // Initialize mobile API (auto-start if enabled, sync data if running)
      const initMobileApi = async () => {
        try {
          await initializeMobileApi();
        } catch (error) {
          console.error("Failed to initialize mobile API:", error);
        }
      };

      initLightcast();
      initVibrancy();
      initEnvVars();
      initMobileApi();
    }
  }, [windowType]);

  // Render launcher window (lightweight, no lazy loading needed)
  if (windowType === "launcher") {
    return (
      <ScreenReaderAnnouncerProvider>
        <LauncherWindow />
      </ScreenReaderAnnouncerProvider>
    );
  }

  // Render browser toolbar window (embedded in browser window)
  if (windowType === "browser-toolbar") {
    return (
      <ScreenReaderAnnouncerProvider>
        <BrowserToolbar />
      </ScreenReaderAnnouncerProvider>
    );
  }

  // Render main app with lazy-loaded AppShell
  return (
    <ScreenReaderAnnouncerProvider>
      <Suspense fallback={null}>
        <AppShell />
      </Suspense>
    </ScreenReaderAnnouncerProvider>
  );
}

export default App;
