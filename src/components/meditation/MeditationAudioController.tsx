import { useRef, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useMeditationStore } from "@/stores/meditationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useStreamMetadata } from "@/hooks/useStreamMetadata";
import { getNightrideStationBySlug, NIGHTRIDE_STATIONS } from "./radioStations";
import { getRandomTrackIndex } from "./tracks";

/**
 * Persistent audio controller that lives in AppShell.
 * Handles all meditation audio playback (streams and local files)
 * so audio continues seamlessly between meditation screen and mini player.
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
    setIsStream,
    setStreamMetadata,
  } = useMeditationStore();

  const { audioSourceType, nightrideStation, currentRadioBrowserStation } =
    useSettingsStore();

  // Determine audio source based on settings
  const getAudioSource = (): { url: string; isStream: boolean } => {
    // Nightride.fm radio
    if (audioSourceType === "nightride") {
      const station = getNightrideStationBySlug(nightrideStation);
      return {
        url: station?.streamUrl || NIGHTRIDE_STATIONS[0].streamUrl,
        isStream: true,
      };
    }

    // Radio Browser station
    if (audioSourceType === "radiobrowser" && currentRadioBrowserStation) {
      return {
        url: currentRadioBrowserStation.streamUrl,
        isStream: true,
      };
    }

    // Custom MP3 folder or fallback to tracks
    const track = tracks[currentTrack] || tracks[0];
    if (!track) {
      return { url: "", isStream: false };
    }

    const url =
      track.isCustom && track.path
        ? convertFileSrc(track.path)
        : `/audio/meditation/${track.file || ""}`;

    return { url, isStream: false };
  };

  const { url: audioSrc, isStream } = getAudioSource();

  // Update stream state in store
  useEffect(() => {
    setIsStream(isStream);
  }, [isStream, setIsStream]);

  // Stream metadata polling (only for streams)
  const metadata = useStreamMetadata(isStream ? audioSrc : null, isPlaying);

  useEffect(() => {
    setStreamMetadata(metadata);
  }, [metadata, setStreamMetadata]);

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

  // Handle source changes (track changes or station changes)
  useEffect(() => {
    if (!audioRef.current || !shouldBeActive || !audioSrc) return;

    audioRef.current.load();
    if (isPlaying) {
      audioRef.current.play().catch(() => setPlaying(false));
    }
  }, [audioSrc, shouldBeActive, isPlaying, setPlaying]);

  // Handle when audio should stop completely
  useEffect(() => {
    if (!shouldBeActive && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [shouldBeActive]);

  // Pick random next track when song ends (only for non-streams)
  const handleEnded = () => {
    if (!isStream && tracks.length > 0) {
      const next = getRandomTrackIndex(tracks.length, currentTrack);
      setTrack(next);
    }
    // Streams don't end, they just keep playing
  };

  // Auto-play when audio is ready and meditation is active
  const handleCanPlay = () => {
    if (shouldBeActive && !isPlaying && audioRef.current) {
      // Auto-play when meditation screen opens
      audioRef.current.play().catch(() => setPlaying(false));
    }
  };

  // Only render audio element when needed and we have a valid source
  if (!shouldBeActive || !audioSrc) return null;

  return (
    <audio
      ref={audioRef}
      src={audioSrc}
      onCanPlay={handleCanPlay}
      onPlay={() => setPlaying(true)}
      onPause={() => {
        // Only update state if we're still supposed to be active
        // This prevents race conditions during cleanup
        if (
          useMeditationStore.getState().isActive ||
          useMeditationStore.getState().miniPlayerVisible
        ) {
          setPlaying(false);
        }
      }}
      onEnded={handleEnded}
      onError={() => setPlaying(false)}
    />
  );
}
