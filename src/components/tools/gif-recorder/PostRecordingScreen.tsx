import { useState, useRef, useEffect } from "react";
import {
  Download,
  Copy,
  RotateCcw,
  Play,
  Pause,
  Clock,
  Image,
  Layers,
} from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import type { GifRecording } from "./types";
import { cn } from "@/lib/utils";

interface PostRecordingScreenProps {
  recording: GifRecording;
  isExporting: boolean;
  onExport: () => Promise<Blob>;
  onNewRecording: () => void;
}

export function PostRecordingScreen({
  recording,
  isExporting,
  onExport,
  onNewRecording,
}: PostRecordingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const duration = recording.duration / 1000;
  const frameCount = recording.frames.length;

  // Animate preview by cycling through frames
  useEffect(() => {
    if (!isPlaying || frameCount === 0) return;

    const interval = 1000 / recording.settings.frameRate;
    const timer = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frameCount);
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, frameCount, recording.settings.frameRate]);

  // Draw current frame to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frameCount === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frame = recording.frames[currentFrame];
    if (!frame) return;

    canvas.width = frame.width;
    canvas.height = frame.height;
    ctx.putImageData(frame, 0, 0);
  }, [currentFrame, recording.frames, frameCount]);

  // Generate GIF preview on mount
  useEffect(() => {
    const generatePreview = async () => {
      try {
        const blob = await onExport();
        setExportedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (err) {
        console.error("Failed to generate GIF preview:", err);
      }
    };

    generatePreview();

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const handleDownload = async () => {
    try {
      const blob = exportedBlob || await onExport();

      const filePath = await save({
        defaultPath: `gif-recording-${Date.now()}.gif`,
        filters: [{ name: "GIF", extensions: ["gif"] }],
      });

      if (filePath) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await writeFile(filePath, uint8Array);
      }
    } catch (err) {
      console.error("Failed to save GIF:", err);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const blob = exportedBlob || await onExport();
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/gif": blob,
        }),
      ]);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Preview */}
      <div className="w-[60%] p-6 flex flex-col gap-4 border-r border-border">
        <div className="flex-1 relative bg-black rounded-xl overflow-hidden flex items-center justify-center">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="GIF Preview"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain"
            />
          )}

          {/* Play/Pause overlay for canvas preview */}
          {!previewUrl && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </button>
            </div>
          )}

          {/* Frame counter */}
          {!previewUrl && (
            <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/60 text-white text-xs font-mono">
              Frame {currentFrame + 1} / {frameCount}
            </div>
          )}

          {/* Processing indicator */}
          {isExporting && !previewUrl && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white text-sm">Generating GIF...</div>
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            {previewUrl ? "GIF Preview" : "Frame Preview"}
          </div>
          {!previewUrl && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                "bg-bg-secondary hover:bg-bg-hover text-text-primary"
              )}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
          )}
        </div>
      </div>

      {/* Details & Export */}
      <div className="w-[40%] p-6 flex flex-col gap-6">
        {/* Recording Info */}
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-4">
            Recording Details
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary">
              <Clock className="w-4 h-4 text-text-tertiary" />
              <div>
                <div className="text-sm text-text-primary">{duration.toFixed(1)}s</div>
                <div className="text-xs text-text-tertiary">Duration</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary">
              <Layers className="w-4 h-4 text-text-tertiary" />
              <div>
                <div className="text-sm text-text-primary">{frameCount} frames</div>
                <div className="text-xs text-text-tertiary">at {recording.settings.frameRate} fps</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary">
              <Image className="w-4 h-4 text-text-tertiary" />
              <div>
                <div className="text-sm text-text-primary">
                  {recording.region.width} × {recording.region.height}
                </div>
                <div className="text-xs text-text-tertiary">Dimensions</div>
              </div>
            </div>
            {exportedBlob && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary">
                <Download className="w-4 h-4 text-text-tertiary" />
                <div>
                  <div className="text-sm text-text-primary">
                    {formatFileSize(exportedBlob.size)}
                  </div>
                  <div className="text-xs text-text-tertiary">File size</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex-1" />
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white transition-all",
              "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500",
              "shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Download className="w-5 h-5" />
            <span>{isExporting ? "Processing..." : "Save GIF"}</span>
          </button>

          <button
            onClick={handleCopyToClipboard}
            disabled={isExporting}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium transition-all",
              "bg-bg-secondary hover:bg-bg-hover text-text-primary border border-border",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Copy className="w-4 h-4" />
            <span>Copy to Clipboard</span>
          </button>

          <button
            onClick={onNewRecording}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium transition-all",
              "bg-bg-secondary hover:bg-bg-hover text-text-primary border border-border"
            )}
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Recording</span>
          </button>
        </div>
      </div>
    </div>
  );
}
