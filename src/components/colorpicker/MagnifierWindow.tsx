import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MagnifierOverlay } from "./MagnifierOverlay";
import { useColorPickerStore } from "@/stores/colorPickerStore";
import { formatColor } from "@/lib/colorUtils";
import type { MagnifierData, ColorValue } from "@/types/color";

export function MagnifierWindow() {
  const [data, setData] = useState<MagnifierData | null>(null);
  const [isCapturing, setIsCapturing] = useState(true);
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  const {
    autoCopyOnPick,
    defaultFormat,
    openPickerAfterPick,
    addRecentColor,
  } = useColorPickerStore();

  // Track Shift key for zoom toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsZoomedIn(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsZoomedIn(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Handle picking a color
  const handlePickColor = useCallback(async () => {
    if (!data) return;

    setIsCapturing(false);

    const pickedColor = data.centerColor;

    // Convert to ColorValue for the store
    const colorValue: ColorValue = {
      r: pickedColor.r,
      g: pickedColor.g,
      b: pickedColor.b,
      a: pickedColor.a,
    };

    // Add to recent colors
    addRecentColor(colorValue);

    // Auto copy to clipboard if enabled
    if (autoCopyOnPick) {
      try {
        const text = formatColor(colorValue, defaultFormat);
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }
    }

    try {
      await invoke("stop_color_picking_mode", {
        pickedColor: openPickerAfterPick ? pickedColor : null,
      });
    } catch (err) {
      console.error("Failed to stop picking mode:", err);
    }
  }, [data, autoCopyOnPick, defaultFormat, openPickerAfterPick, addRecentColor]);

  // Handle canceling
  const handleCancel = useCallback(async () => {
    setIsCapturing(false);

    try {
      await invoke("stop_color_picking_mode", { pickedColor: null });
    } catch (err) {
      console.error("Failed to stop picking mode:", err);
    }
  }, []);

  // Capture loop - Rust handles position updates directly for better performance
  useEffect(() => {
    if (!isCapturing) return;

    let running = true;

    const captureLoop = async () => {
      if (!running) return;

      try {
        // Rust command handles both capture AND window positioning
        // Pass zoom state - Shift key enables zoomed-in (focus) mode
        const result = await invoke<MagnifierData>("capture_magnifier_region", {
          zoomIn: isZoomedIn,
        });
        if (running) {
          setData(result);
        }
      } catch (err) {
        console.error("Capture error:", err);
      }

      if (running) {
        // Use setTimeout for more consistent timing than RAF
        setTimeout(captureLoop, 16); // ~60fps
      }
    };

    captureLoop();

    return () => {
      running = false;
    };
  }, [isCapturing, isZoomedIn]);

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
      } else if (e.key === " " || e.key === "Enter") {
        // Space or Enter to pick color
        e.preventDefault();
        handlePickColor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCancel, handlePickColor]);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center select-none"
      onClick={handlePickColor}
      onContextMenu={(e) => {
        e.preventDefault();
        handleCancel();
      }}
      style={{
        cursor: "crosshair",
        backgroundColor: "transparent",
      }}
    >
      <MagnifierOverlay data={data} isZoomedIn={isZoomedIn} />
      <div
        className="text-[10px] text-white mt-1 px-2 py-0.5 rounded"
        style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      >
        Click to pick
      </div>
    </div>
  );
}
