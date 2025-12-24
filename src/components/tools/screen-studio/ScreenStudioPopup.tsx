import { useState, useEffect } from "react";
import { X, MonitorPlay } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useScreenRecording } from "./hooks/useScreenRecording";
import { useRecordingSettings } from "./hooks/useRecordingSettings";
import { PreRecordingScreen } from "./PreRecordingScreen";
import { PostRecordingScreen } from "./PostRecordingScreen";
import { RecordingControls } from "./RecordingControls";
import type { RecordingMode, RegionSelection } from "./types";
import "./screen-studio.css";

interface ScreenStudioPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScreenStudioPopup({ isOpen, onClose }: ScreenStudioPopupProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const {
    state,
    currentRecording,
    duration: _duration,
    error,
    startRecording,
    stopRecording: _stopRecording,
    pauseRecording: _pauseRecording,
    resumeRecording: _resumeRecording,
    cancelRecording: _cancelRecording,
    clearRecording,
  } = useScreenRecording();

  const {
    settings,
    flashlight,
    saveSettings,
    saveFlashlight,
  } = useRecordingSettings();

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && state === "idle") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, state]);

  const handleStartRecording = async (mode: RecordingMode, region?: RegionSelection) => {
    const countdownTime = settings.countdownSeconds;
    
    if (countdownTime > 0) {
      setCountdown(countdownTime);
      
      // Countdown timer
      for (let i = countdownTime; i > 0; i--) {
        setCountdown(i);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setCountdown(null);
    }
    
    await startRecording(mode, region);
    
    // Minimize popup during recording - close it so user can record
    onClose();
  };

  const handleNewRecording = () => {
    clearRecording();
  };

  if (!isOpen) return null;

  // Show post-recording screen if we have a completed recording
  if (state === "completed" && currentRecording) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-bg-primary border border-border rounded-xl w-[1100px] max-h-[850px] flex flex-col overflow-hidden shadow-2xl">
          {/* Header */}
          <div
            data-tauri-drag-region
            className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab"
          >
            <div className="flex items-center gap-3">
              <MonitorPlay size={18} className="text-accent" />
              <span className="font-medium text-text-primary">
                Screen Studio
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
            onNewRecording={handleNewRecording}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  // Show countdown overlay
  if (countdown !== null) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-[120px] font-bold text-white countdown-number">
            {countdown}
          </div>
          <p className="text-text-secondary text-lg mt-4">
            Recording starts in...
          </p>
        </div>
      </div>
    );
  }

  // Show pre-recording setup screen
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-bg-primary border border-border rounded-xl w-[1100px] max-h-[850px] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab"
        >
          <div className="flex items-center gap-3">
            <MonitorPlay size={18} className="text-accent" />
            <span className="font-medium text-text-primary">
              Screen Studio
            </span>
            <span className="text-xs text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded">
              Cinematic Screen Recorder
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
          flashlight={flashlight}
          onSettingsChange={saveSettings}
          onFlashlightChange={saveFlashlight}
          onStartRecording={handleStartRecording}
          isStarting={state === "countdown"}
        />
      </div>
    </div>
  );
}

// Floating controls component for when recording is active
export function ScreenStudioRecordingOverlay({
  duration,
  isPaused,
  onPause,
  onResume,
  onStop,
  onCancel,
}: {
  duration: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
}) {
  return (
    <RecordingControls
      duration={duration}
      isPaused={isPaused}
      onPause={onPause}
      onResume={onResume}
      onStop={onStop}
      onCancel={onCancel}
    />
  );
}
