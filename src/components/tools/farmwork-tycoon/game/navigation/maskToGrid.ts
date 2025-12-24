import type { Grid } from "../../types";

export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function maskToGrid(
  maskUrl: string,
  cellSize = 16,
  threshold = 200
): Promise<Grid> {
  const img = await loadImage(maskUrl);
  const w = img.width;
  const h = img.height;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    throw new Error("Could not get 2D context");
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const cols = Math.ceil(w / cellSize);
  const rows = Math.ceil(h / cellSize);

  const cells: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  );

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      let brightSum = 0;
      let count = 0;

      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const px = Math.min(
            w - 1,
            Math.floor((gx + (sx + 0.5) / 3) * cellSize)
          );
          const py = Math.min(
            h - 1,
            Math.floor((gy + (sy + 0.5) / 3) * cellSize)
          );
          const i = (py * w + px) * 4;

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a < 10) continue;

          const brightness = (r + g + b) / 3;
          brightSum += brightness;
          count++;
        }
      }

      const avg = count ? brightSum / count : 0;
      cells[gy][gx] = avg >= threshold;
    }
  }

  return {
    width: w,
    height: h,
    cols,
    rows,
    cellSize,
    cells,
    isWalkable(x: number, y: number): boolean {
      if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
      return cells[y][x];
    },
  };
}
