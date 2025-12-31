import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { Slider } from "@/components/ui";

interface VibrancySupportInfo {
  supported: boolean;
  platform: string;
}

export function VibrancyTab() {
  const {
    vibrancyEnabled,
    vibrancyDarkness,
    setVibrancyEnabled,
    setVibrancyDarkness,
  } = useSettingsStore();

  const [supportInfo, setSupportInfo] = useState<VibrancySupportInfo | null>(null);

  useEffect(() => {
    invoke<VibrancySupportInfo>("get_vibrancy_support")
      .then(setSupportInfo)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (vibrancyEnabled && supportInfo?.supported) {
      applyVibrancy();
    } else if (!vibrancyEnabled) {
      clearVibrancy();
    }
  }, [vibrancyEnabled, supportInfo]);

  useEffect(() => {
    // Update darkness CSS variable when it changes
    if (vibrancyEnabled) {
      document.documentElement.style.setProperty(
        "--vibrancy-darkness",
        vibrancyDarkness.toString()
      );
    }
  }, [vibrancyDarkness, vibrancyEnabled]);

  const applyVibrancy = async () => {
    try {
      // Use dark material for best effect
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
      console.error("Failed to apply vibrancy:", error);
    }
  };

  const clearVibrancy = () => {
    document.documentElement.classList.remove("vibrancy-enabled");
    document.documentElement.style.removeProperty("--vibrancy-darkness");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-text-primary">Window Vibrancy</h2>
          <p className="text-xs text-text-secondary">
            Add blur and transparency effects to windows
          </p>
        </div>
      </div>

      {supportInfo && !supportInfo.supported && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-400">
            Window vibrancy is not supported on {supportInfo.platform}.
            This feature is only available on macOS and Windows.
          </p>
        </div>
      )}

      <div className="p-4 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="enable-vibrancy" className="text-sm font-medium text-text-primary">
              Enable Vibrancy
            </label>
            <p className="text-xs text-text-secondary">
              Apply blur effect to window background
            </p>
          </div>
          <button
            id="enable-vibrancy"
            role="switch"
            aria-checked={vibrancyEnabled}
            onClick={() => setVibrancyEnabled(!vibrancyEnabled)}
            disabled={!supportInfo?.supported}
            className={cn(
              "w-11 h-6 rounded-full transition-colors relative",
              vibrancyEnabled ? "bg-accent" : "bg-bg-hover",
              !supportInfo?.supported && "opacity-50 cursor-not-allowed"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                vibrancyEnabled ? "left-5" : "left-0.5"
              )}
            />
          </button>
        </div>
      </div>

      <Slider
        label="Darkness"
        description="Adjust the darkness of the window background"
        value={Math.round(vibrancyDarkness * 100)}
        min={0}
        max={100}
        unit="%"
        showMinMax
        minLabel="Light"
        maxLabel="Dark"
        disabled={!vibrancyEnabled || !supportInfo?.supported}
        onChange={(val) => setVibrancyDarkness(val / 100)}
      />
    </div>
  );
}
