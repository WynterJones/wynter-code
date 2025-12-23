import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X, Pipette, Copy, Check, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useColorPickerStore } from "@/stores/colorPickerStore";
import {
  rgbToHsl,
  hslToRgb,
  rgbToHex,
  formatColor,
} from "@/lib/colorUtils";
import type { ColorValue, ColorFormat, ColorResult } from "@/types/color";

const COLOR_FORMATS: { id: ColorFormat; label: string }[] = [
  { id: "hex", label: "HEX" },
  { id: "rgb", label: "RGB" },
  { id: "rgba", label: "RGBA" },
  { id: "hsl", label: "HSL" },
  { id: "hsla", label: "HSLA" },
];

export function ColorPickerWindow() {
  const {
    currentColor,
    selectedFormat,
    setCurrentColor,
    setSelectedFormat,
  } = useColorPickerStore();

  const [copied, setCopied] = useState(false);
  const [hsl, setHsl] = useState({ h: 0, s: 0.5, l: 0.5 });
  const [alpha, setAlpha] = useState(1);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Check for screen recording permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const granted = await invoke<boolean>("check_screen_recording_permission");
        setHasPermission(granted);
      } catch (err) {
        console.error("Failed to check permission:", err);
        setHasPermission(false);
      }
    };
    checkPermission();
  }, []);

  // Save window position when moved
  useEffect(() => {
    const window = getCurrentWindow();
    const unlisten = window.onMoved(async ({ payload }) => {
      await invoke("save_color_picker_position", { x: payload.x, y: payload.y });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Handle request permission
  const handleRequestPermission = async () => {
    try {
      await invoke("request_screen_recording_permission");
      // Re-check after a delay (user needs to grant in System Preferences)
      setTimeout(async () => {
        const granted = await invoke<boolean>("check_screen_recording_permission");
        setHasPermission(granted);
      }, 1000);
    } catch (err) {
      console.error("Failed to request permission:", err);
    }
  };

  // Listen for color-picked events from Rust
  useEffect(() => {
    const unlisten = listen<ColorResult>("color-picked", (event) => {
      const color: ColorValue = {
        r: event.payload.r,
        g: event.payload.g,
        b: event.payload.b,
        a: event.payload.a,
      };
      setCurrentColor(color);

      // Update HSL sliders
      const newHsl = rgbToHsl(color.r, color.g, color.b);
      setHsl(newHsl);
      setAlpha(color.a);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setCurrentColor]);

  // Update color when HSL sliders change
  useEffect(() => {
    if (currentColor) {
      const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
      const newColor: ColorValue = { ...rgb, a: alpha };
      if (
        newColor.r !== currentColor.r ||
        newColor.g !== currentColor.g ||
        newColor.b !== currentColor.b ||
        newColor.a !== currentColor.a
      ) {
        setCurrentColor(newColor);
      }
    }
  }, [hsl, alpha]);

  // Handle close
  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.close();
  };

  // Handle pick new color
  const handlePickColor = async () => {
    try {
      // Minimize/hide window first
      const window = getCurrentWindow();
      await window.hide();

      // Small delay to ensure window is hidden
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Pick color
      const result = await invoke<ColorResult>("pick_screen_color");
      const color: ColorValue = {
        r: result.r,
        g: result.g,
        b: result.b,
        a: result.a,
      };

      setCurrentColor(color);

      // Update HSL sliders
      const newHsl = rgbToHsl(color.r, color.g, color.b);
      setHsl(newHsl);
      setAlpha(color.a);

      // Show window again
      await window.show();
    } catch (err) {
      console.error("Failed to pick color:", err);
      const window = getCurrentWindow();
      await window.show();
    }
  };

  // Handle copy
  const handleCopy = async () => {
    if (!currentColor) return;
    const text = formatColor(currentColor, selectedFormat);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "c" && currentColor) {
        handleCopy();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentColor, selectedFormat]);

  const displayColor = currentColor || { r: 128, g: 128, b: 128, a: 1 };

  // Permission denied screen
  if (hasPermission === false) {
    return (
      <div className="w-full h-full bg-bg-primary overflow-hidden flex flex-col">
        {/* Window Header - Draggable */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-3 py-2 bg-bg-secondary border-b border-border"
        >
          <button
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-bg-hover text-text-secondary hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-xs text-text-secondary font-medium">Color Picker</span>
          <div className="w-7" />
        </div>

        {/* Permission Request Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Shield className="w-12 h-12 text-accent mb-4" />
          <h3 className="text-sm font-medium text-text-primary mb-2">
            Screen Recording Permission Required
          </h3>
          <p className="text-xs text-text-secondary mb-4">
            To pick colors from your screen, this app needs Screen Recording permission in System Settings.
          </p>
          <button
            onClick={handleRequestPermission}
            className="btn-primary !text-xs"
          >
            Open System Settings
          </button>
          <button
            onClick={async () => {
              const granted = await invoke<boolean>("check_screen_recording_permission");
              setHasPermission(granted);
            }}
            className="mt-2 text-xs text-text-secondary hover:text-accent transition-colors"
          >
            I've granted permission
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-bg-primary overflow-hidden flex flex-col">
      {/* Window Header - Draggable */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-3 py-2 bg-bg-secondary border-b border-border"
      >
        <button
          onClick={handleClose}
          className="p-1 rounded-md hover:bg-bg-hover text-text-secondary hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <span className="text-xs text-text-secondary font-medium">Color Picker</span>

        <button
          onClick={handlePickColor}
          className="p-1.5 rounded-md hover:bg-bg-hover text-text-secondary hover:text-accent transition-colors"
          title="Pick new color"
        >
          <Pipette className="w-4 h-4" />
        </button>
      </div>

      {/* Color Preview */}
      <div
        className="h-32 w-full"
        style={{ backgroundColor: `rgba(${displayColor.r}, ${displayColor.g}, ${displayColor.b}, ${displayColor.a})` }}
      />

      {/* Color Value & Format */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold truncate flex-1 text-white">
          {formatColor(displayColor, selectedFormat)}
        </span>

        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as ColorFormat)}
            className="bg-bg-secondary border border-border rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
          >
            {COLOR_FORMATS.map((fmt) => (
              <option key={fmt.id} value={fmt.id}>
                {fmt.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleCopy}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              copied
                ? "bg-green-500/20 text-green-400"
                : "hover:bg-bg-hover text-text-secondary hover:text-accent"
            )}
            title="Copy color"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* HSL Sliders */}
      <div className="px-4 py-3 space-y-3 border-b border-border">
        {/* Hue */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary w-4">H</span>
          <div className="flex-1 relative h-4">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
              }}
            />
            <input
              type="range"
              min={0}
              max={360}
              value={hsl.h}
              onChange={(e) => setHsl({ ...hsl, h: Number(e.target.value) })}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-300 shadow pointer-events-none"
              style={{ left: `calc(${(hsl.h / 360) * 100}% - 8px)` }}
            />
          </div>
          <span className="text-xs text-text-secondary w-10 text-right font-mono">
            {hsl.h.toFixed(0)}
          </span>
        </div>

        {/* Saturation */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary w-4">S</span>
          <div className="flex-1 relative h-4">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(to right, hsl(${hsl.h}, 0%, ${hsl.l * 100}%), hsl(${hsl.h}, 100%, ${hsl.l * 100}%))`,
              }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={hsl.s * 100}
              onChange={(e) => setHsl({ ...hsl, s: Number(e.target.value) / 100 })}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-300 shadow pointer-events-none"
              style={{ left: `calc(${hsl.s * 100}% - 8px)` }}
            />
          </div>
          <span className="text-xs text-text-secondary w-10 text-right font-mono">
            {(hsl.s * 100).toFixed(0)}%
          </span>
        </div>

        {/* Lightness */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary w-4">L</span>
          <div className="flex-1 relative h-4">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(to right, hsl(${hsl.h}, ${hsl.s * 100}%, 0%), hsl(${hsl.h}, ${hsl.s * 100}%, 50%), hsl(${hsl.h}, ${hsl.s * 100}%, 100%))`,
              }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={hsl.l * 100}
              onChange={(e) => setHsl({ ...hsl, l: Number(e.target.value) / 100 })}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-300 shadow pointer-events-none"
              style={{ left: `calc(${hsl.l * 100}% - 8px)` }}
            />
          </div>
          <span className="text-xs text-text-secondary w-10 text-right font-mono">
            {(hsl.l * 100).toFixed(0)}%
          </span>
        </div>

        {/* Alpha */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary w-4">A</span>
          <div className="flex-1 relative h-4">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #ccc 25%, transparent 25%),
                  linear-gradient(-45deg, #ccc 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #ccc 75%),
                  linear-gradient(-45deg, transparent 75%, #ccc 75%)
                `,
                backgroundSize: "8px 8px",
                backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(to right, transparent, rgb(${displayColor.r}, ${displayColor.g}, ${displayColor.b}))`,
              }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={alpha * 100}
              onChange={(e) => setAlpha(Number(e.target.value) / 100)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-300 shadow pointer-events-none"
              style={{ left: `calc(${alpha * 100}% - 8px)` }}
            />
          </div>
          <span className="text-xs text-text-secondary w-10 text-right font-mono">
            {alpha.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Color Shades */}
      <div className="flex-1 px-4 py-3 overflow-y-auto">
        <span className="text-xs text-text-secondary font-medium mb-2 block">Shades</span>
        <div className="grid grid-cols-7 gap-1">
          {/* Generate 7 shades from dark to light */}
          {[0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9].map((lightness, i) => {
            const shadeRgb = hslToRgb(hsl.h, hsl.s, lightness);
            const shadeHex = rgbToHex(shadeRgb.r, shadeRgb.g, shadeRgb.b);
            return (
              <button
                key={i}
                onClick={() => {
                  setHsl({ ...hsl, l: lightness });
                  setCurrentColor({ ...shadeRgb, a: alpha });
                }}
                className={cn(
                  "w-full aspect-square rounded-md border transition-colors",
                  Math.abs(hsl.l - lightness) < 0.05
                    ? "border-accent ring-1 ring-accent"
                    : "border-border hover:border-accent"
                )}
                style={{ backgroundColor: `rgb(${shadeRgb.r}, ${shadeRgb.g}, ${shadeRgb.b})` }}
                title={`#${shadeHex}`}
              />
            );
          })}
        </div>

        <span className="text-xs text-text-secondary font-medium mt-3 mb-2 block">Tints</span>
        <div className="grid grid-cols-7 gap-1">
          {/* Generate 7 saturation variations */}
          {[0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 1.0].map((saturation, i) => {
            const tintRgb = hslToRgb(hsl.h, saturation, hsl.l);
            const tintHex = rgbToHex(tintRgb.r, tintRgb.g, tintRgb.b);
            return (
              <button
                key={i}
                onClick={() => {
                  setHsl({ ...hsl, s: saturation });
                  setCurrentColor({ ...tintRgb, a: alpha });
                }}
                className={cn(
                  "w-full aspect-square rounded-md border transition-colors",
                  Math.abs(hsl.s - saturation) < 0.05
                    ? "border-accent ring-1 ring-accent"
                    : "border-border hover:border-accent"
                )}
                style={{ backgroundColor: `rgb(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b})` }}
                title={`#${tintHex}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
