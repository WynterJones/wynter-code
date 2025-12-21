import { create } from "zustand";
import { TRACK_COUNT, getRandomTrackIndex } from "@/components/meditation/tracks";

interface MeditationState {
  isActive: boolean;
  miniPlayerVisible: boolean;
  currentTrack: number;
  isPlaying: boolean;
  volume: number;
  setActive: (active: boolean) => void;
  setMiniPlayerVisible: (visible: boolean) => void;
  setTrack: (track: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (vol: number) => void;
  closeMiniPlayer: () => void;
}

export const useMeditationStore = create<MeditationState>((set, get) => ({
  isActive: false,
  miniPlayerVisible: false,
  currentTrack: getRandomTrackIndex(),
  isPlaying: false,
  volume: 1.0,

  setActive: (active) => {
    const { isPlaying } = get();
    if (!active && isPlaying) {
      // Closing meditation while playing - show mini player
      set({ isActive: false, miniPlayerVisible: true });
    } else {
      set({ isActive: active });
    }
  },

  setMiniPlayerVisible: (visible) => set({ miniPlayerVisible: visible }),

  setTrack: (track) => set({ currentTrack: track }),

  nextTrack: () =>
    set((state) => ({
      currentTrack: (state.currentTrack + 1) % TRACK_COUNT,
    })),

  prevTrack: () =>
    set((state) => ({
      currentTrack: (state.currentTrack - 1 + TRACK_COUNT) % TRACK_COUNT,
    })),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setPlaying: (playing) => set({ isPlaying: playing }),

  setVolume: (vol) => set({ volume: Math.max(0, Math.min(1, vol)) }),

  closeMiniPlayer: () => set({ miniPlayerVisible: false, isPlaying: false }),
}));
