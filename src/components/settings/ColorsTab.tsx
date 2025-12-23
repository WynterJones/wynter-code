import { useState } from "react";
import { Trash2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useColorPickerStore } from "@/stores/colorPickerStore";
import type { SavedColor } from "@/types/color";

const EXPORT_FORMATS: { id: "json" | "css"; label: string }[] = [
  { id: "json", label: "JSON" },
  { id: "css", label: "CSS Variables" },
];

export function ColorsTab() {
  const { recentColors, savedColors, deleteColor, clearRecentColors, clearSavedColors } =
    useColorPickerStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<"recent" | "saved" | null>(null);

  const allColors = [...savedColors, ...recentColors];

  const handleCopyColor = async (color: SavedColor) => {
    const text = `#${color.hex}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(color.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteColor = (id: string) => {
    deleteColor(id);
  };

  const handleClearConfirm = (type: "recent" | "saved") => {
    if (type === "recent") {
      clearRecentColors();
    } else {
      clearSavedColors();
    }
    setShowClearConfirm(null);
  };

  const handleExport = (format: "json" | "css") => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "json") {
      content = JSON.stringify(
        allColors.map((c) => ({
          hex: `#${c.hex}`,
          rgb: `rgb(${c.value.r}, ${c.value.g}, ${c.value.b})`,
          name: c.name || null,
        })),
        null,
        2
      );
      filename = "colors.json";
      mimeType = "application/json";
    } else {
      content = `:root {\n${allColors
        .map((c, i) => `  --color-${i + 1}: #${c.hex};`)
        .join("\n")}\n}`;
      filename = "colors.css";
      mimeType = "text/css";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-text-primary mb-4">Colors</h2>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-text-secondary">
        <span>{recentColors.length} recent</span>
        <span className="text-text-secondary/30">|</span>
        <span>{savedColors.length} saved</span>
      </div>

      {/* Color Grid */}
      {allColors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
          <AlertCircle className="w-8 h-8 mb-3 opacity-50" />
          <p className="text-sm">No colors picked yet</p>
          <p className="text-xs mt-1 opacity-70">
            Use the color picker from the Tools menu or system tray
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-2">
          {allColors.map((color) => (
            <div key={color.id} className="group relative">
              <button
                onClick={() => handleCopyColor(color)}
                className={cn(
                  "w-full aspect-square rounded-lg border-2 transition-all",
                  "hover:scale-105 hover:shadow-lg",
                  copiedId === color.id ? "border-green-500" : "border-transparent hover:border-accent"
                )}
                style={{
                  backgroundColor: `rgba(${color.value.r}, ${color.value.g}, ${color.value.b}, ${color.value.a})`,
                }}
                title={`#${color.hex}\nClick to copy`}
              />

              {/* Copy indicator */}
              {copiedId === color.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <Check className="w-4 h-4 text-green-400" />
                </div>
              )}

              {/* Delete button on hover */}
              <button
                onClick={() => handleDeleteColor(color.id)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-400"
                title="Delete color"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {allColors.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            {/* Export */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-secondary mr-1">Export:</span>
              {EXPORT_FORMATS.map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => handleExport(fmt.id)}
                  className="px-2 py-1 text-xs rounded bg-bg-secondary border border-border text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear buttons */}
          <div className="flex items-center gap-2">
            {showClearConfirm ? (
              <div className="flex items-center gap-2 animate-in fade-in-0 zoom-in-95 duration-150">
                <span className="text-xs text-text-secondary">
                  Clear {showClearConfirm}?
                </span>
                <button
                  onClick={() => handleClearConfirm(showClearConfirm)}
                  className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowClearConfirm(null)}
                  className="px-2 py-1 text-xs rounded bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <>
                {recentColors.length > 0 && (
                  <button
                    onClick={() => setShowClearConfirm("recent")}
                    className="px-2 py-1 text-xs rounded text-text-secondary hover:text-red-400 transition-colors"
                  >
                    Clear Recent
                  </button>
                )}
                {savedColors.length > 0 && (
                  <button
                    onClick={() => setShowClearConfirm("saved")}
                    className="px-2 py-1 text-xs rounded text-text-secondary hover:text-red-400 transition-colors"
                  >
                    Clear Saved
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="p-4 rounded-lg bg-bg-secondary border border-border">
        <h3 className="text-sm font-medium text-text-primary mb-2">How to use</h3>
        <ul className="text-xs text-text-secondary space-y-1">
          <li>- Click the tray icon in the menu bar to pick a color at cursor position</li>
          <li>- Or use Tools → Color Picker from the app header</li>
          <li>- Click any color swatch to copy its hex value</li>
          <li>- Export your palette as JSON or CSS variables</li>
        </ul>
      </div>
    </div>
  );
}
