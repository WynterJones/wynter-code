import { useState } from "react";
import {
  Monitor,
  Mic,
  MicOff,
  Volume2,
  MousePointer,
  Keyboard,
  Play,
  Settings,
  Sparkles,
} from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import type { RecordingSettings, FlashlightSettings, RecordingMode, RegionSelection } from "./types";
import { cn } from "@/lib/utils";

interface PreRecordingScreenProps {
  settings: RecordingSettings;
  flashlight: FlashlightSettings;
  onSettingsChange: (updates: Partial<RecordingSettings>) => void;
  onFlashlightChange: (updates: Partial<FlashlightSettings>) => void;
  onStartRecording: (mode: RecordingMode, region?: RegionSelection) => void;
  isStarting: boolean;
}

export function PreRecordingScreen({
  settings,
  flashlight,
  onSettingsChange,
  onFlashlightChange,
  onStartRecording,
  isStarting,
}: PreRecordingScreenProps) {
  const [selectedMode, setSelectedMode] = useState<RecordingMode>(settings.defaultMode);
  const [_showAdvanced, _setShowAdvanced] = useState(false);

  const handleStart = () => {
    onStartRecording(selectedMode, settings.defaultRegion || undefined);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Column - Mode Selection */}
      <div className="w-[55%] p-6 flex flex-col gap-6 border-r border-border">
        {/* Recording Mode Cards */}
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-4">
            Recording Mode
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Full Screen Mode Card */}
            <button
              onClick={() => setSelectedMode("fullscreen")}
              className={cn(
                "mode-card group relative",
                selectedMode === "fullscreen" && "selected"
              )}
            >
              <div className="w-16 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                <Monitor className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-center">
                <div className="font-medium text-text-primary">Full Screen</div>
                <div className="text-xs text-text-tertiary">
                  Capture entire display
                </div>
              </div>
              {selectedMode === "fullscreen" && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>

            {/* Region Mode Card */}
            <button
              onClick={() => setSelectedMode("region")}
              className={cn(
                "mode-card group relative",
                selectedMode === "region" && "selected"
              )}
            >
              <div className="w-16 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center relative">
                <Monitor className="w-8 h-8 text-blue-400" />
                <div className="absolute inset-2 border-2 border-dashed border-blue-400/50 rounded" />
              </div>
              <div className="text-center">
                <div className="font-medium text-text-primary">Select Region</div>
                <div className="text-xs text-text-tertiary">
                  Choose a screen area
                </div>
              </div>
              {selectedMode === "region" && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Screen Preview Placeholder */}
        <div className="flex-1 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-border overflow-hidden relative min-h-[250px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-14 mx-auto mb-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                <Monitor className="w-10 h-10 text-purple-400/60" />
              </div>
              <p className="text-text-tertiary text-sm">
                {selectedMode === "fullscreen"
                  ? "Your entire screen will be recorded"
                  : "Click Start to select a region"}
              </p>
            </div>
          </div>
          
          {/* Decorative Grid */}
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full" style={{
              backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={isStarting}
          className={cn(
            "flex items-center justify-center gap-3 w-full py-4 rounded-xl font-semibold text-white transition-all",
            "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500",
            "shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Play className="w-5 h-5" />
          <span>Start Recording</span>
        </button>
      </div>

      {/* Right Column - Settings */}
      <OverlayScrollbarsComponent
        options={{
          scrollbars: { theme: "os-theme-custom", autoHide: "leave", autoHideDelay: 100 },
        }}
        className="w-[45%] os-theme-custom"
      >
        <div className="p-6 space-y-6">
          {/* Audio Settings */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Audio Settings
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary hover:bg-bg-hover transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-text-tertiary" />
                  <span className="text-sm text-text-primary">System Audio</span>
                </div>
                <button
                  onClick={() => onSettingsChange({ includeSystemAudio: !settings.includeSystemAudio })}
                  className={cn(
                    "w-10 h-6 rounded-full transition-colors relative",
                    settings.includeSystemAudio ? "bg-purple-500" : "bg-bg-tertiary"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    settings.includeSystemAudio ? "left-5" : "left-1"
                  )} />
                </button>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary hover:bg-bg-hover transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  {settings.includeMicrophone ? (
                    <Mic className="w-4 h-4 text-purple-400" />
                  ) : (
                    <MicOff className="w-4 h-4 text-text-tertiary" />
                  )}
                  <span className="text-sm text-text-primary">Microphone</span>
                </div>
                <button
                  onClick={() => onSettingsChange({ includeMicrophone: !settings.includeMicrophone })}
                  className={cn(
                    "w-10 h-6 rounded-full transition-colors relative",
                    settings.includeMicrophone ? "bg-purple-500" : "bg-bg-tertiary"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    settings.includeMicrophone ? "left-5" : "left-1"
                  )} />
                </button>
              </label>
            </div>
          </div>

          {/* Visual Effects */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Visual Effects
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary hover:bg-bg-hover transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <MousePointer className="w-4 h-4 text-text-tertiary" />
                  <span className="text-sm text-text-primary">Show Click Effects</span>
                </div>
                <button
                  onClick={() => onSettingsChange({ showClicks: !settings.showClicks })}
                  className={cn(
                    "w-10 h-6 rounded-full transition-colors relative",
                    settings.showClicks ? "bg-purple-500" : "bg-bg-tertiary"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    settings.showClicks ? "left-5" : "left-1"
                  )} />
                </button>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary hover:bg-bg-hover transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Keyboard className="w-4 h-4 text-text-tertiary" />
                  <span className="text-sm text-text-primary">Show Keystrokes</span>
                </div>
                <button
                  onClick={() => onSettingsChange({ showKeystrokes: !settings.showKeystrokes })}
                  className={cn(
                    "w-10 h-6 rounded-full transition-colors relative",
                    settings.showKeystrokes ? "bg-purple-500" : "bg-bg-tertiary"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    settings.showKeystrokes ? "left-5" : "left-1"
                  )} />
                </button>
              </label>
            </div>
          </div>

          {/* Recording Quality */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Quality Settings
            </h3>
            <div className="space-y-4">
              {/* FPS Selection */}
              <div>
                <label className="text-xs text-text-tertiary mb-2 block">Frame Rate</label>
                <div className="grid grid-cols-2 gap-2">
                  {([30, 60] as const).map((fps) => (
                    <button
                      key={fps}
                      onClick={() => onSettingsChange({ fps })}
                      className={cn(
                        "py-2.5 rounded-lg text-sm font-medium transition-all",
                        settings.fps === fps
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                          : "bg-bg-secondary text-text-secondary hover:bg-bg-hover border border-transparent"
                      )}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Selection */}
              <div>
                <label className="text-xs text-text-tertiary mb-2 block">Video Quality</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["low", "medium", "high", "ultra"] as const).map((quality) => (
                    <button
                      key={quality}
                      onClick={() => onSettingsChange({ quality })}
                      className={cn(
                        "py-2 rounded-lg text-xs font-medium transition-all capitalize",
                        settings.quality === quality
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                          : "bg-bg-secondary text-text-secondary hover:bg-bg-hover border border-transparent"
                      )}
                    >
                      {quality}
                    </button>
                  ))}
                </div>
              </div>

              {/* Countdown */}
              <div>
                <label className="text-xs text-text-tertiary mb-2 block">Countdown (seconds)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 3, 5, 10].map((seconds) => (
                    <button
                      key={seconds}
                      onClick={() => onSettingsChange({ countdownSeconds: seconds })}
                      className={cn(
                        "py-2 rounded-lg text-sm font-medium transition-all",
                        settings.countdownSeconds === seconds
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                          : "bg-bg-secondary text-text-secondary hover:bg-bg-hover border border-transparent"
                      )}
                    >
                      {seconds === 0 ? "None" : `${seconds}s`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Flashlight Mode */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Flashlight Mode
              <span className="text-[10px] text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded">PRO</span>
            </h3>
            <div className="p-3 rounded-lg bg-bg-secondary">
              <label className="flex items-center justify-between cursor-pointer mb-3">
                <span className="text-sm text-text-primary">Enable Spotlight Effect</span>
                <button
                  onClick={() => onFlashlightChange({ enabled: !flashlight.enabled })}
                  className={cn(
                    "w-10 h-6 rounded-full transition-colors relative",
                    flashlight.enabled ? "bg-purple-500" : "bg-bg-tertiary"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    flashlight.enabled ? "left-5" : "left-1"
                  )} />
                </button>
              </label>
              <p className="text-xs text-text-tertiary">
                Hold {flashlight.hotkey} to dim screen except around cursor
              </p>
            </div>
          </div>
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );
}
