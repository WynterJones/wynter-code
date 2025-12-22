import { useState, useRef, useEffect, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { IconButton, Tooltip } from "@/components/ui";

interface VideoViewerPopupProps {
  filePath: string;
  onClose: () => void;
}

export function VideoViewerPopup({ filePath, onClose }: VideoViewerPopupProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileName = filePath.split("/").pop() || filePath;
  const videoSrc = convertFileSrc(filePath);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === " ") { e.preventDefault(); togglePlay(); }
    if (e.key === "m") toggleMute();
    if (e.key === "f") toggleFullscreen();
    if (e.key === "ArrowLeft") skip(-10);
    if (e.key === "ArrowRight") skip(10);
  }, [onClose, isPlaying, isMuted]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/90 backdrop-blur-sm">
      <div className="w-full h-full max-w-[calc(100vw-40px)] max-h-[calc(100vh-40px)] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header - Drags the window */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing"
        >
          <span className="font-mono text-sm text-text-primary">{fileName}</span>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        {/* Video Container */}
        <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
          {error ? (
            <div className="text-accent-red">{error}</div>
          ) : (
            <video
              ref={videoRef}
              src={videoSrc}
              className="max-w-full max-h-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
              onError={() => setError("Failed to load video")}
              onClick={togglePlay}
            />
          )}
        </div>

        {/* Controls */}
        {!error && (
          <div className="px-4 py-3 border-t border-border bg-bg-secondary space-y-2">
            {/* Progress bar */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full"
            />

            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tooltip content="Skip -10s" side="top">
                  <IconButton size="sm" onClick={() => skip(-10)}>
                    <SkipBack className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
                <Tooltip content={isPlaying ? "Pause (Space)" : "Play (Space)"} side="top">
                  <IconButton size="sm" onClick={togglePlay}>
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </IconButton>
                </Tooltip>
                <Tooltip content="Skip +10s" side="top">
                  <IconButton size="sm" onClick={() => skip(10)}>
                    <SkipForward className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
                <span className="text-xs text-text-secondary ml-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip content={isMuted ? "Unmute (M)" : "Mute (M)"} side="top">
                  <IconButton size="sm" onClick={toggleMute}>
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </IconButton>
                </Tooltip>
                <Tooltip content="Fullscreen (F)" side="top">
                  <IconButton size="sm" onClick={toggleFullscreen}>
                    <Maximize className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
