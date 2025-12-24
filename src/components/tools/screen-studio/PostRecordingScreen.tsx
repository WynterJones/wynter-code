import { useState, useRef, useEffect } from "react";
import {
  Download,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Clock,
  HardDrive,
  Monitor,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Recording } from "./types";
import { ExportOptions } from "./ExportOptions";
import { cn } from "@/lib/utils";

interface PostRecordingScreenProps {
  recording: Recording;
  onNewRecording: () => void;
  onClose: () => void;
}

export function PostRecordingScreen({
  recording,
  onNewRecording,
  onClose: _onClose,
}: PostRecordingScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Create object URL for video
  const videoUrl = recording.blob ? URL.createObjectURL(recording.blob) : null;

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this recording?")) {
      onNewRecording();
    }
  };

  const handleDownload = () => {
    if (!recording.blob) return;
    
    const url = URL.createObjectURL(recording.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `screen-recording-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Video Preview */}
      <div className="w-[60%] p-6 flex flex-col gap-4 border-r border-border">
        <div className="video-player-container flex-1 relative bg-black rounded-xl overflow-hidden">
          {videoUrl ? (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                muted={isMuted}
              />
              
              {/* Video Controls Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                <button
                  onClick={handlePlayPause}
                  className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </button>
              </div>
              
              {/* Progress Bar */}
              <div
                className="video-progress"
                onClick={handleSeek}
              >
                <div
                  className="video-progress-fill"
                  style={{ width: `${(currentTime / recording.duration) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-text-tertiary">
              No video available
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tooltip content={isPlaying ? "Pause" : "Play"}>
              <IconButton onClick={handlePlayPause}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </IconButton>
            </Tooltip>
            <Tooltip content={isMuted ? "Unmute" : "Mute"}>
              <IconButton onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </IconButton>
            </Tooltip>
            <span className="text-sm text-text-secondary recording-timer ml-2">
              {formatTime(currentTime)} / {formatTime(recording.duration)}
            </span>
          </div>
          <Tooltip content="Fullscreen">
            <IconButton onClick={() => videoRef.current?.requestFullscreen()}>
              <Maximize className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Recording Details & Actions */}
      <div className="w-[40%] p-6 flex flex-col gap-6">
        {/* Recording Info */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Recording Complete
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">Duration:</span>
              <span className="text-text-primary font-medium">
                {formatTime(recording.duration)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <HardDrive className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">Size:</span>
              <span className="text-text-primary font-medium">
                {recording.blob ? formatFileSize(recording.blob.size) : "Unknown"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Monitor className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">Resolution:</span>
              <span className="text-text-primary font-medium">
                {recording.metadata.width} × {recording.metadata.height}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            className={cn(
              "w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-white transition-all",
              "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500",
              "shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
            )}
          >
            <Download className="w-5 h-5" />
            Download Recording
          </button>

          <button
            onClick={() => setShowExportOptions(true)}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-medium text-text-primary bg-bg-secondary hover:bg-bg-hover border border-border transition-colors"
          >
            Export Options
          </button>
        </div>

        {/* Danger Zone */}
        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex gap-3">
            <button
              onClick={onNewRecording}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-text-primary bg-bg-secondary hover:bg-bg-hover transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New Recording
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Export Options Modal */}
        {showExportOptions && (
          <ExportOptions
            recording={recording}
            onClose={() => setShowExportOptions(false)}
          />
        )}
      </div>
    </div>
  );
}
