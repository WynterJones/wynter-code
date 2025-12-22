import { useRef, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useMeditationStore } from "@/stores/meditationStore";
import { getRandomTrackIndex } from "./tracks";

/**
 * Persistent audio controller that lives in AppShell.
 * Handles all meditation audio playback so audio continues
 * seamlessly between meditation screen and mini player.
 */
export function MeditationAudioController() {
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    isActive,
    miniPlayerVisible,
    currentTrack,
    isPlaying,
    volume,
    tracks,
    setPlaying,
    setTrack,
  } = useMeditationStore();

  const track = tracks[currentTrack] || tracks[0];

  const audioSrc =
    track?.isCustom && track.path
      ? convertFileSrc(track.path)
      : `/audio/meditation/${track?.file || ""}`;

  // Should audio be active at all?
  const shouldBeActive = isActive || miniPlayerVisible;

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle play/pause
  useEffect(() => {
    if (!audioRef.current || !shouldBeActive) return;

    if (isPlaying) {
      audioRef.current.play().catch(() => setPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, shouldBeActive, setPlaying]);

  // Handle track changes
  useEffect(() => {
    if (!audioRef.current || !shouldBeActive) return;

    audioRef.current.load();
    if (isPlaying) {
      audioRef.current.play().catch(() => setPlaying(false));
    }
  }, [currentTrack, shouldBeActive, isPlaying, setPlaying]);

  // Handle when audio should stop completely
  useEffect(() => {
    if (!shouldBeActive && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [shouldBeActive]);

  // Pick random next track when song ends
  const handleEnded = () => {
    const next = getRandomTrackIndex(tracks.length, currentTrack);
    setTrack(next);
  };

  // Only render audio element when needed
  if (!shouldBeActive || !track) return null;

  return (
    <audio
      ref={audioRef}
      src={audioSrc}
      onPlay={() => setPlaying(true)}
      onPause={() => {
        // Only update state if we're still supposed to be active
        // This prevents race conditions during cleanup
        if (useMeditationStore.getState().isActive ||
            useMeditationStore.getState().miniPlayerVisible) {
          setPlaying(false);
        }
      }}
      onEnded={handleEnded}
      onError={() => setPlaying(false)}
    />
  );
}
