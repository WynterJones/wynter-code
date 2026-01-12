import { useRef, useEffect, useCallback, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
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
  const hasAutoPlayedRef = useRef(false);
  const previousSrcRef = useRef<string | null>(null);

  const {
    isActive,
    miniPlayerVisible,
    currentTrack,
    isPlaying,
    volume,
    tracks,
    setPlaying,
    setLoading,
    setTrack,
    setIsStream,
    setStreamMetadata,
    setAudioElementRef,
    setShowVisualizer,
  } = useMeditationStore();

  const { audioSourceType, nightrideStation, currentRadioBrowserStation } =
    useSettingsStore();

  // State for proxied stream URL
  const [proxiedStreamUrl, setProxiedStreamUrl] = useState<string | null>(null);

  // Determine audio source based on settings
  const getAudioSource = useCallback((): { url: string; isStream: boolean; rawStreamUrl?: string } => {
    // Nightride.fm radio
    if (audioSourceType === "nightride") {
      const station = getNightrideStationBySlug(nightrideStation);
      const url = station?.streamUrl || NIGHTRIDE_STATIONS[0].streamUrl;
      return { url, isStream: true, rawStreamUrl: url };
    }

    // Radio Browser station
    if (audioSourceType === "radiobrowser" && currentRadioBrowserStation) {
      return {
        url: currentRadioBrowserStation.streamUrl,
        isStream: true,
        rawStreamUrl: currentRadioBrowserStation.streamUrl,
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
  }, [audioSourceType, nightrideStation, currentRadioBrowserStation, tracks, currentTrack]);

  const { url: directUrl, isStream, rawStreamUrl } = getAudioSource();

  // Get proxied URL for streams (to bypass CSP in production)
  useEffect(() => {
    if (isStream && rawStreamUrl) {
      invoke<string>("get_audio_proxy_url", { streamUrl: rawStreamUrl })
        .then((proxiedUrl) => {
          setProxiedStreamUrl(proxiedUrl);
        })
        .catch((err) => {
          console.error("Failed to get proxied stream URL:", err);
          // Fallback to direct URL (works in dev mode)
          setProxiedStreamUrl(rawStreamUrl);
        });
    } else {
      setProxiedStreamUrl(null);
    }
  }, [isStream, rawStreamUrl]);

  // Use proxied URL for streams, direct URL for local files
  const audioSrc = isStream ? (proxiedStreamUrl || "") : directUrl;

  // Update stream state in store and hide visualizer for streams
  useEffect(() => {
    setIsStream(isStream);
    // Hide visualizer for radio streams (CORS prevents Web Audio API analysis)
    // Show visualizer only for local MP3 files
    setShowVisualizer(!isStream);
  }, [isStream, setIsStream, setShowVisualizer]);

  // Stream metadata polling (only for streams) - use raw URL for metadata detection
  const metadata = useStreamMetadata(isStream ? (rawStreamUrl || null) : null, isPlaying);

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

    // Only reload if the source actually changed
    if (previousSrcRef.current !== audioSrc) {
      previousSrcRef.current = audioSrc;
      audioRef.current.load();
      // If currently playing, continue playing the new source
      if (useMeditationStore.getState().isPlaying) {
        audioRef.current.play().catch(() => setPlaying(false));
      }
    }
  }, [audioSrc, shouldBeActive, setPlaying]);

  // Handle when audio should stop completely
  useEffect(() => {
    if (!shouldBeActive && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // Reset auto-play flag when meditation becomes inactive
      hasAutoPlayedRef.current = false;
      previousSrcRef.current = null;
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

  // Auto-play only on initial activation (not after user pauses)
  const handleCanPlay = () => {
    setLoading(false);
    if (shouldBeActive && !hasAutoPlayedRef.current && audioRef.current) {
      hasAutoPlayedRef.current = true;
      audioRef.current.play().catch(() => setPlaying(false));
    }
  };

  // Expose audio element ref to store for visualizer
  useEffect(() => {
    if (audioRef.current) {
      setAudioElementRef(audioRef.current);
    }
    return () => {
      setAudioElementRef(null);
    };
  }, [setAudioElementRef, shouldBeActive, audioSrc]);

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
      onError={() => {
        setLoading(false);
        setPlaying(false);
      }}
    />
  );
}
