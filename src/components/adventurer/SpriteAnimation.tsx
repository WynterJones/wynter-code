/**
 * SpriteAnimation
 *
 * Loops an array of base64 PNG frames at a given fps. Pixel-art is rendered
 * crisp (no smoothing). Used in the creator modal previews and the floating
 * companion window. A single static frame renders without a timer.
 */

import { useEffect, useState } from "react";

interface SpriteAnimationProps {
  frames: string[];
  fps?: number;
  /** Rendered size in px (square). */
  size?: number;
  className?: string;
  alt?: string;
  /** Pause on a specific frame index instead of looping. */
  paused?: boolean;
}

export function SpriteAnimation({
  frames,
  fps = 6,
  size = 64,
  className,
  alt = "",
  paused = false,
}: SpriteAnimationProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Reset to the first frame whenever the clip changes.
    setIndex(0);
  }, [frames]);

  useEffect(() => {
    if (paused || frames.length <= 1 || fps <= 0) return;
    const interval = setInterval(
      () => setIndex((i) => (i + 1) % frames.length),
      1000 / fps
    );
    return () => clearInterval(interval);
  }, [frames, fps, paused]);

  if (frames.length === 0) return null;

  const src = frames[Math.min(index, frames.length - 1)];

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      style={{
        width: size,
        height: size,
        imageRendering: "pixelated",
        objectFit: "contain",
      }}
      className={className}
    />
  );
}
