import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useMeditationStore } from "@/stores/meditationStore";
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
  } = useMeditationStore();

  const track = tracks[currentTrack] || tracks[0];

  if (!track) return null;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4 min-w-[220px]">

      {/* Track name */}
      <div className="text-center mb-3">
        <span className="text-xs text-white/40">Now Playing</span>
        <div className="text-sm font-medium text-white/80">{track.name}</div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={prevTrack}
          className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </button>

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

        <button
          onClick={nextTrack}
          className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>
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
