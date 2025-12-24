import { useState } from "react";
import { X, Download, FileVideo, FileImage, Check } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Recording, ExportFormat } from "./types";
import { EXPORT_FORMATS } from "./types";
import { cn } from "@/lib/utils";

interface ExportOptionsProps {
  recording: Recording;
  onClose: () => void;
}

export function ExportOptions({ recording, onClose }: ExportOptionsProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>("webm");
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExport = async () => {
    if (!recording.blob) return;

    setIsExporting(true);

    try {
      const format = EXPORT_FORMATS.find((f) => f.id === selectedFormat);
      if (!format) return;

      // For WebM, we can directly download
      // For other formats, we'd need ffmpeg conversion (placeholder for now)
      const url = URL.createObjectURL(recording.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `screen-recording-${Date.now()}${format.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportComplete(true);
      setTimeout(() => {
        setExportComplete(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    if (format.id === "gif") {
      return <FileImage className="w-5 h-5" />;
    }
    return <FileVideo className="w-5 h-5" />;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-bg-primary border border-border rounded-xl w-[400px] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-medium text-text-primary">Export Options</h3>
          <Tooltip content="Close">
            <IconButton size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="text-sm text-text-secondary mb-3 block">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EXPORT_FORMATS.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                    selectedFormat === format.id
                      ? "border-purple-500 bg-purple-500/10 text-purple-400"
                      : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-hover"
                  )}
                >
                  {getFormatIcon(format)}
                  <span className="text-sm font-medium">{format.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format Info */}
          <div className="p-3 rounded-lg bg-bg-secondary text-sm">
            {selectedFormat === "webm" && (
              <p className="text-text-secondary">
                <span className="text-text-primary font-medium">WebM</span> - Best quality, smaller size. 
                Native browser format.
              </p>
            )}
            {selectedFormat === "mp4" && (
              <p className="text-text-secondary">
                <span className="text-text-primary font-medium">MP4</span> - Universal compatibility. 
                Works everywhere.
              </p>
            )}
            {selectedFormat === "gif" && (
              <p className="text-text-secondary">
                <span className="text-text-primary font-medium">GIF</span> - Animated image format. 
                No audio, larger file size.
              </p>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting || exportComplete}
            className={cn(
              "w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold transition-all",
              exportComplete
                ? "bg-green-500 text-white"
                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25",
              (isExporting || exportComplete) && "cursor-not-allowed"
            )}
          >
            {exportComplete ? (
              <>
                <Check className="w-5 h-5" />
                Exported!
              </>
            ) : isExporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Export Recording
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
