import { create } from "zustand";
import {
  Track,
  BUILT_IN_TRACKS,
  getRandomTrackIndex,
} from "@/components/meditation/tracks";
import type { StreamMetadata } from "@/types/radio";

export type VisualizerType = "wave" | "bars" | "circle" | "line";

interface MeditationState {
  isActive: boolean;
  miniPlayerVisible: boolean;
  currentTrack: number;
  isPlaying: boolean;
  volume: number;
  tracks: Track[];

  // Stream state
  isStream: boolean;
  streamMetadata: StreamMetadata | null;

  // Visualizer state
  showVisualizer: boolean;
  visualizerType: VisualizerType;
  audioElementRef: HTMLAudioElement | null;

  setActive: (active: boolean) => void;
  setMiniPlayerVisible: (visible: boolean) => void;
  setTrack: (track: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (vol: number) => void;
  closeMiniPlayer: () => void;
  setTracks: (tracks: Track[]) => void;
  resetToBuiltIn: () => void;

  // Stream setters
  setIsStream: (isStream: boolean) => void;
  setStreamMetadata: (metadata: StreamMetadata | null) => void;

  // Visualizer setters
  setShowVisualizer: (show: boolean) => void;
  setVisualizerType: (type: VisualizerType) => void;
  setAudioElementRef: (ref: HTMLAudioElement | null) => void;
}

export const useMeditationStore = create<MeditationState>((set, get) => ({
  isActive: false,
  miniPlayerVisible: false,
  currentTrack: getRandomTrackIndex(BUILT_IN_TRACKS.length),
  isPlaying: false,
  volume: 1.0,
  tracks: BUILT_IN_TRACKS,

  // Stream state defaults
  isStream: false,
  streamMetadata: null,

  // Visualizer state defaults
  showVisualizer: true,
  visualizerType: "wave",
  audioElementRef: null,

  setActive: (active) => {
    const { isPlaying } = get();
    if (!active && isPlaying) {
      set({ isActive: false, miniPlayerVisible: true });
    } else {
      set({ isActive: active });
    }
  },

  setMiniPlayerVisible: (visible) => set({ miniPlayerVisible: visible }),

  setTrack: (track) => set({ currentTrack: track }),

  nextTrack: () =>
    set((state) => ({
      currentTrack: (state.currentTrack + 1) % state.tracks.length,
    })),

  prevTrack: () =>
    set((state) => ({
      currentTrack:
        (state.currentTrack - 1 + state.tracks.length) % state.tracks.length,
    })),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setPlaying: (playing) => set({ isPlaying: playing }),

  setVolume: (vol) => set({ volume: Math.max(0, Math.min(1, vol)) }),

  closeMiniPlayer: () => set({ miniPlayerVisible: false, isPlaying: false }),

  setTracks: (tracks) =>
    set({
      tracks,
      currentTrack:
        tracks.length > 0 ? getRandomTrackIndex(tracks.length) : 0,
    }),

  resetToBuiltIn: () =>
    set({
      tracks: BUILT_IN_TRACKS,
      currentTrack: getRandomTrackIndex(BUILT_IN_TRACKS.length),
    }),

  // Stream setters
  setIsStream: (isStream) => set({ isStream }),
  setStreamMetadata: (streamMetadata) => set({ streamMetadata }),

  // Visualizer setters
  setShowVisualizer: (showVisualizer) => set({ showVisualizer }),
  setVisualizerType: (visualizerType) => set({ visualizerType }),
  setAudioElementRef: (audioElementRef) => set({ audioElementRef }),
}));
