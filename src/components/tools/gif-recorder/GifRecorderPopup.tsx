import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface GifRecorderPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GifRecorderPopup({ isOpen, onClose }: GifRecorderPopupProps) {
  useEffect(() => {
    if (isOpen) {
      invoke("open_gif_region_selector_window").then(() => {
        onClose();
      }).catch((err) => {
        console.error("Failed to open region selector:", err);
      });
    }
  }, [isOpen, onClose]);

  return null;

  const handleStartRecording = async () => {
    if (!region) return;
    setStep("recording");
    await startRecording(region, settings);
    onClose();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleExport = async (copyToClipboard = false) => {
    if (!currentRecording) return;

    setExporting(true);
    try {
      const blob = await exportGif(trimStart, trimEnd);

      if (copyToClipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/gif": blob,
          }),
        ]);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recording-${Date.now()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (step === "select") {
    return (
      <>
        <div className="fixed inset-0 z-[9997] bg-black/80 flex items-center justify-center">
          <div className="bg-bg-primary border border-border rounded-xl w-[600px] max-h-[500px] flex flex-col overflow-hidden shadow-2xl">
            <div
              data-tauri-drag-region
              className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-text-primary">GIF Screen Section Recorder</span>
              </div>
              <Tooltip content="Close (Esc)" side="bottom">
                <IconButton size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                <p className="text-text-secondary text-sm">
                  Select a region of your screen to record as an animated GIF. A fullscreen window will open for you to select the area.
                </p>
                <button
                  onClick={handleOpenRegionSelector}
                  className="w-full px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
                >
                  {region ? "Change Region Selection" : "Select Region"}
                </button>
                {region && (
                  <div className="pt-4 space-y-3">
                    <div className="bg-bg-secondary rounded-lg p-3">
                      <p className="text-sm text-text-primary font-medium mb-1">Selected Region:</p>
                      <p className="text-xs text-text-secondary">
                        Size: {Math.round(region.width)} × {Math.round(region.height)}px
                      </p>
                      <p className="text-xs text-text-secondary">
                        Position: ({Math.round(region.x)}, {Math.round(region.y)})
                      </p>
                    </div>
                    <button
                      onClick={() => setStep("settings")}
                      className="w-full px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
                    >
                      Continue to Settings
                    </button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </>
    );
  }

  if (step === "settings") {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="bg-bg-primary border border-border rounded-xl w-[600px] max-h-[600px] flex flex-col overflow-hidden shadow-2xl">
          <div
            data-tauri-drag-region
            className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-text-primary">Recording Settings</span>
            </div>
            <Tooltip content="Close (Esc)" side="bottom">
              <IconButton size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Frame Rate (fps)
                </label>
                <select
                  value={settings.frameRate}
                  onChange={(e) =>
                    setSettings({ ...settings, frameRate: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary"
                >
                  {FRAME_RATE_OPTIONS.map((fps) => (
                    <option key={fps} value={fps}>
                      {fps} fps
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Quality
                </label>
                <select
                  value={settings.quality}
                  onChange={(e) =>
                    setSettings({ ...settings, quality: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary"
                >
                  {QUALITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showCursor}
                    onChange={(e) =>
                      setSettings({ ...settings, showCursor: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm text-text-primary">Show cursor</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showClicks}
                    onChange={(e) =>
                      setSettings({ ...settings, showClicks: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm text-text-primary">Show click indicators</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.loop}
                    onChange={(e) =>
                      setSettings({ ...settings, loop: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm text-text-primary">Loop animation</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep("select")}
                  className="flex-1 px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary hover:bg-bg-hover transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStartRecording}
                  className="flex-1 px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Recording
                </button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  if (step === "preview" && currentRecording) {
    const duration = currentRecording.duration / 1000;
    const maxTrim = duration * 1000;

    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="bg-bg-primary border border-border rounded-xl w-[800px] max-h-[700px] flex flex-col overflow-hidden shadow-2xl">
          <div
            data-tauri-drag-region
            className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-text-primary">GIF Preview</span>
            </div>
            <Tooltip content="Close (Esc)" side="bottom">
              <IconButton size="sm" onClick={() => {
                setStep("select");
                clearRecording();
              }}>
                <X className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {error && (
                <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="bg-bg-secondary rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-4">
                  Duration: {duration.toFixed(1)}s | Frames: {currentRecording.frames.length} | Size:{" "}
                  {currentRecording.region.width} × {currentRecording.region.height}
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Trim Start: {(trimStart / 1000).toFixed(1)}s
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={maxTrim}
                      value={trimStart}
                      onChange={(e) => setTrimStart(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Trim End: {(trimEnd / 1000).toFixed(1)}s
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={maxTrim}
                      value={trimEnd}
                      onChange={(e) => setTrimEnd(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleExport(false)}
                  disabled={exporting}
                  className="flex-1 px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? "Exporting..." : "Download"}
                </button>
                <button
                  onClick={() => handleExport(true)}
                  disabled={exporting}
                  className="flex-1 px-4 py-2 bg-bg-secondary border border-border text-text-primary rounded-lg font-medium hover:bg-bg-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </button>
              </div>

              <button
                onClick={() => {
                  setStep("select");
                  clearRecording();
                }}
                className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary hover:bg-bg-hover transition-colors"
              >
                Record New GIF
              </button>
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  return null;
}

