import { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Radio,
} from "lucide-react";
import { useMeditationStore } from "@/stores/meditationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getNightrideStationBySlug } from "./radioStations";
import { cn } from "@/lib/utils";

export function MiniMeditationPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    isActive,
    miniPlayerVisible,
    currentTrack,
    isPlaying,
    tracks,
    nextTrack,
    prevTrack,
    togglePlay,
    closeMiniPlayer,
    isStream,
  } = useMeditationStore();

  const { audioSourceType, nightrideStation, currentRadioBrowserStation } =
    useSettingsStore();

  // Dragging state
  const [position, setPosition] = useState({ x: 24, y: 24 }); // bottom-right offset
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });

  // Get display name based on audio source
  const getDisplayName = () => {
    if (audioSourceType === "nightride") {
      const station = getNightrideStationBySlug(nightrideStation);
      return station?.name || "Nightride FM";
    }
    if (audioSourceType === "radiobrowser" && currentRadioBrowserStation) {
      return currentRadioBrowserStation.name;
    }
    const track = tracks[currentTrack] || tracks[0];
    return track?.name || "No Track";
  };

  const track = tracks[currentTrack] || tracks[0];

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      positionStart.current = { ...position };
      e.preventDefault();
    },
    [position]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = dragStart.current.x - e.clientX;
      const deltaY = dragStart.current.y - e.clientY;

      const newX = Math.max(
        10,
        Math.min(window.innerWidth - 200, positionStart.current.x + deltaX)
      );
      const newY = Math.max(
        10,
        Math.min(window.innerHeight - 80, positionStart.current.y + deltaY)
      );

      setPosition({ x: newX, y: newY });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Only show when not in meditation mode but mini player is visible
  // For streams, we don't need a track - for custom we do
  const hasValidSource =
    isStream || (audioSourceType === "custom" && track !== undefined);
  if (isActive || !miniPlayerVisible || !hasValidSource) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50 flex items-center gap-2 px-3 py-2 rounded-xl",
        "bg-bg-secondary/95 backdrop-blur-md border border-border/50",
        "shadow-xl shadow-black/30",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{
        right: `${position.x}px`,
        bottom: `${position.y}px`,
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Track/Station info */}
      <div className="flex flex-col min-w-[80px] mr-2">
        <span className="text-[10px] text-text-secondary/60 leading-none flex items-center gap-1">
          {isStream && <Radio className="w-2.5 h-2.5 text-green-400" />}
          {isStream ? "Radio" : "Meditation"}
        </span>
        <span className="text-xs text-text-primary truncate">
          {getDisplayName()}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Hide skip buttons for streams */}
        {!isStream && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevTrack();
            }}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="btn-primary !p-2 !rounded-full"
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>

        {!isStream && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextTrack();
            }}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          closeMiniPlayer();
        }}
        className="p-1 rounded-md text-text-secondary/50 hover:text-text-primary hover:bg-bg-hover transition-colors ml-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
