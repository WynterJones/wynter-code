import { useState, useRef, useEffect, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Music } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { IconButton, Tooltip } from "@/components/ui";

interface AudioPlayerPopupProps {
  filePath: string;
  onClose: () => void;
}

export function AudioPlayerPopup({ filePath, onClose }: AudioPlayerPopupProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileName = filePath.split("/").pop() || filePath;
  const audioSrc = convertFileSrc(filePath);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
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
    if (e.key === "ArrowLeft") skip(-10);
    if (e.key === "ArrowRight") skip(10);
  }, [onClose, isPlaying, isMuted]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-play on load
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-md bg-bg-primary rounded-xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
          <span className="font-mono text-sm text-text-primary truncate">{fileName}</span>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        {/* Audio visualization placeholder */}
        <div className="flex items-center justify-center py-12 bg-gradient-to-b from-bg-secondary to-bg-primary">
          <div className="w-24 h-24 rounded-full bg-bg-hover flex items-center justify-center">
            <Music className="w-12 h-12 text-accent" />
          </div>
        </div>

        {error ? (
          <div className="p-4 text-center text-accent-red">{error}</div>
        ) : (
          <>
            <audio
              ref={audioRef}
              src={audioSrc}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
              onError={() => setError("Failed to load audio")}
            />

            {/* Controls */}
            <div className="px-4 py-4 space-y-4 bg-bg-secondary">
              {/* Progress bar */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full"
                />
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-center gap-4">
                <Tooltip content="Skip -10s" side="top">
                  <IconButton size="sm" onClick={() => skip(-10)}>
                    <SkipBack className="w-5 h-5" />
                  </IconButton>
                </Tooltip>
                <Tooltip content={isPlaying ? "Pause (Space)" : "Play (Space)"} side="top">
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full bg-accent flex items-center justify-center hover:bg-accent/90 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 text-white" />
                    ) : (
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    )}
                  </button>
                </Tooltip>
                <Tooltip content="Skip +10s" side="top">
                  <IconButton size="sm" onClick={() => skip(10)}>
                    <SkipForward className="w-5 h-5" />
                  </IconButton>
                </Tooltip>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Tooltip content={isMuted ? "Unmute (M)" : "Mute (M)"} side="top">
                  <IconButton size="sm" onClick={toggleMute}>
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </IconButton>
                </Tooltip>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-1 bg-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
