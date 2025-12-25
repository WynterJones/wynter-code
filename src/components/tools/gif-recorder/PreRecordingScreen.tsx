import { Play, Settings, RefreshCw } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import type { GifRecordingSettings } from "./types";
import { FRAME_RATE_OPTIONS, QUALITY_OPTIONS } from "./types";
import { cn } from "@/lib/utils";

interface PreRecordingScreenProps {
  settings: GifRecordingSettings;
  onSettingsChange: (updates: Partial<GifRecordingSettings>) => void;
  onStartRecording: () => void;
  isStarting: boolean;
}

export function PreRecordingScreen({
  settings,
  onSettingsChange,
  onStartRecording,
  isStarting,
}: PreRecordingScreenProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Column - Preview & Start */}
      <div className="w-[55%] p-6 flex flex-col gap-6 border-r border-border">
        {/* Info Section */}
        <div className="flex-1 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-border overflow-hidden relative min-h-[200px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-20 h-14 mx-auto mb-4 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
                <div className="relative">
                  <div className="w-10 h-8 rounded border-2 border-orange-400/60" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              </div>
              <p className="text-text-primary font-medium mb-2">Screen to GIF Recorder</p>
              <p className="text-text-tertiary text-sm max-w-xs mx-auto">
                Click Start to select a screen or window to record. The recording will be converted to an animated GIF.
              </p>
            </div>
          </div>

          {/* Decorative Grid */}
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full" style={{
              backgroundImage: 'linear-gradient(rgba(249, 115, 22, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(249, 115, 22, 0.3) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={onStartRecording}
          disabled={isStarting}
          className={cn(
            "flex items-center justify-center gap-3 w-full py-4 rounded-xl font-semibold text-white transition-all",
            "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500",
            "shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Play className="w-5 h-5" />
          <span>{isStarting ? "Starting..." : "Start Recording"}</span>
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
          {/* GIF Quality Settings */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              GIF Settings
            </h3>
            <div className="space-y-4">
              {/* Frame Rate */}
              <div>
                <label className="text-xs text-text-tertiary mb-2 block">Frame Rate</label>
                <div className="grid grid-cols-5 gap-2">
                  {FRAME_RATE_OPTIONS.map((fps) => (
                    <button
                      key={fps}
                      onClick={() => onSettingsChange({ frameRate: fps })}
                      className={cn(
                        "py-2 rounded-lg text-sm font-medium transition-all",
                        settings.frameRate === fps
                          ? "bg-orange-500/20 text-orange-400 border border-orange-500/50"
                          : "bg-bg-secondary text-text-secondary hover:bg-bg-hover border border-transparent"
                      )}
                    >
                      {fps}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-tertiary mt-1.5">
                  Higher = smoother but larger file
                </p>
              </div>

              {/* Quality */}
              <div>
                <label className="text-xs text-text-tertiary mb-2 block">Quality</label>
                <div className="grid grid-cols-2 gap-2">
                  {QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onSettingsChange({ quality: opt.value })}
                      className={cn(
                        "py-2.5 rounded-lg text-xs font-medium transition-all text-left px-3",
                        settings.quality === opt.value
                          ? "bg-orange-500/20 text-orange-400 border border-orange-500/50"
                          : "bg-bg-secondary text-text-secondary hover:bg-bg-hover border border-transparent"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Looping */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Playback
            </h3>
            <label className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary hover:bg-bg-hover transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-text-tertiary" />
                <span className="text-sm text-text-primary">Loop Animation</span>
              </div>
              <button
                onClick={() => onSettingsChange({ loop: !settings.loop })}
                className={cn(
                  "w-10 h-6 rounded-full transition-colors relative",
                  settings.loop ? "bg-orange-500" : "bg-bg-tertiary"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                  settings.loop ? "left-5" : "left-1"
                )} />
              </button>
            </label>
          </div>

          {/* Info */}
          <div className="p-4 rounded-lg bg-bg-secondary border border-border">
            <p className="text-xs text-text-tertiary leading-relaxed">
              After clicking Start, your system will ask you to select which screen or window to record.
              The recording will capture at the selected quality and frame rate.
            </p>
          </div>
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );
}
