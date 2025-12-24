import { useRef, useState, useCallback, useEffect } from "react";
import type { CropArea, AspectRatio } from "./types";
import { ASPECT_RATIO_VALUES } from "./types";

interface CropSelectorProps {
  cropArea: CropArea;
  onCropChange: (crop: CropArea) => void;
  aspectRatio?: AspectRatio;
  disabled?: boolean;
}

type Handle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | "move";

export function CropSelector({
  cropArea,
  onCropChange,
  aspectRatio = "custom",
  disabled = false,
}: CropSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeHandle, setActiveHandle] = useState<Handle | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, crop: cropArea });

  const getAspectRatioValue = () => ASPECT_RATIO_VALUES[aspectRatio];

  const constrainToAspectRatio = useCallback(
    (crop: CropArea, handle: Handle): CropArea => {
      const ar = getAspectRatioValue();
      if (!ar || handle === "move") return crop;

      const containerAr = 16 / 9;
      const targetAr = ar / containerAr;

      let { width, height } = crop;

      if (
        handle === "e" ||
        handle === "w" ||
        handle === "ne" ||
        handle === "se" ||
        handle === "nw" ||
        handle === "sw"
      ) {
        height = width / targetAr;
      } else {
        width = height * targetAr;
      }

      return { ...crop, width, height };
    },
    [aspectRatio]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: Handle) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setActiveHandle(handle);
      setDragStart({ x: e.clientX, y: e.clientY, crop: { ...cropArea } });
    },
    [cropArea, disabled]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!activeHandle || !containerRef.current || disabled) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = (e.clientX - dragStart.x) / rect.width;
      const deltaY = (e.clientY - dragStart.y) / rect.height;

      let newCrop = { ...dragStart.crop };

      if (activeHandle === "move") {
        newCrop.x = Math.max(
          0,
          Math.min(1 - newCrop.width, dragStart.crop.x + deltaX)
        );
        newCrop.y = Math.max(
          0,
          Math.min(1 - newCrop.height, dragStart.crop.y + deltaY)
        );
      } else {
        switch (activeHandle) {
          case "nw":
            newCrop.x = Math.max(0, dragStart.crop.x + deltaX);
            newCrop.y = Math.max(0, dragStart.crop.y + deltaY);
            newCrop.width = Math.max(
              0.1,
              dragStart.crop.width - deltaX
            );
            newCrop.height = Math.max(
              0.1,
              dragStart.crop.height - deltaY
            );
            break;
          case "ne":
            newCrop.y = Math.max(0, dragStart.crop.y + deltaY);
            newCrop.width = Math.max(
              0.1,
              Math.min(1 - newCrop.x, dragStart.crop.width + deltaX)
            );
            newCrop.height = Math.max(
              0.1,
              dragStart.crop.height - deltaY
            );
            break;
          case "sw":
            newCrop.x = Math.max(0, dragStart.crop.x + deltaX);
            newCrop.width = Math.max(
              0.1,
              dragStart.crop.width - deltaX
            );
            newCrop.height = Math.max(
              0.1,
              Math.min(1 - newCrop.y, dragStart.crop.height + deltaY)
            );
            break;
          case "se":
            newCrop.width = Math.max(
              0.1,
              Math.min(1 - newCrop.x, dragStart.crop.width + deltaX)
            );
            newCrop.height = Math.max(
              0.1,
              Math.min(1 - newCrop.y, dragStart.crop.height + deltaY)
            );
            break;
          case "n":
            newCrop.y = Math.max(0, dragStart.crop.y + deltaY);
            newCrop.height = Math.max(
              0.1,
              dragStart.crop.height - deltaY
            );
            break;
          case "s":
            newCrop.height = Math.max(
              0.1,
              Math.min(1 - newCrop.y, dragStart.crop.height + deltaY)
            );
            break;
          case "e":
            newCrop.width = Math.max(
              0.1,
              Math.min(1 - newCrop.x, dragStart.crop.width + deltaX)
            );
            break;
          case "w":
            newCrop.x = Math.max(0, dragStart.crop.x + deltaX);
            newCrop.width = Math.max(
              0.1,
              dragStart.crop.width - deltaX
            );
            break;
        }

        newCrop = constrainToAspectRatio(newCrop, activeHandle);
      }

      newCrop.x = Math.max(0, Math.min(1 - newCrop.width, newCrop.x));
      newCrop.y = Math.max(0, Math.min(1 - newCrop.height, newCrop.y));
      newCrop.width = Math.min(1, newCrop.width);
      newCrop.height = Math.min(1, newCrop.height);

      onCropChange(newCrop);
    },
    [activeHandle, dragStart, onCropChange, constrainToAspectRatio, disabled]
  );

  const handleMouseUp = useCallback(() => {
    setActiveHandle(null);
  }, []);

  useEffect(() => {
    if (activeHandle) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [activeHandle, handleMouseMove, handleMouseUp]);

  const cropStyle = {
    left: `${cropArea.x * 100}%`,
    top: `${cropArea.y * 100}%`,
    width: `${cropArea.width * 100}%`,
    height: `${cropArea.height * 100}%`,
  };

  const handleClasses =
    "absolute w-3 h-3 bg-purple-500 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 hover:bg-purple-400 transition-colors";

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div
        style={cropStyle}
        className="absolute border-2 border-dashed border-white/80 bg-transparent cursor-move"
        onMouseDown={(e) => handleMouseDown(e, "move")}
      >
        <div
          className="absolute inset-0 bg-transparent"
        />

        <div
          className={`${handleClasses} -top-0 -left-0 cursor-nw-resize`}
          onMouseDown={(e) => handleMouseDown(e, "nw")}
        />
        <div
          className={`${handleClasses} -top-0 left-1/2 cursor-n-resize`}
          onMouseDown={(e) => handleMouseDown(e, "n")}
        />
        <div
          className={`${handleClasses} -top-0 -right-0 left-auto cursor-ne-resize`}
          style={{ transform: "translate(50%, -50%)" }}
          onMouseDown={(e) => handleMouseDown(e, "ne")}
        />
        <div
          className={`${handleClasses} top-1/2 -right-0 left-auto cursor-e-resize`}
          style={{ transform: "translate(50%, -50%)" }}
          onMouseDown={(e) => handleMouseDown(e, "e")}
        />
        <div
          className={`${handleClasses} -bottom-0 -right-0 top-auto left-auto cursor-se-resize`}
          style={{ transform: "translate(50%, 50%)" }}
          onMouseDown={(e) => handleMouseDown(e, "se")}
        />
        <div
          className={`${handleClasses} -bottom-0 left-1/2 top-auto cursor-s-resize`}
          style={{ transform: "translate(-50%, 50%)" }}
          onMouseDown={(e) => handleMouseDown(e, "s")}
        />
        <div
          className={`${handleClasses} -bottom-0 -left-0 top-auto cursor-sw-resize`}
          style={{ transform: "translate(-50%, 50%)" }}
          onMouseDown={(e) => handleMouseDown(e, "sw")}
        />
        <div
          className={`${handleClasses} top-1/2 -left-0 cursor-w-resize`}
          onMouseDown={(e) => handleMouseDown(e, "w")}
        />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white/70 text-sm bg-black/50 px-2 py-1 rounded">
            Drag to position
          </span>
        </div>
      </div>
    </div>
  );
}
