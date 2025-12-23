import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PreviewCardProps {
  label: string;
  filename: string;
  size: string;
  imageBlob: Blob | null;
  compact?: boolean;
}

export function PreviewCard({
  label,
  filename,
  size,
  imageBlob,
  compact = false,
}: PreviewCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (imageBlob) {
      const url = URL.createObjectURL(imageBlob);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [imageBlob]);

  return (
    <div
      className={cn(
        "flex flex-col items-center p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50",
        compact && "p-2"
      )}
    >
      {/* Checkered background container for transparency */}
      <div
        className={cn(
          "rounded-md overflow-hidden mb-2 flex items-center justify-center",
          "bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#2a2a2a_0%_50%)] bg-[length:8px_8px]",
          compact ? "w-12 h-12" : "w-16 h-16"
        )}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            className="max-w-full max-h-full object-contain"
            style={{
              imageRendering: parseInt(size) <= 32 ? "pixelated" : "auto",
            }}
          />
        ) : (
          <div className="w-full h-full bg-neutral-700/50 animate-pulse" />
        )}
      </div>

      <span
        className={cn(
          "font-medium text-neutral-200",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        {size}
      </span>
      <span
        className={cn(
          "text-neutral-500 truncate max-w-full",
          compact ? "text-[9px]" : "text-[10px]"
        )}
      >
        {filename}
      </span>
    </div>
  );
}
