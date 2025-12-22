import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/stores/settingsStore";
import { useMeditationStore } from "@/stores/meditationStore";
import { Track } from "@/components/meditation/tracks";

interface AudioFile {
  name: string;
  file: string;
  path: string;
}

export function useCustomMusic() {
  const { customMusicPath } = useSettingsStore();
  const { setTracks, resetToBuiltIn } = useMeditationStore();

  const loadCustomMusic = useCallback(
    async (folderPath: string) => {
      if (!folderPath) {
        resetToBuiltIn();
        return;
      }

      try {
        const files = await invoke<AudioFile[]>("scan_music_folder", {
          folderPath,
        });

        if (files.length === 0) {
          console.warn("No mp3 files found in folder, using built-in tracks");
          resetToBuiltIn();
          return;
        }

        const customTracks: Track[] = files.map((f) => ({
          name: f.name,
          file: f.file,
          path: f.path,
          isCustom: true,
        }));

        setTracks(customTracks);
      } catch (error) {
        console.error("Failed to load custom music:", error);
        resetToBuiltIn();
      }
    },
    [setTracks, resetToBuiltIn]
  );

  useEffect(() => {
    loadCustomMusic(customMusicPath);
  }, [customMusicPath, loadCustomMusic]);

  return { loadCustomMusic };
}
