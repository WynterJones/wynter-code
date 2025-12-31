import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Zap, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSettingsStore,
  LIGHTCAST_HOTKEYS,
  type LightcastHotkey,
} from "@/stores/settingsStore";

export function LightcastTab() {
  const {
    lightcastHotkey,
    lightcastEnabled,
    setLightcastHotkey,
    setLightcastEnabled,
  } = useSettingsStore();

  const [isChangingHotkey, setIsChangingHotkey] = useState(false);
  const [hotkeyError, setHotkeyError] = useState<string | null>(null);

  const handleHotkeyChange = async (newHotkey: LightcastHotkey) => {
    setIsChangingHotkey(true);
    setHotkeyError(null);

    try {
      await invoke("update_lightcast_hotkey", { hotkey: newHotkey });
      setLightcastHotkey(newHotkey);
    } catch (error) {
      console.error("Failed to change hotkey:", error);
      setHotkeyError(
        error instanceof Error
          ? error.message
          : "Failed to register hotkey. It may conflict with another application."
      );
    } finally {
      setIsChangingHotkey(false);
    }
  };

  const handleEnabledChange = async (enabled: boolean) => {
    try {
      if (enabled) {
        await invoke("enable_lightcast");
      } else {
        await invoke("disable_lightcast");
      }
      setLightcastEnabled(enabled);
    } catch (error) {
      console.error("Failed to toggle Lightcast:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-text-primary">Lightcast</h2>
          <p className="text-xs text-text-secondary">
            Global launcher for quick access to apps, tools, and files
          </p>
        </div>
      </div>

      {/* Enable/Disable Lightcast */}
      <div className="p-4 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="enable-lightcast" className="text-sm font-medium text-text-primary">
              Enable Lightcast
            </label>
            <p className="text-xs text-text-secondary">
              Toggle the global launcher on or off
            </p>
          </div>
          <button
            id="enable-lightcast"
            role="switch"
            aria-checked={lightcastEnabled}
            onClick={() => handleEnabledChange(!lightcastEnabled)}
            className={cn(
              "w-11 h-6 rounded-full transition-colors relative",
              lightcastEnabled ? "bg-accent" : "bg-bg-hover"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                lightcastEnabled ? "left-5" : "left-0.5"
              )}
            />
          </button>
        </div>
      </div>

      {/* Hotkey Configuration */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-text-primary">
            Keyboard Shortcut
          </label>
          <p className="text-xs text-text-secondary">
            Choose the global hotkey to open Lightcast from anywhere
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {LIGHTCAST_HOTKEYS.map((option) => (
            <button
              key={option.id}
              onClick={() => handleHotkeyChange(option.id)}
              disabled={isChangingHotkey || !lightcastEnabled}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-all",
                lightcastHotkey === option.id
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-border hover:border-accent/50 text-text-secondary hover:text-text-primary",
                (!lightcastEnabled || isChangingHotkey) && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    lightcastHotkey === option.id
                      ? "border-accent bg-accent"
                      : "border-border"
                  )}
                >
                  {lightcastHotkey === option.id && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span>{option.name}</span>
              </div>
              <kbd className="px-2 py-1 text-xs font-mono bg-bg-tertiary border border-border rounded">
                {option.display}
              </kbd>
            </button>
          ))}
        </div>

        {hotkeyError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{hotkeyError}</p>
          </div>
        )}

        {lightcastHotkey === "cmd-space" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              This may conflict with macOS Spotlight. Consider disabling Spotlight
              in System Settings or using a different hotkey.
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-bg-secondary border border-border">
        <h3 className="text-sm font-medium text-text-primary mb-2">
          How to use Lightcast
        </h3>
        <ul className="text-xs text-text-secondary space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-accent">1.</span>
            Press the hotkey from anywhere to open Lightcast
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">2.</span>
            Type to search apps, tools, projects, and files
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">3.</span>
            Use arrow keys to navigate, Enter to open
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">4.</span>
            Press Cmd+K for additional actions on any item
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">5.</span>
            Tab cycles between search modes (All/Apps/Files/Tools)
          </li>
        </ul>
      </div>
    </div>
  );
}
