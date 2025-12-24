import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Pin, Video, Sparkles } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useWebcam } from "./hooks/useWebcam";
import { useWebcamSettings } from "./hooks/useWebcamSettings";
import { CropSelector } from "./CropSelector";
import { CameraTab } from "./controls/CameraTab";
import { DecartTab } from "./controls/DecartTab";
import type { DecartUsage } from "./types";
import "./effects.css";

interface WebcamToolPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = "camera" | "decart";

export function WebcamToolPopup({ isOpen, onClose }: WebcamToolPopupProps) {
  const [activeTab, setActiveTab] = useState<TabId>("camera");
  const [isDecartConnected, setIsDecartConnected] = useState(false);
  const [decartUsage, setDecartUsage] = useState<DecartUsage>({
    sessionStartTime: null,
    creditsUsed: 0,
    costUsd: 0,
  });

  const {
    videoRef,
    devices,
    isStreaming,
    error,
    enumerateDevices,
    startStream,
    stopStream,
  } = useWebcam();

  const {
    settings,
    decartSettings,
    floatingWindow,
    saveSettings,
    saveDecartSettings,
    saveFloatingWindow,
  } = useWebcamSettings();

  useEffect(() => {
    if (isOpen) {
      enumerateDevices().then((devs) => {
        if (devs.length > 0 && !settings.deviceId) {
          startStream(devs[0].deviceId);
          saveSettings({ deviceId: devs[0].deviceId });
        } else if (settings.deviceId) {
          startStream(settings.deviceId);
        }
      });
    }
    return () => {
      if (!isOpen) {
        stopStream();
      }
    };
  }, [isOpen]);

  const handleDeviceSelect = useCallback(
    (deviceId: string) => {
      startStream(deviceId);
      saveSettings({ deviceId });
    },
    [startStream, saveSettings]
  );

  const handlePinToDesktop = useCallback(async () => {
    try {
      await invoke("create_floating_webcam_window", {
        x: floatingWindow.position.x,
        y: floatingWindow.position.y,
        width: floatingWindow.size.width,
        height: floatingWindow.size.height,
      });
      saveFloatingWindow({ isOpen: true });

      if (decartSettings.enabled && isDecartConnected) {
        await invoke("create_cost_popup", {
          x: floatingWindow.position.x + floatingWindow.size.width + 10,
          y: floatingWindow.position.y,
        });
      }

      onClose();
    } catch (err) {
      console.error("Failed to create floating window:", err);
    }
  }, [
    floatingWindow,
    decartSettings.enabled,
    isDecartConnected,
    saveFloatingWindow,
    onClose,
  ]);

  const handleDecartConnect = useCallback(() => {
    setIsDecartConnected(true);
    setDecartUsage({
      sessionStartTime: Date.now(),
      creditsUsed: 0,
      costUsd: 0,
    });
  }, []);

  const handleDecartDisconnect = useCallback(() => {
    setIsDecartConnected(false);
    setDecartUsage({
      sessionStartTime: null,
      creditsUsed: 0,
      costUsd: 0,
    });
  }, []);

  useEffect(() => {
    if (!isDecartConnected || !decartUsage.sessionStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - decartUsage.sessionStartTime!) / 1000
      );
      setDecartUsage((prev) => ({
        ...prev,
        creditsUsed: elapsed,
        costUsd: elapsed * 0.01,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isDecartConnected, decartUsage.sessionStartTime]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const borderStyle = {
    borderRadius: `${settings.border.radius}%`,
    borderWidth: `${settings.border.width}px`,
    borderColor: settings.border.color,
    borderStyle: "solid" as const,
  };

  const shadowStyle = settings.shadow.enabled
    ? {
        boxShadow: `${settings.shadow.offsetX}px ${settings.shadow.offsetY}px ${settings.shadow.blur}px ${settings.shadow.spread}px ${settings.shadow.color}`,
      }
    : {};

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-bg-primary border border-border rounded-xl w-[900px] max-h-[700px] flex flex-col overflow-hidden shadow-2xl">
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab"
        >
          <div className="flex items-center gap-3">
            <Video size={18} className="text-accent" />
            <span className="font-medium text-text-primary">
              Floating Webcam
            </span>
          </div>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[55%] p-4 flex flex-col gap-4 border-r border-border">
            <div
              className={`relative aspect-video bg-black rounded-lg overflow-hidden webcam-border-effect ${settings.border.effect !== "none" ? `border-effect-${settings.border.effect}` : ""}`}
              style={{
                ...borderStyle,
                ...shadowStyle,
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{
                  borderRadius: `${Math.max(0, settings.border.radius - 2)}%`,
                  clipPath: settings.svgMaskUrl
                    ? `url(${settings.svgMaskUrl})`
                    : undefined,
                }}
              />
              {settings.border.effect === "sparkle" && (
                <div className="sparkle-container">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="sparkle-particle"
                    />
                  ))}
                </div>
              )}
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center text-text-tertiary">
                  {error || "No camera selected"}
                </div>
              )}
            </div>

            <div className="flex-1 bg-bg-secondary rounded-lg overflow-hidden relative min-h-[200px]">
              {isStreaming ? (
                <div className="absolute inset-0">
                  <video
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover opacity-50"
                    ref={(el) => {
                      if (el && videoRef.current) {
                        el.srcObject = videoRef.current.srcObject;
                      }
                    }}
                  />
                  <CropSelector
                    cropArea={settings.cropArea}
                    onCropChange={(crop) => saveSettings({ cropArea: crop })}
                    aspectRatio={settings.aspectRatio}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-text-tertiary text-sm">
                  Start camera to select crop area
                </div>
              )}
            </div>

            <button
              onClick={handlePinToDesktop}
              disabled={!isStreaming}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
            >
              <Pin size={18} />
              Pin to Desktop
            </button>
          </div>

          <div className="w-[45%] flex flex-col">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("camera")}
                className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors ${
                  activeTab === "camera"
                    ? "border-b-2 border-accent text-text-primary bg-bg-secondary"
                    : "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/50"
                }`}
              >
                <Video size={16} />
                Camera
              </button>
              <button
                onClick={() => setActiveTab("decart")}
                className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors ${
                  activeTab === "decart"
                    ? "border-b-2 border-accent text-text-primary bg-bg-secondary"
                    : "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/50"
                }`}
              >
                <Sparkles size={16} />
                Decart AI
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === "camera" && (
                <CameraTab
                  devices={devices}
                  settings={settings}
                  onSettingsChange={saveSettings}
                  onDeviceSelect={handleDeviceSelect}
                  isStreaming={isStreaming}
                  onStart={() => {
                    if (settings.deviceId) {
                      startStream(settings.deviceId);
                    } else if (devices.length > 0) {
                      startStream(devices[0].deviceId);
                      saveSettings({ deviceId: devices[0].deviceId });
                    }
                  }}
                  onStop={stopStream}
                />
              )}
              {activeTab === "decart" && (
                <DecartTab
                  settings={decartSettings}
                  onSettingsChange={saveDecartSettings}
                  isConnected={isDecartConnected}
                  usage={decartUsage}
                  onConnect={handleDecartConnect}
                  onDisconnect={handleDecartDisconnect}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
