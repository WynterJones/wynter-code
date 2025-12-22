import { useState, useEffect, useCallback } from "react";
import { X, Type } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { IconButton, Tooltip, Input, ScrollArea } from "@/components/ui";

interface FontViewerPopupProps {
  filePath: string;
  onClose: () => void;
}

const SAMPLE_TEXTS = [
  "The quick brown fox jumps over the lazy dog",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789",
  "!@#$%^&*()_+-=[]{}|;':\",./<>?",
];

const FONT_SIZES = [12, 16, 24, 32, 48, 64, 96];

export function FontViewerPopup({ filePath, onClose }: FontViewerPopupProps) {
  const [customText, setCustomText] = useState("");
  const [selectedSize, setSelectedSize] = useState(48);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileName = filePath.split("/").pop() || filePath;
  const fontName = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
  const fontSrc = convertFileSrc(filePath);

  useEffect(() => {
    // Load the font dynamically
    const font = new FontFace(fontName, `url(${fontSrc})`);
    font.load()
      .then((loadedFont) => {
        document.fonts.add(loadedFont);
        setFontLoaded(true);
      })
      .catch(() => {
        setError("Failed to load font");
      });

    return () => {
      // Clean up font on unmount
      document.fonts.forEach((f) => {
        if (f.family === fontName) {
          document.fonts.delete(f);
        }
      });
    };
  }, [fontName, fontSrc]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

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
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-accent" />
            <span className="font-mono text-sm text-text-primary">{fileName}</span>
          </div>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        {error ? (
          <div className="flex-1 flex items-center justify-center text-accent-red">
            {error}
          </div>
        ) : !fontLoaded ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            Loading font...
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
            {/* Size selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-text-secondary">Size:</span>
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    selectedSize === size
                      ? "bg-accent text-white"
                      : "bg-bg-hover text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>

            {/* Custom text input */}
            <div className="space-y-2">
              <label className="text-sm text-text-secondary">Custom text:</label>
              <Input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type your own text to preview..."
                className="w-full"
              />
              {customText && (
                <div
                  className="p-4 bg-bg-hover rounded-lg break-words"
                  style={{ fontFamily: fontName, fontSize: selectedSize }}
                >
                  {customText}
                </div>
              )}
            </div>

            {/* Sample texts */}
            <div className="space-y-6">
              <h3 className="text-sm font-medium text-text-secondary">Sample Text</h3>
              {SAMPLE_TEXTS.map((text, index) => (
                <div key={index} className="space-y-1">
                  <div
                    className="p-4 bg-bg-hover rounded-lg break-words"
                    style={{ fontFamily: fontName, fontSize: selectedSize }}
                  >
                    {text}
                  </div>
                </div>
              ))}
            </div>

            {/* All sizes preview */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text-secondary">All Sizes</h3>
              <div className="space-y-3">
                {FONT_SIZES.map((size) => (
                  <div key={size} className="flex items-baseline gap-4">
                    <span className="text-xs text-text-secondary w-12">{size}px</span>
                    <span style={{ fontFamily: fontName, fontSize: size }}>
                      The quick brown fox
                    </span>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg-secondary text-xs text-text-secondary">
          <span className="font-mono truncate">{filePath}</span>
          {fontLoaded && <span>Font loaded: {fontName}</span>}
        </div>
      </div>
    </div>
  );
}
