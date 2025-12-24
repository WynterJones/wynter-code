import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Recording } from "./types";

interface RecordingPreviewProps {
  recording: Recording;
  autoPlay?: boolean;
}

export function RecordingPreview({ recording, autoPlay = false }: RecordingPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (recording.blob) {
      const url = URL.createObjectURL(recording.blob);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [recording.blob]);

  useEffect(() => {
    if (autoPlay && videoRef.current && videoUrl) {
      videoRef.current.play();
    }
  }, [autoPlay, videoUrl]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * recording.duration;
  };

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen();
  };

  if (!videoUrl) {
    return (
      <div className="w-full aspect-video bg-bg-secondary rounded-xl flex items-center justify-center">
        <span className="text-text-tertiary">No video available</span>
      </div>
    );
  }

  return (
    <div className="video-player-container w-full aspect-video relative rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain bg-black"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        muted={isMuted}
      />

      {/* Play/Pause Overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
        onClick={handlePlayPause}
      >
        <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
          {isPlaying ? (
            <Pause className="w-8 h-8 text-white" />
          ) : (
            <Play className="w-8 h-8 text-white ml-1" />
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity">
        {/* Progress Bar */}
        <div
          className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-2"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-purple-500 rounded-full"
            style={{ width: `${(currentTime / recording.duration) * 100}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tooltip content={isPlaying ? "Pause" : "Play"}>
              <IconButton size="sm" onClick={handlePlayPause}>
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white" />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip content={isMuted ? "Unmute" : "Mute"}>
              <IconButton size="sm" onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </IconButton>
            </Tooltip>
            <span className="text-xs text-white/80 ml-2 font-mono">
              {formatTime(currentTime)} / {formatTime(recording.duration)}
            </span>
          </div>
          <Tooltip content="Fullscreen">
            <IconButton size="sm" onClick={handleFullscreen}>
              <Maximize className="w-4 h-4 text-white" />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
