import { useState, useEffect, useRef } from "react";
import type { StreamMetadata } from "@/types/radio";

interface NightrideNowPlaying {
  [station: string]: {
    title?: string;
    artist?: string;
  };
}

export function useStreamMetadata(
  streamUrl: string | null,
  isPlaying: boolean
): StreamMetadata | null {
  const [metadata, setMetadata] = useState<StreamMetadata | null>(null);
  const pollIntervalRef = useRef<number>();

  useEffect(() => {
    if (!streamUrl || !isPlaying) {
      setMetadata(null);
      return;
    }

    // For Nightride.fm, poll their API for now-playing info
    if (streamUrl.includes("nightride.fm")) {
      const pollMetadata = async () => {
        try {
          const response = await fetch(
            "https://nightride.fm/api/now-playing"
          );
          const data: NightrideNowPlaying = await response.json();

          // Extract station name from URL
          const stationMatch = streamUrl.match(/\/(\w+)\.mp3$/);
          const stationKey = stationMatch ? stationMatch[1] : "nightride";

          if (data[stationKey]) {
            setMetadata({
              title: data[stationKey].title || undefined,
              artist: data[stationKey].artist || undefined,
              station: stationKey,
            });
          } else {
            // Fallback if station not found in response
            setMetadata({ station: stationKey });
          }
        } catch (error) {
          console.warn("Failed to fetch stream metadata:", error);
          // Still show station name on error
          const stationMatch = streamUrl.match(/\/(\w+)\.mp3$/);
          setMetadata({ station: stationMatch?.[1] || "nightride" });
        }
      };

      // Initial fetch
      pollMetadata();

      // Poll every 30 seconds
      pollIntervalRef.current = window.setInterval(pollMetadata, 30000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }

    // For other streams, just show generic label
    setMetadata({ station: "Internet Radio" });

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [streamUrl, isPlaying]);

  return metadata;
}
