import { Pause, Play, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordingControlsProps {
  duration: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
}

export function RecordingControls({
  duration,
  isPaused,
  onPause,
  onResume,
  onStop,
  onCancel,
}: RecordingControlsProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]">
      <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl">
        {/* Recording Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              isPaused ? "bg-yellow-500" : "bg-red-500 recording-indicator"
            )}
          />
          <span className="text-white font-mono text-lg recording-timer">
            {formatTime(duration)}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/20" />

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Pause/Resume */}
          <button
            onClick={isPaused ? onResume : onPause}
            className="p-2.5 rounded-lg hover:bg-white/10 transition-colors group"
          >
            {isPaused ? (
              <Play className="w-5 h-5 text-white group-hover:text-green-400 transition-colors" />
            ) : (
              <Pause className="w-5 h-5 text-white group-hover:text-yellow-400 transition-colors" />
            )}
          </button>

          {/* Stop */}
          <button
            onClick={onStop}
            className="p-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors group"
          >
            <Square className="w-5 h-5 text-red-400 group-hover:text-red-300 transition-colors" />
          </button>

          {/* Cancel */}
          <button
            onClick={onCancel}
            className="p-2.5 rounded-lg hover:bg-white/10 transition-colors group"
          >
            <X className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
