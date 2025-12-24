import { useState, useEffect, useCallback } from "react";
import type {
  WebcamSettings,
  DecartSettings,
  FloatingWindowState,
} from "../types";
import { DEFAULT_WEBCAM_SETTINGS, DEFAULT_DECART_SETTINGS } from "../types";

const STORAGE_KEY = "webcam-tool-settings";
const DECART_KEY = "webcam-decart-settings";
const WINDOW_KEY = "webcam-window-state";

export function useWebcamSettings() {
  const [settings, setSettings] = useState<WebcamSettings>(
    DEFAULT_WEBCAM_SETTINGS
  );
  const [decartSettings, setDecartSettings] = useState<DecartSettings>(
    DEFAULT_DECART_SETTINGS
  );
  const [floatingWindow, setFloatingWindow] = useState<FloatingWindowState>({
    isOpen: false,
    position: { x: 100, y: 100 },
    size: { width: 320, height: 180 },
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings({ ...DEFAULT_WEBCAM_SETTINGS, ...JSON.parse(saved) });
      }
      const savedDecart = localStorage.getItem(DECART_KEY);
      if (savedDecart) {
        const parsed = JSON.parse(savedDecart);
        setDecartSettings({
          ...DEFAULT_DECART_SETTINGS,
          ...parsed,
          apiKey: parsed.apiKey || "",
        });
      }
      const savedWindow = localStorage.getItem(WINDOW_KEY);
      if (savedWindow) {
        setFloatingWindow((prev) => ({ ...prev, ...JSON.parse(savedWindow) }));
      }
    } catch (e) {
      console.error("Failed to load webcam settings:", e);
    }
  }, []);

  const saveSettings = useCallback((newSettings: Partial<WebcamSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const saveDecartSettings = useCallback(
    (newSettings: Partial<DecartSettings>) => {
      setDecartSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        localStorage.setItem(DECART_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const saveFloatingWindow = useCallback(
    (newState: Partial<FloatingWindowState>) => {
      setFloatingWindow((prev) => {
        const updated = { ...prev, ...newState };
        localStorage.setItem(WINDOW_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_WEBCAM_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const resetDecartSettings = useCallback(() => {
    setDecartSettings(DEFAULT_DECART_SETTINGS);
    localStorage.removeItem(DECART_KEY);
  }, []);

  return {
    settings,
    decartSettings,
    floatingWindow,
    saveSettings,
    saveDecartSettings,
    saveFloatingWindow,
    setFloatingWindow,
    resetSettings,
    resetDecartSettings,
  };
}
