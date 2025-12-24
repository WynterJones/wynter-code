import { useState, useEffect, useCallback } from "react";
import type { RecordingSettings, FlashlightSettings, RegionSelection } from "../types";
import { DEFAULT_SETTINGS, DEFAULT_FLASHLIGHT } from "../types";

const STORAGE_KEY = "screen-studio-settings";
const FLASHLIGHT_STORAGE_KEY = "screen-studio-flashlight";

interface UseRecordingSettingsReturn {
  settings: RecordingSettings;
  flashlight: FlashlightSettings;
  saveSettings: (updates: Partial<RecordingSettings>) => void;
  saveFlashlight: (updates: Partial<FlashlightSettings>) => void;
  saveDefaultRegion: (region: RegionSelection | null) => void;
  resetSettings: () => void;
}

export function useRecordingSettings(): UseRecordingSettingsReturn {
  const [settings, setSettings] = useState<RecordingSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      console.warn("Failed to load screen studio settings");
    }
    return DEFAULT_SETTINGS;
  });

  const [flashlight, setFlashlight] = useState<FlashlightSettings>(() => {
    try {
      const stored = localStorage.getItem(FLASHLIGHT_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_FLASHLIGHT, ...JSON.parse(stored) };
      }
    } catch {
      console.warn("Failed to load flashlight settings");
    }
    return DEFAULT_FLASHLIGHT;
  });

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      console.warn("Failed to save screen studio settings");
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(FLASHLIGHT_STORAGE_KEY, JSON.stringify(flashlight));
    } catch {
      console.warn("Failed to save flashlight settings");
    }
  }, [flashlight]);

  const saveSettings = useCallback((updates: Partial<RecordingSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveFlashlight = useCallback((updates: Partial<FlashlightSettings>) => {
    setFlashlight((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveDefaultRegion = useCallback((region: RegionSelection | null) => {
    setSettings((prev) => ({ ...prev, defaultRegion: region }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setFlashlight(DEFAULT_FLASHLIGHT);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FLASHLIGHT_STORAGE_KEY);
  }, []);

  return {
    settings,
    flashlight,
    saveSettings,
    saveFlashlight,
    saveDefaultRegion,
    resetSettings,
  };
}
