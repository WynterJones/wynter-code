import type {
  WebcamSettings,
  WebcamDevice,
  AspectRatio,
  BorderEffect,
} from "../types";
import { BORDER_EFFECTS } from "../types";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Upload, Trash2, AlertTriangle, Settings, ShieldCheck, ShieldX } from "lucide-react";
import type { CameraPermissionStatus } from "../hooks/useCameraPermission";

interface CameraTabProps {
  devices: WebcamDevice[];
  settings: WebcamSettings;
  onSettingsChange: (settings: Partial<WebcamSettings>) => void;
  onDeviceSelect: (deviceId: string) => void;
  isStreaming: boolean;
  onStart: () => void;
  onStop: () => void;
  permissionStatus: CameraPermissionStatus;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
  isRequestingPermission: boolean;
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
  permissionStatus,
  onRequestPermission,
  onOpenSettings,
  isRequestingPermission,
}: CameraTabProps) {
  const needsPermission = permissionStatus === "NotDetermined" || permissionStatus === "Denied";
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
        {needsPermission && (
          <div className={`rounded-lg p-3 ${permissionStatus === "Denied" ? "bg-red-500/10 border border-red-500/30" : "bg-yellow-500/10 border border-yellow-500/30"}`}>
            <div className="flex items-start gap-2">
              {permissionStatus === "Denied" ? (
                <ShieldX size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm text-text-primary font-medium">
                  {permissionStatus === "Denied" ? "Camera Access Denied" : "Camera Permission Required"}
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  {permissionStatus === "Denied"
                    ? "Camera access was denied. Open System Settings to grant permission."
                    : "Grant camera permission to use the webcam feature."}
                </p>
                <div className="flex gap-2 mt-2">
                  {permissionStatus === "NotDetermined" && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={onRequestPermission}
                      disabled={isRequestingPermission}
                      className="text-xs"
                    >
                      {isRequestingPermission ? "Requesting..." : "Grant Permission"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenSettings}
                    className="text-xs gap-1"
                  >
                    <Settings size={12} />
                    Open Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {permissionStatus === "Authorized" && (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <ShieldCheck size={14} />
            <span>Camera access granted</span>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Camera Controls
          </h3>
          <div className="flex gap-2 mb-3">
            <Button
              size="sm"
              variant={isStreaming ? "outline" : "primary"}
              onClick={onStart}
              disabled={isStreaming || needsPermission}
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
            <Slider
              label="Border Radius"
              value={settings.border.radius}
              min={0}
              max={50}
              unit="%"
              onChange={(value) =>
                onSettingsChange({
                  border: { ...settings.border, radius: value },
                })
              }
            />

            <Slider
              label="Border Width"
              value={settings.border.width}
              min={0}
              max={20}
              unit="px"
              onChange={(value) =>
                onSettingsChange({
                  border: { ...settings.border, width: value },
                })
              }
            />

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
            <Toggle
              label="Enable Shadow"
              checked={settings.shadow.enabled}
              onChange={(checked) =>
                onSettingsChange({
                  shadow: { ...settings.shadow, enabled: checked },
                })
              }
            />
          </div>

          {settings.shadow.enabled && (
            <div className="space-y-3">
              <Slider
                label="Blur"
                value={settings.shadow.blur}
                min={0}
                max={50}
                unit="px"
                onChange={(value) =>
                  onSettingsChange({
                    shadow: { ...settings.shadow, blur: value },
                  })
                }
              />

              <Slider
                label="Spread"
                value={settings.shadow.spread}
                min={0}
                max={30}
                unit="px"
                onChange={(value) =>
                  onSettingsChange({
                    shadow: { ...settings.shadow, spread: value },
                  })
                }
              />
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
