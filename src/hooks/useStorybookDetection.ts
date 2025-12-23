import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useProjectStore } from "@/stores/projectStore";

interface StorybookDetection {
  hasStorybook: boolean;
  version: string | null;
  framework: string | null;
  startCommand: string | null;
  port: number;
  isDetecting: boolean;
}

const STORYBOOK_PACKAGES = [
  "storybook",
  "@storybook/react",
  "@storybook/vue3",
  "@storybook/angular",
  "@storybook/svelte",
  "@storybook/web-components",
  "@storybook/html",
  "@storybook/preact",
  "@storybook/nextjs",
];

const STORYBOOK_CONFIG_FILES = [
  ".storybook/main.ts",
  ".storybook/main.js",
  ".storybook/main.mjs",
  ".storybook/main.cjs",
];

export function useStorybookDetection() {
  const [detection, setDetection] = useState<StorybookDetection>({
    hasStorybook: false,
    version: null,
    framework: null,
    startCommand: null,
    port: 6006,
    isDetecting: true,
  });

  const activeProject = useProjectStore((s) => {
    if (!s.activeProjectId) return null;
    return s.projects.find((p) => p.id === s.activeProjectId) || null;
  });

  const detectStorybook = useCallback(async () => {
    if (!activeProject?.path) {
      setDetection((prev) => ({
        ...prev,
        hasStorybook: false,
        isDetecting: false,
      }));
      return;
    }

    setDetection((prev) => ({ ...prev, isDetecting: true }));

    try {
      const content = await invoke<string>("read_file_content", {
        path: `${activeProject.path}/package.json`,
      });
      const packageJson = JSON.parse(content);

      const allDeps = {
        ...packageJson?.dependencies,
        ...packageJson?.devDependencies,
      };

      let detectedPackage: string | null = null;
      let version: string | null = null;

      for (const pkg of STORYBOOK_PACKAGES) {
        if (pkg in allDeps) {
          detectedPackage = pkg;
          version = allDeps[pkg];
          break;
        }
      }

      let hasConfig = false;
      for (const configFile of STORYBOOK_CONFIG_FILES) {
        try {
          await invoke<string>("read_file_content", {
            path: `${activeProject.path}/${configFile}`,
          });
          hasConfig = true;
          break;
        } catch {
          // Config doesn't exist
        }
      }

      const scripts = packageJson?.scripts || {};
      const hasStorybookScript =
        "storybook" in scripts ||
        "sb" in scripts ||
        Object.values(scripts).some(
          (s) => typeof s === "string" && s.includes("storybook dev")
        );

      let startCommand = "npx storybook dev";
      if ("storybook" in scripts) {
        startCommand = "npm run storybook";
      } else if ("sb" in scripts) {
        startCommand = "npm run sb";
      }

      const hasStorybook = !!(
        detectedPackage ||
        hasConfig ||
        hasStorybookScript
      );

      const framework = detectedPackage?.replace("@storybook/", "") || null;

      setDetection({
        hasStorybook,
        version,
        framework,
        startCommand: hasStorybook ? startCommand : null,
        port: 6006,
        isDetecting: false,
      });
    } catch {
      setDetection({
        hasStorybook: false,
        version: null,
        framework: null,
        startCommand: null,
        port: 6006,
        isDetecting: false,
      });
    }
  }, [activeProject?.path]);

  useEffect(() => {
    detectStorybook();
  }, [detectStorybook]);

  return { ...detection, refresh: detectStorybook };
}
