import type {
  WebcamSettings,
  WebcamDevice,
  AspectRatio,
  BorderEffect,
} from "../types";
import { BORDER_EFFECTS } from "../types";
import { Button } from "@/components/ui/Button";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Upload, Trash2 } from "lucide-react";

interface CameraTabProps {
  devices: WebcamDevice[];
  settings: WebcamSettings;
  onSettingsChange: (settings: Partial<WebcamSettings>) => void;
  onDeviceSelect: (deviceId: string) => void;
  isStreaming: boolean;
  onStart: () => void;
  onStop: () => void;
}

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "16:9", label: "16:9" },
  { value: "1:1", label: "1:1" },
  { value: "9:16", label: "9:16" },
  { value: "custom", label: "Free" },
];

export function CameraTab({
  devices,
  settings,
  onSettingsChange,
  onDeviceSelect,
  isStreaming,
  onStart,
  onStop,
}: CameraTabProps) {
  const handleSvgMaskUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "image/svg+xml") {
      const url = URL.createObjectURL(file);
      onSettingsChange({ svgMaskUrl: url });
    }
  };

  return (
    <OverlayScrollbarsComponent
      className="h-full"
      options={{ scrollbars: { autoHide: "scroll" } }}
    >
      <div className="space-y-5 p-4">
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Camera Controls
          </h3>
          <div className="flex gap-2 mb-3">
            <Button
              size="sm"
              variant={isStreaming ? "outline" : "primary"}
              onClick={onStart}
              disabled={isStreaming}
              className="flex-1"
            >
              Start
            </Button>
            <Button
              size="sm"
              variant={!isStreaming ? "outline" : "primary"}
              onClick={onStop}
              disabled={!isStreaming}
              className="flex-1"
            >
              Stop
            </Button>
          </div>

          <label className="block text-xs text-text-tertiary mb-1">
            Camera Source
          </label>
          <select
            value={settings.deviceId || ""}
            onChange={(e) => onDeviceSelect(e.target.value)}
            className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">Select camera...</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Aspect Ratio
          </label>
          <div className="flex gap-2">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.value}
                onClick={() => onSettingsChange({ aspectRatio: ar.value })}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  settings.aspectRatio === ar.value
                    ? "bg-accent text-primary-950"
                    : "bg-bg-tertiary text-text-secondary hover:bg-bg-secondary"
                }`}
              >
                {ar.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">
            Styling
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-text-tertiary">
                  Border Radius
                </label>
                <span className="text-xs text-text-tertiary">
                  {settings.border.radius}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={settings.border.radius}
                onChange={(e) =>
                  onSettingsChange({
                    border: { ...settings.border, radius: Number(e.target.value) },
                  })
                }
                className="w-full h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-accent"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-text-tertiary">
                  Border Width
                </label>
                <span className="text-xs text-text-tertiary">
                  {settings.border.width}px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={settings.border.width}
                onChange={(e) =>
                  onSettingsChange({
                    border: { ...settings.border, width: Number(e.target.value) },
                  })
                }
                className="w-full h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-accent"
              />
            </div>

            <div>
              <label className="block text-xs text-text-tertiary mb-1">
                Border Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.border.color}
                  onChange={(e) =>
                    onSettingsChange({
                      border: { ...settings.border, color: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded cursor-pointer border border-border"
                />
                <input
                  type="text"
                  value={settings.border.color}
                  onChange={(e) =>
                    onSettingsChange({
                      border: { ...settings.border, color: e.target.value },
                    })
                  }
                  className="flex-1 bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-tertiary mb-1">
                Border Effect
              </label>
              <select
                value={settings.border.effect}
                onChange={(e) =>
                  onSettingsChange({
                    border: {
                      ...settings.border,
                      effect: e.target.value as BorderEffect,
                    },
                  })
                }
                className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {BORDER_EFFECTS.map((effect) => (
                  <option key={effect.value} value={effect.value}>
                    {effect.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">
            Shadow
          </h3>

          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-text-tertiary">Enable Shadow</label>
            <button
              onClick={() =>
                onSettingsChange({
                  shadow: { ...settings.shadow, enabled: !settings.shadow.enabled },
                })
              }
              className={`relative w-10 h-5 rounded-full transition-colors ${
                settings.shadow.enabled ? "bg-accent" : "bg-bg-tertiary"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.shadow.enabled ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {settings.shadow.enabled && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-text-tertiary">Blur</label>
                  <span className="text-xs text-text-tertiary">
                    {settings.shadow.blur}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={settings.shadow.blur}
                  onChange={(e) =>
                    onSettingsChange({
                      shadow: { ...settings.shadow, blur: Number(e.target.value) },
                    })
                  }
                  className="w-full h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-accent"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-text-tertiary">Spread</label>
                  <span className="text-xs text-text-tertiary">
                    {settings.shadow.spread}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={settings.shadow.spread}
                  onChange={(e) =>
                    onSettingsChange({
                      shadow: { ...settings.shadow, spread: Number(e.target.value) },
                    })
                  }
                  className="w-full h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-accent"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">
            SVG Mask
          </h3>
          <p className="text-xs text-text-tertiary mb-2">
            Upload an SVG file to use as a custom shape mask
          </p>

          {settings.svgMaskUrl ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-secondary truncate">
                Custom mask applied
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSettingsChange({ svgMaskUrl: null })}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-bg-tertiary border border-dashed border-border rounded-md cursor-pointer hover:bg-bg-secondary transition-colors">
              <Upload size={16} className="text-text-tertiary" />
              <span className="text-sm text-text-secondary">Upload SVG</span>
              <input
                type="file"
                accept=".svg"
                onChange={handleSvgMaskUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>
    </OverlayScrollbarsComponent>
  );
}
