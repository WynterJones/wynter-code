import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { DollarSign, Clock, Zap, X } from "lucide-react";
import { DECART_COST_PER_SECOND } from "./types";

export function CostTrackingPopup() {
  const [sessionStart] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const newElapsed = Math.floor((Date.now() - sessionStart) / 1000);
      setElapsed(newElapsed);
      setCreditsUsed(newElapsed * DECART_COST_PER_SECOND);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStart]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".close-button")) return;

    setIsDragging(true);
    const window = getCurrentWindow();
    await window.startDragging();
    setIsDragging(false);
  }, []);

  const handleClose = useCallback(async () => {
    await invoke("close_cost_popup");
  }, []);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        await handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  return (
    <div
      className="w-screen h-screen bg-transparent cursor-move select-none"
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-full h-full bg-neutral-900/95 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-3 text-white text-sm shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-yellow-400" />
            <span className="font-medium text-xs">Decart AI</span>
          </div>
          {isHovered && !isDragging && (
            <button
              onClick={handleClose}
              className="close-button w-5 h-5 bg-neutral-700 hover:bg-red-600 rounded flex items-center justify-center transition-colors"
            >
              <X size={10} />
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-400 text-xs">
              <Clock size={12} />
              Duration
            </span>
            <span className="font-mono text-xs">{formatTime(elapsed)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-400 text-xs">
              <DollarSign size={12} />
              Cost
            </span>
            <span className="font-mono text-xs text-green-400">
              ${creditsUsed.toFixed(3)}
            </span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-neutral-700/50">
          <p className="text-[10px] text-neutral-500 text-center">
            Invisible to screen recording
          </p>
        </div>
      </div>
    </div>
  );
}
