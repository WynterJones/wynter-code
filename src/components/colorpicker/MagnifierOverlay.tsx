import { useRef, useEffect } from "react";
import type { MagnifierData } from "@/types/color";

interface MagnifierOverlayProps {
  data: MagnifierData | null;
}

export function MagnifierOverlay({ data }: MagnifierOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { pixels, width, height } = data;
    const canvasSize = 100; // 100px diameter
    const cellSize = canvasSize / width; // Size of each zoomed pixel

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

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
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

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      centerX * cellSize + 1,
      centerY * cellSize + 1,
      cellSize - 2,
      cellSize - 2
    );
  }, [data]);

  const centerColor = data?.centerColor;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Circular magnifier with canvas */}
      <div
        className="relative rounded-full overflow-hidden border-2 border-white/80"
        style={{
          width: 100,
          height: 100,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={100}
          height={100}
          className="w-full h-full"
        />
      </div>

      {/* Color value display */}
      {centerColor && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div
            className="w-4 h-4 rounded-sm border border-white/30"
            style={{
              backgroundColor: `rgb(${centerColor.r}, ${centerColor.g}, ${centerColor.b})`,
            }}
          />
          <span className="font-mono text-xs font-medium text-white">
            #{centerColor.hex}
          </span>
        </div>
      )}
    </div>
  );
}
