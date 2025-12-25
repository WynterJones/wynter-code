import { useState, useEffect, useCallback } from "react";
import { X, Film } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useGifRecording } from "./hooks/useGifRecording";
import { PreRecordingScreen } from "./PreRecordingScreen";
import { PostRecordingScreen } from "./PostRecordingScreen";
import { RecordingControls } from "./RecordingControls";
import type { GifRecordingSettings } from "./types";
import { DEFAULT_GIF_SETTINGS } from "./types";

interface GifRecorderPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GifRecorderPopup({ isOpen, onClose }: GifRecorderPopupProps) {
  const [settings, setSettings] = useState<GifRecordingSettings>(DEFAULT_GIF_SETTINGS);
  const [isStarting, setIsStarting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);

  const {
    state,
    currentRecording,
    error,
    startRecording,
    stopRecording,
    clearRecording,
    exportGif,
  } = useGifRecording();

  // Handle escape key to close when idle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && state === "idle") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, state]);

  // Duration timer while recording
  useEffect(() => {
    if (state !== "recording") {
      return;
    }

    const startTime = Date.now();
    const timer = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [state]);

  // Show controls when recording, hide when not
  useEffect(() => {
    if (state === "recording") {
      setShowControls(true);
    } else {
      setShowControls(false);
      setDuration(0);
    }
  }, [state]);

  // Reopen popup when recording completes
  useEffect(() => {
    if (state === "completed" && currentRecording && !isOpen) {
      // Recording completed while modal was closed - we need to notify parent to reopen
      // For now, we'll handle this by having the PostRecordingScreen always visible when completed
    }
  }, [state, currentRecording, isOpen]);

  const handleSettingsChange = useCallback((updates: Partial<GifRecordingSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleStartRecording = useCallback(async () => {
    setIsStarting(true);
    try {
      // Create a default region - we capture full screen and let user crop later
      const region = {
        x: 0,
        y: 0,
        width: window.screen.width,
        height: window.screen.height,
      };

      await startRecording(region, settings);

      // Close the modal while recording
      onClose();
    } catch (err) {
      console.error("Failed to start recording:", err);
    } finally {
      setIsStarting(false);
    }
  }, [settings, startRecording, onClose]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleCancelRecording = useCallback(() => {
    stopRecording();
    clearRecording();
  }, [stopRecording, clearRecording]);

  const handleNewRecording = useCallback(() => {
    clearRecording();
  }, [clearRecording]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      return await exportGif();
    } finally {
      setIsExporting(false);
    }
  }, [exportGif]);

  // Show floating controls when recording (even if modal is closed)
  if (showControls && state === "recording") {
    return (
      <RecordingControls
        duration={duration}
        onStop={handleStopRecording}
        onCancel={handleCancelRecording}
      />
    );
  }

  if (!isOpen) return null;

  // Show post-recording screen if we have a completed recording
  if (state === "completed" && currentRecording) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-bg-primary border border-border rounded-xl w-[900px] max-h-[700px] flex flex-col overflow-hidden shadow-2xl">
          {/* Header */}
          <div
            data-tauri-drag-region
            className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab"
          >
            <div className="flex items-center gap-3">
              <Film size={18} className="text-orange-500" />
              <span className="font-medium text-text-primary">
                GIF Recorder
              </span>
              <span className="text-xs text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded">
                Recording Complete
              </span>
            </div>
            <Tooltip content="Close (Esc)" side="bottom">
              <IconButton size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>

          {/* Post Recording Content */}
          <PostRecordingScreen
            recording={currentRecording}
            isExporting={isExporting}
            onExport={handleExport}
            onNewRecording={handleNewRecording}
          />
        </div>
      </div>
    );
  }

  // Show pre-recording setup screen
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-bg-primary border border-border rounded-xl w-[800px] max-h-[600px] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab"
        >
          <div className="flex items-center gap-3">
            <Film size={18} className="text-orange-500" />
            <span className="font-medium text-text-primary">
              GIF Recorder
            </span>
            <span className="text-xs text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded">
              Screen to GIF
            </span>
          </div>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Pre Recording Content */}
        <PreRecordingScreen
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onStartRecording={handleStartRecording}
          isStarting={isStarting}
        />
      </div>
    </div>
  );
}

// Export a hook for external control access
export function useGifRecorderState() {
  return useGifRecording();
}
