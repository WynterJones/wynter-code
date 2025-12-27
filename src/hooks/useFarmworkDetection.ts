import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useProjectStore } from "@/stores/projectStore";

interface FarmworkDetection {
  hasFarmwork: boolean;
  hasGarden: boolean;
  hasFarmhouse: boolean;
  isDetecting: boolean;
}

export function useFarmworkDetection() {
  const [detection, setDetection] = useState<FarmworkDetection>({
    hasFarmwork: false,
    hasGarden: false,
    hasFarmhouse: false,
    isDetecting: true,
  });

  const activeProject = useProjectStore((s) => {
    if (!s.activeProjectId) return null;
    return s.projects.find((p) => p.id === s.activeProjectId) || null;
  });

  const detectFarmwork = useCallback(async () => {
    if (!activeProject?.path) {
      setDetection({
        hasFarmwork: false,
        hasGarden: false,
        hasFarmhouse: false,
        isDetecting: false,
      });
      return;
    }

    setDetection((prev) => ({ ...prev, isDetecting: true }));

    try {
      let hasFarmhouse = false;
      let hasGarden = false;

      // Check for FARMHOUSE.md
      try {
        await invoke<string>("read_file_content", {
          path: `${activeProject.path}/_AUDIT/FARMHOUSE.md`,
        });
        hasFarmhouse = true;
      } catch {
        // File doesn't exist
      }

      // Check for GARDEN.md
      try {
        await invoke<string>("read_file_content", {
          path: `${activeProject.path}/_AUDIT/GARDEN.md`,
        });
        hasGarden = true;
      } catch {
        // File doesn't exist
      }

      // Check if _AUDIT directory exists by checking for any of the known files
      const hasFarmwork = hasFarmhouse || hasGarden;

      setDetection({
        hasFarmwork,
        hasGarden,
        hasFarmhouse,
        isDetecting: false,
      });
    } catch {
      setDetection({
        hasFarmwork: false,
        hasGarden: false,
        hasFarmhouse: false,
        isDetecting: false,
      });
    }
  }, [activeProject?.path]);

  useEffect(() => {
    detectFarmwork();
  }, [detectFarmwork]);

  return { ...detection, refresh: detectFarmwork };
}
