import { useEffect, useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X } from "lucide-react";
import { useWebcam } from "./hooks/useWebcam";
import { useWebcamSettings } from "./hooks/useWebcamSettings";
import "./effects.css";

export function FloatingWebcamWindow() {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { videoRef, startStream } = useWebcam();
  const { settings } = useWebcamSettings();

  useEffect(() => {
    if (settings.deviceId) {
      startStream(settings.deviceId);
    }
  }, [settings.deviceId, startStream]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        await handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMouseDown = useCallback(
    async (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".close-button")) return;
      if ((e.target as HTMLElement).closest(".resize-handle")) return;

      setIsDragging(true);
      const window = getCurrentWindow();
      await window.startDragging();
      setIsDragging(false);
    },
    []
  );

  const handleClose = useCallback(async () => {
    await invoke("close_floating_webcam_window");
  }, []);

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

  const cropArea = settings.cropArea;

  const croppedVideoStyle = {
    width: `${100 / cropArea.width}%`,
    height: `${100 / cropArea.height}%`,
    left: `${-(cropArea.x / cropArea.width) * 100}%`,
    top: `${-(cropArea.y / cropArea.height) * 100}%`,
  };

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen bg-transparent cursor-move select-none p-4"
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative w-full h-full overflow-hidden webcam-border-effect ${settings.border.effect !== "none" ? `border-effect-${settings.border.effect}` : ""}`}
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
          className="absolute object-cover"
          style={{
            ...croppedVideoStyle,
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
      </div>

      {isHovered && !isDragging && (
        <button
          onClick={handleClose}
          className="close-button absolute top-6 right-6 w-7 h-7 bg-black/70 hover:bg-red-600 rounded-full flex items-center justify-center transition-all z-10"
        >
          <X size={14} className="text-white" />
        </button>
      )}

      {isHovered && (
        <>
          <div
            className="resize-handle absolute bottom-4 right-4 w-4 h-4 cursor-se-resize z-10"
            style={{
              background:
                "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%)",
            }}
          />
          <div className="resize-handle absolute bottom-4 left-4 w-4 h-4 cursor-sw-resize opacity-0" />
          <div className="resize-handle absolute top-4 right-4 w-4 h-4 cursor-ne-resize opacity-0" />
          <div className="resize-handle absolute top-4 left-4 w-4 h-4 cursor-nw-resize opacity-0" />
        </>
      )}
    </div>
  );
}
