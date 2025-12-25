import { createPortal } from "react-dom";
import { Square, X } from "lucide-react";

interface RecordingControlsProps {
  duration: number;
  onStop: () => void;
  onCancel: () => void;
}

export function RecordingControls({
  duration,
  onStop,
  onCancel,
}: RecordingControlsProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const controls = (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]">
      <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl">
        {/* Recording Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white font-mono text-lg">
            {formatTime(duration)}
          </span>
          <span className="text-orange-400 text-xs font-medium uppercase tracking-wider">
            GIF
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/20" />

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Stop */}
          <button
            onClick={onStop}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <Square className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">Stop</span>
          </button>

          {/* Cancel */}
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
            title="Cancel recording"
          >
            <X className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(controls, document.body);
}
