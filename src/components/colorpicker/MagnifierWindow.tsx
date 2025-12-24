import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MagnifierOverlay } from "./MagnifierOverlay";
import type { MagnifierData } from "@/types/color";

export function MagnifierWindow() {
  const [data, setData] = useState<MagnifierData | null>(null);
  const [isCapturing, setIsCapturing] = useState(true);
  const animationRef = useRef<number | null>(null);
  const lastCaptureRef = useRef<number>(0);

  // Handle picking a color
  const handlePickColor = useCallback(async () => {
    if (!data) return;

    setIsCapturing(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    try {
      await invoke("stop_color_picking_mode", {
        pickedColor: data.centerColor,
      });
    } catch (err) {
      console.error("Failed to stop picking mode:", err);
    }
  }, [data]);

  // Handle canceling
  const handleCancel = useCallback(async () => {
    setIsCapturing(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    try {
      await invoke("stop_color_picking_mode", { pickedColor: null });
    } catch (err) {
      console.error("Failed to stop picking mode:", err);
    }
  }, []);

  // Capture loop
  useEffect(() => {
    if (!isCapturing) return;

    const captureLoop = async () => {
      const now = performance.now();
      // Throttle to ~30fps
      if (now - lastCaptureRef.current < 33) {
        animationRef.current = requestAnimationFrame(captureLoop);
        return;
      }
      lastCaptureRef.current = now;

      try {
        const result = await invoke<MagnifierData>("capture_magnifier_region");
        setData(result);

        // Update window position to follow cursor
        await invoke("update_magnifier_position", {
          x: result.cursorX,
          y: result.cursorY,
        });
      } catch (err) {
        console.error("Capture error:", err);
      }

      if (isCapturing) {
        animationRef.current = requestAnimationFrame(captureLoop);
      }
    };

    animationRef.current = requestAnimationFrame(captureLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isCapturing]);

  // Global mouse click handler
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // Left click - pick color
        handlePickColor();
      } else if (e.button === 2) {
        // Right click - cancel
        handleCancel();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [handlePickColor, handleCancel]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCancel]);

  return (
    <div
      className="w-full h-full flex items-center justify-center bg-bg-primary rounded-xl overflow-hidden"
      style={{
        cursor: "none",
      }}
    >
      <MagnifierOverlay data={data} />
    </div>
  );
}
