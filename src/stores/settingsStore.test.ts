import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSettingsStore } from "./settingsStore";

// Mock the radioStations import to avoid importing React components
vi.mock("@/components/meditation/radioStations", () => ({
  NIGHTRIDE_STATIONS: [
    { id: "nightride", name: "Nightride" },
    { id: "chillsynth", name: "Chillsynth" },
    { id: "datawave", name: "Datawave" },
  ],
}));

// Helper to reset store state while preserving methods
const resetStore = () => {
  const state = useSettingsStore.getState();
  // Extract all setter methods
  const methods: Record<string, unknown> = {};
  for (const key of Object.keys(state)) {
    const stateRecord = state as unknown as Record<string, unknown>;
    if (typeof stateRecord[key] === "function") {
      methods[key] = stateRecord[key];
    }
  }

  useSettingsStore.setState({
    // Default values
    defaultModel: "claude-sonnet-4-20250514",
    sidebarWidth: 320,
    sidebarPosition: "right",
    sidebarCollapsed: false,
    sidebarTabOrder: ["files", "modules", "package", "git", "docs", "info"],
    theme: "dark",
    fontSize: 14,
    appFont: "jetbrains-mono",
    editorTheme: "catppuccin-ultrathin",
    editorFontSize: 14,
    editorWordWrap: true,
    editorMinimap: true,
    markdownDefaultView: "preview",
    markdownMaxWidth: "700",
    markdownFontSize: 15,
    defaultBrowsePath: "",
    customMusicPath: "",
    compactProjectTabs: false,
    dimInactiveProjects: false,
    compressionArchiveOverwrite: false,
    compressionMediaOverwrite: false,
    terminalShell: "system",
    terminalFontSize: 13,
    terminalCursorBlink: true,
    useMultiPanelLayout: false,
    userAvatar: null,
    claudeSafeMode: true,
    defaultProvider: "claude",
    defaultCodexModel: "gpt-5.2-codex",
    defaultGeminiModel: "gemini-2.5-flash",
    installedProviders: ["claude"],
    audioSourceType: "nightride",
    nightrideStation: "chillsynth",
    radioBrowserFavorites: [],
    currentRadioBrowserStation: null,
    lightcastHotkey: "alt-space",
    lightcastEnabled: true,
    launchAtStartup: false,
    claudeSubscriptionPlan: "pro",
    autoOpenFarmworkMiniPlayer: false,
    vibrancyEnabled: true,
    vibrancyDarkness: 0.65,
    geminiImageApiKey: "",
    lighthouseApiKey: "",
    ...methods,
  });
};

describe("settingsStore", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("default model settings", () => {
    it("has correct default model", () => {
      expect(useSettingsStore.getState().defaultModel).toBe(
        "claude-sonnet-4-20250514"
      );
    });

    it("sets default model", () => {
      useSettingsStore.getState().setDefaultModel("claude-opus-4-20250514");
      expect(useSettingsStore.getState().defaultModel).toBe(
        "claude-opus-4-20250514"
      );
    });
  });

  describe("sidebar settings", () => {
    it("sets sidebar width", () => {
      useSettingsStore.getState().setSidebarWidth(400);
      expect(useSettingsStore.getState().sidebarWidth).toBe(400);
    });

    it("sets sidebar position", () => {
      useSettingsStore.getState().setSidebarPosition("left");
      expect(useSettingsStore.getState().sidebarPosition).toBe("left");
    });

    it("sets sidebar collapsed", () => {
      useSettingsStore.getState().setSidebarCollapsed(true);
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(true);
    });

    it("sets sidebar tab order", () => {
      const newOrder = ["git", "files", "package", "modules", "docs", "info"] as const;
      useSettingsStore.getState().setSidebarTabOrder([...newOrder]);
      expect(useSettingsStore.getState().sidebarTabOrder).toEqual(newOrder);
    });
  });

  describe("appearance settings", () => {
    it("sets font size", () => {
      useSettingsStore.getState().setFontSize(16);
      expect(useSettingsStore.getState().fontSize).toBe(16);
    });

    it("sets app font", () => {
      useSettingsStore.getState().setAppFont("fira-code");
      expect(useSettingsStore.getState().appFont).toBe("fira-code");
    });

    it("sets editor theme", () => {
      useSettingsStore.getState().setEditorTheme("dracula");
      expect(useSettingsStore.getState().editorTheme).toBe("dracula");
    });

    it("sets editor font size", () => {
      useSettingsStore.getState().setEditorFontSize(16);
      expect(useSettingsStore.getState().editorFontSize).toBe(16);
    });

    it("sets editor word wrap", () => {
      useSettingsStore.getState().setEditorWordWrap(false);
      expect(useSettingsStore.getState().editorWordWrap).toBe(false);
    });

    it("sets editor minimap", () => {
      useSettingsStore.getState().setEditorMinimap(false);
      expect(useSettingsStore.getState().editorMinimap).toBe(false);
    });
  });

  describe("markdown settings", () => {
    it("sets markdown default view", () => {
      useSettingsStore.getState().setMarkdownDefaultView("edit");
      expect(useSettingsStore.getState().markdownDefaultView).toBe("edit");
    });

    it("sets markdown max width", () => {
      useSettingsStore.getState().setMarkdownMaxWidth("1200");
      expect(useSettingsStore.getState().markdownMaxWidth).toBe("1200");
    });

    it("sets markdown font size", () => {
      useSettingsStore.getState().setMarkdownFontSize(18);
      expect(useSettingsStore.getState().markdownFontSize).toBe(18);
    });
  });

  describe("path settings", () => {
    it("sets default browse path", () => {
      useSettingsStore.getState().setDefaultBrowsePath("/Users/test/projects");
      expect(useSettingsStore.getState().defaultBrowsePath).toBe(
        "/Users/test/projects"
      );
    });

    it("sets custom music path", () => {
      useSettingsStore.getState().setCustomMusicPath("/Users/test/music");
      expect(useSettingsStore.getState().customMusicPath).toBe(
        "/Users/test/music"
      );
    });
  });

  describe("project tab settings", () => {
    it("sets compact project tabs", () => {
      useSettingsStore.getState().setCompactProjectTabs(true);
      expect(useSettingsStore.getState().compactProjectTabs).toBe(true);
    });

    it("sets dim inactive projects", () => {
      useSettingsStore.getState().setDimInactiveProjects(true);
      expect(useSettingsStore.getState().dimInactiveProjects).toBe(true);
    });
  });

  describe("compression settings", () => {
    it("sets archive overwrite", () => {
      useSettingsStore.getState().setCompressionArchiveOverwrite(true);
      expect(useSettingsStore.getState().compressionArchiveOverwrite).toBe(
        true
      );
    });

    it("sets media overwrite", () => {
      useSettingsStore.getState().setCompressionMediaOverwrite(true);
      expect(useSettingsStore.getState().compressionMediaOverwrite).toBe(true);
    });
  });

  describe("terminal settings", () => {
    it("sets terminal shell", () => {
      useSettingsStore.getState().setTerminalShell("zsh");
      expect(useSettingsStore.getState().terminalShell).toBe("zsh");
    });

    it("sets terminal font size", () => {
      useSettingsStore.getState().setTerminalFontSize(14);
      expect(useSettingsStore.getState().terminalFontSize).toBe(14);
    });

    it("sets terminal cursor blink", () => {
      useSettingsStore.getState().setTerminalCursorBlink(false);
      expect(useSettingsStore.getState().terminalCursorBlink).toBe(false);
    });
  });

  describe("layout settings", () => {
    it("sets multi panel layout", () => {
      useSettingsStore.getState().setUseMultiPanelLayout(true);
      expect(useSettingsStore.getState().useMultiPanelLayout).toBe(true);
    });
  });

  describe("user avatar settings", () => {
    it("sets user avatar", () => {
      useSettingsStore.getState().setUserAvatar("data:image/png;base64,abc");
      expect(useSettingsStore.getState().userAvatar).toBe(
        "data:image/png;base64,abc"
      );
    });

    it("clears user avatar", () => {
      useSettingsStore.getState().setUserAvatar("data:image/png;base64,abc");
      useSettingsStore.getState().setUserAvatar(null);
      expect(useSettingsStore.getState().userAvatar).toBeNull();
    });
  });

  describe("safety settings", () => {
    it("has safe mode enabled by default", () => {
      expect(useSettingsStore.getState().claudeSafeMode).toBe(true);
    });

    it("sets claude safe mode", () => {
      useSettingsStore.getState().setClaudeSafeMode(false);
      expect(useSettingsStore.getState().claudeSafeMode).toBe(false);
    });
  });

  describe("AI provider settings", () => {
    it("sets default provider", () => {
      useSettingsStore.getState().setDefaultProvider("codex");
      expect(useSettingsStore.getState().defaultProvider).toBe("codex");
    });

    it("sets default codex model", () => {
      useSettingsStore.getState().setDefaultCodexModel("gpt-5.1-codex-max");
      expect(useSettingsStore.getState().defaultCodexModel).toBe(
        "gpt-5.1-codex-max"
      );
    });

    it("sets default gemini model", () => {
      useSettingsStore.getState().setDefaultGeminiModel("gemini-2.5-pro");
      expect(useSettingsStore.getState().defaultGeminiModel).toBe(
        "gemini-2.5-pro"
      );
    });

    it("sets installed providers", () => {
      useSettingsStore
        .getState()
        .setInstalledProviders(["claude", "codex", "gemini"]);
      expect(useSettingsStore.getState().installedProviders).toEqual([
        "claude",
        "codex",
        "gemini",
      ]);
    });
  });

  describe("radio settings", () => {
    it("sets audio source type", () => {
      useSettingsStore.getState().setAudioSourceType("radiobrowser");
      expect(useSettingsStore.getState().audioSourceType).toBe("radiobrowser");
    });

    it("sets nightride station", () => {
      useSettingsStore.getState().setNightrideStation("datawave");
      expect(useSettingsStore.getState().nightrideStation).toBe("datawave");
    });

    it("cycles to next nightride station", () => {
      useSettingsStore.getState().setNightrideStation("nightride");
      useSettingsStore.getState().nextNightrideStation();
      expect(useSettingsStore.getState().nightrideStation).toBe("chillsynth");
    });

    it("cycles to previous nightride station", () => {
      useSettingsStore.getState().setNightrideStation("chillsynth");
      useSettingsStore.getState().prevNightrideStation();
      expect(useSettingsStore.getState().nightrideStation).toBe("nightride");
    });

    it("adds radio browser favorite", () => {
      const station = {
        stationuuid: "uuid-1",
        name: "Test Station",
        streamUrl: "http://test.com/stream",
        favicon: "",
        tags: "",
      };
      useSettingsStore.getState().addRadioBrowserFavorite(station);
      expect(useSettingsStore.getState().radioBrowserFavorites).toHaveLength(1);
      expect(useSettingsStore.getState().radioBrowserFavorites[0].name).toBe(
        "Test Station"
      );
    });

    it("removes duplicate when adding same favorite", () => {
      const station = {
        stationuuid: "uuid-1",
        name: "Test Station",
        streamUrl: "http://test.com/stream",
        favicon: "",
        tags: "",
      };
      useSettingsStore.getState().addRadioBrowserFavorite(station);
      useSettingsStore
        .getState()
        .addRadioBrowserFavorite({ ...station, name: "Updated Name" });

      expect(useSettingsStore.getState().radioBrowserFavorites).toHaveLength(1);
      expect(useSettingsStore.getState().radioBrowserFavorites[0].name).toBe(
        "Updated Name"
      );
    });

    it("removes radio browser favorite", () => {
      const station = {
        stationuuid: "uuid-1",
        name: "Test Station",
        streamUrl: "http://test.com/stream",
        favicon: "",
        tags: "",
      };
      useSettingsStore.getState().addRadioBrowserFavorite(station);
      useSettingsStore.getState().removeRadioBrowserFavorite("uuid-1");
      expect(useSettingsStore.getState().radioBrowserFavorites).toHaveLength(0);
    });

    it("sets current radio browser station", () => {
      const station = {
        stationuuid: "uuid-1",
        name: "Test Station",
        streamUrl: "http://test.com/stream",
        favicon: "",
        tags: "",
      };
      useSettingsStore.getState().setCurrentRadioBrowserStation(station);
      expect(
        useSettingsStore.getState().currentRadioBrowserStation?.name
      ).toBe("Test Station");
    });

    it("clears current radio browser station", () => {
      useSettingsStore.getState().setCurrentRadioBrowserStation({
        stationuuid: "uuid-1",
        name: "Test",
        streamUrl: "",
        favicon: "",
        tags: "",
      });
      useSettingsStore.getState().setCurrentRadioBrowserStation(null);
      expect(useSettingsStore.getState().currentRadioBrowserStation).toBeNull();
    });
  });

  describe("lightcast settings", () => {
    it("sets lightcast hotkey", () => {
      useSettingsStore.getState().setLightcastHotkey("cmd-space");
      expect(useSettingsStore.getState().lightcastHotkey).toBe("cmd-space");
    });

    it("sets lightcast enabled", () => {
      useSettingsStore.getState().setLightcastEnabled(false);
      expect(useSettingsStore.getState().lightcastEnabled).toBe(false);
    });

    it("sets launch at startup", () => {
      useSettingsStore.getState().setLaunchAtStartup(true);
      expect(useSettingsStore.getState().launchAtStartup).toBe(true);
    });
  });

  describe("claude limits settings", () => {
    it("sets claude subscription plan", () => {
      useSettingsStore.getState().setClaudeSubscriptionPlan("max-200");
      expect(useSettingsStore.getState().claudeSubscriptionPlan).toBe(
        "max-200"
      );
    });
  });

  describe("farmwork settings", () => {
    it("sets auto open farmwork mini player", () => {
      useSettingsStore.getState().setAutoOpenFarmworkMiniPlayer(true);
      expect(useSettingsStore.getState().autoOpenFarmworkMiniPlayer).toBe(true);
    });
  });

  describe("vibrancy settings", () => {
    it("sets vibrancy enabled", () => {
      useSettingsStore.getState().setVibrancyEnabled(false);
      expect(useSettingsStore.getState().vibrancyEnabled).toBe(false);
    });

    it("sets vibrancy darkness", () => {
      useSettingsStore.getState().setVibrancyDarkness(0.8);
      expect(useSettingsStore.getState().vibrancyDarkness).toBe(0.8);
    });
  });

  describe("API key settings", () => {
    it("sets gemini image API key", () => {
      useSettingsStore.getState().setGeminiImageApiKey("test-api-key");
      expect(useSettingsStore.getState().geminiImageApiKey).toBe(
        "test-api-key"
      );
    });

    it("sets lighthouse API key", () => {
      useSettingsStore.getState().setLighthouseApiKey("lighthouse-key");
      expect(useSettingsStore.getState().lighthouseApiKey).toBe(
        "lighthouse-key"
      );
    });
  });
});
