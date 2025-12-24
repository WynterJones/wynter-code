import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useMeditationStore } from "@/stores/meditationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getNightrideStationBySlug } from "./radioStations";
import { cn } from "@/lib/utils";

export function MeditationAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    tracks,
    nextTrack,
    prevTrack,
    togglePlay,
    setVolume,
    isStream,
    streamMetadata,
  } = useMeditationStore();

  const { audioSourceType, nightrideStation, currentRadioBrowserStation, nextNightrideStation, prevNightrideStation } =
    useSettingsStore();

  // Determine display info based on audio source
  const getDisplayInfo = () => {
    if (audioSourceType === "nightride") {
      const station = getNightrideStationBySlug(nightrideStation);
      return {
        label: "Nightride FM",
        name: station?.name || "Unknown Station",
        subtext:
          streamMetadata?.artist && streamMetadata?.title
            ? `${streamMetadata.artist} - ${streamMetadata.title}`
            : null,
      };
    }

    if (audioSourceType === "radiobrowser" && currentRadioBrowserStation) {
      return {
        label: "Internet Radio",
        name: currentRadioBrowserStation.name,
        subtext: null,
      };
    }

    // Custom tracks
    const track = tracks[currentTrack] || tracks[0];
    return {
      label: "Now Playing",
      name: track?.name || "No Track",
      subtext: null,
    };
  };

  const { label, name, subtext } = getDisplayInfo();

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4 min-w-[220px]">
      {/* Track/Station info */}
      <div className="text-center mb-3">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          {isStream && (
            <Radio className="w-3 h-3 text-green-400 animate-pulse" />
          )}
          <span className="text-xs text-white/40">{label}</span>
        </div>
        <div className="text-sm font-medium text-white/80">{name}</div>
        {subtext && (
          <div className="text-xs text-white/50 mt-0.5 truncate max-w-[200px]">
            {subtext}
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {/* Show station navigation for NightRide FM */}
        {audioSourceType === "nightride" && (
          <button
            onClick={prevNightrideStation}
            className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            title="Previous station"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Show track navigation for custom music */}
        {!isStream && (
          <button
            onClick={prevTrack}
            className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={togglePlay}
          className={cn(
            "p-3 rounded-full transition-colors",
            isPlaying
              ? "bg-accent/80 text-white hover:bg-accent"
              : "bg-white/10 text-white/80 hover:bg-accent/80 hover:text-white"
          )}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {!isStream && (
          <button
            onClick={nextTrack}
            className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        )}

        {/* Show station navigation for NightRide FM */}
        {audioSourceType === "nightride" && (
          <button
            onClick={nextNightrideStation}
            className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            title="Next station"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Volume control */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setVolume(volume === 0 ? 1.0 : 0)}
          className="p-1 text-white/40 hover:text-white/80 transition-colors"
        >
          {volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
        />
      </div>
    </div>
  );
}
