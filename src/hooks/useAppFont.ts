import { useEffect } from "react";
import { useSettingsStore, APP_FONTS } from "@/stores/settingsStore";

export function useAppFont() {
  const appFont = useSettingsStore((s) => s.appFont);

  useEffect(() => {
    const fontConfig = APP_FONTS.find((f) => f.id === appFont);
    if (fontConfig) {
      document.documentElement.style.setProperty("--app-font", fontConfig.family);
    }
  }, [appFont]);
}
