import { useRef, useEffect } from "react";
import type { MagnifierData } from "@/types/color";

interface MagnifierOverlayProps {
  data: MagnifierData | null;
  isZoomedIn?: boolean;
}

export function MagnifierOverlay({ data, isZoomedIn = false }: MagnifierOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Circle size depends on zoom mode
  const circleSize = isZoomedIn ? 110 : 150;

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { pixels, width, height } = data;
    const canvasSize = circleSize;
    const cellSize = canvasSize / width; // Size of each zoomed pixel

    // Update canvas size
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw zoomed pixels
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const pixelIndex = (row * width + col) * 4;
        const r = pixels[pixelIndex] || 0;
        const g = pixels[pixelIndex + 1] || 0;
        const b = pixels[pixelIndex + 2] || 0;

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }

    // Draw grid lines (more visible when zoomed in)
    const gridOpacity = isZoomedIn ? 0.3 : 0.15;
    ctx.strokeStyle = `rgba(255, 255, 255, ${gridOpacity})`;
    ctx.lineWidth = 0.5;

    for (let i = 0; i <= width; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvasSize);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvasSize, i * cellSize);
      ctx.stroke();
    }

    // Highlight center pixel
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      centerX * cellSize + 1,
      centerY * cellSize + 1,
      cellSize - 2,
      cellSize - 2
    );
  }, [data, circleSize, isZoomedIn]);

  const centerColor = data?.centerColor;

  // Crosshair opacity - more transparent in zoomed out mode
  const crosshairOpacity = isZoomedIn ? 0.5 : 0.25;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Circular magnifier with canvas */}
      <div
        className="relative rounded-full overflow-hidden"
        style={{
          width: circleSize,
          height: circleSize,
          boxShadow: "0 0 0 2px rgba(255,255,255,0.8), 0 4px 20px rgba(0, 0, 0, 0.5)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={circleSize}
          height={circleSize}
          className="w-full h-full"
          style={{ borderRadius: "50%" }}
        />
        {/* Crosshair overlay - subtle lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(to right, transparent 49.5%, rgba(255,255,255,${crosshairOpacity}) 49.5%, rgba(255,255,255,${crosshairOpacity}) 50.5%, transparent 50.5%),
              linear-gradient(to bottom, transparent 49.5%, rgba(255,255,255,${crosshairOpacity}) 49.5%, rgba(255,255,255,${crosshairOpacity}) 50.5%, transparent 50.5%)
            `,
          }}
        />
      </div>

      {/* Color value display */}
      {centerColor && (
        <div
          className="flex items-center gap-2 px-2 py-1 rounded"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.85)",
          }}
        >
          <div
            className="w-3 h-3 rounded-sm border border-white/40"
            style={{
              backgroundColor: `rgb(${centerColor.r}, ${centerColor.g}, ${centerColor.b})`,
            }}
          />
          <span className="font-mono text-[11px] font-medium text-white">
            #{centerColor.hex}
          </span>
        </div>
      )}
    </div>
  );
}
