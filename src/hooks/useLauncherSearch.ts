import { useMemo, useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Play,
  Folder,
  MessageSquare,
  FolderOpen,
  AppWindow,
} from "lucide-react";
import { LauncherItem, LauncherAction, MacOSApp } from "@/types/launcher";
import { useLauncherStore } from "@/stores/launcherStore";
import { TOOL_DEFINITIONS, ToolDefinition } from "@/components/tools/ToolsDropdown";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/sessionStore";
import type { Session } from "@/types";
import React from "react";

// App icon cache (in-memory)
const appIconCache = new Map<string, string | null>();
const pendingIconFetches = new Map<string, Promise<string | null>>();

// Fetch a single app icon with caching
async function fetchAppIcon(appPath: string): Promise<string | null> {
  if (appIconCache.has(appPath)) {
    return appIconCache.get(appPath) ?? null;
  }

  if (pendingIconFetches.has(appPath)) {
    return pendingIconFetches.get(appPath)!;
  }

  const promise = invoke<string | null>("get_app_icon_base64", { appPath })
    .then((icon) => {
      appIconCache.set(appPath, icon);
      pendingIconFetches.delete(appPath);
      return icon;
    })
    .catch(() => {
      appIconCache.set(appPath, null);
      pendingIconFetches.delete(appPath);
      return null;
    });

  pendingIconFetches.set(appPath, promise);
  return promise;
}

// Fuzzy match scoring
function fuzzyScore(query: string, text: string): number {
  if (!query) return 1;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact prefix match
  if (textLower.startsWith(queryLower)) {
    return 100 + queryLower.length * 10;
  }

  // Contains match
  if (textLower.includes(queryLower)) {
    return 50 + queryLower.length * 5;
  }

  // Fuzzy character matching
  let score = 0;
  let queryIndex = 0;
  let consecutive = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 1 + consecutive;
      consecutive++;
      queryIndex++;

      // Bonus for word boundary
      if (i === 0 || /[\s\-_]/.test(text[i - 1])) {
        score += 3;
      }
    } else {
      consecutive = 0;
    }
  }

  // Must match all query characters
  if (queryIndex < queryLower.length) {
    return 0;
  }

  return score;
}

// Create actions for different item types
function createToolActions(tool: ToolDefinition): LauncherAction[] {
  const openAction: LauncherAction = {
    id: "open",
    title: "Open Tool",
    shortcut: "Enter",
    icon: React.createElement(Play, { className: "w-4 h-4" }),
    onExecute: async () => {
      // Use Tauri command to open tool in main window
      // This properly shows the main window and emits the event there
      // For sub-tools, pass the subToolId so the parent popup can open to the right tab
      await invoke("open_tool_in_main_window", {
        action: tool.actionKey,
        subToolId: tool.subToolId || null,
      });
    },
  };

  return [openAction];
}

function createAppActions(app: MacOSApp): LauncherAction[] {
  return [
    {
      id: "open",
      title: "Open Application",
      shortcut: "Enter",
      icon: React.createElement(Play, { className: "w-4 h-4" }),
      onExecute: async () => {
        // Deactivate the app so main window doesn't show when opening external apps
        await invoke("open_application", { path: app.path, deactivate: true });
      },
    },
    {
      id: "reveal",
      title: "Reveal in Finder",
      shortcut: "Cmd+Shift+F",
      icon: React.createElement(FolderOpen, { className: "w-4 h-4" }),
      onExecute: async () => {
        await invoke("reveal_in_finder", { path: app.path });
      },
    },
  ];
}

function createProjectActions(
  project: { id: string; path: string; name: string },
  setActiveProject: (id: string) => void
): LauncherAction[] {
  return [
    {
      id: "switch",
      title: "Switch to Project",
      shortcut: "Enter",
      icon: React.createElement(Folder, { className: "w-4 h-4" }),
      onExecute: () => {
        setActiveProject(project.id);
      },
    },
    {
      id: "reveal",
      title: "Reveal in Finder",
      shortcut: "Cmd+Shift+F",
      icon: React.createElement(FolderOpen, { className: "w-4 h-4" }),
      onExecute: async () => {
        await invoke("reveal_in_finder", { path: project.path });
      },
    },
  ];
}

function createSessionActions(
  session: { id: string; name: string },
  projectId: string,
  setActiveSession: (pid: string, sid: string) => void
): LauncherAction[] {
  return [
    {
      id: "switch",
      title: "Switch to Session",
      shortcut: "Enter",
      icon: React.createElement(MessageSquare, { className: "w-4 h-4" }),
      onExecute: () => {
        setActiveSession(projectId, session.id);
      },
    },
  ];
}

export function useLauncherSearch() {
  const { query, searchMode, getRecencyScore, getFrequencyScore } =
    useLauncherStore();
  const { projects, setActiveProject } = useProjectStore();
  const { sessions, setActiveSession } = useSessionStore();

  const [macApps, setMacApps] = useState<MacOSApp[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [loadedIcons, setLoadedIcons] = useState<Map<string, string | null>>(new Map());

  // Fetch macOS apps when query changes
  useEffect(() => {
    if (searchMode !== "all" && searchMode !== "apps") return;

    const fetchApps = async () => {
      // Only show loading spinner when there's an actual query
      if (query.length > 0) {
        setIsLoadingApps(true);
      }
      try {
        const apps = await invoke<MacOSApp[]>("search_macos_apps", {
          query: query,
        });
        setMacApps(apps);
      } catch (error) {
        console.error("Failed to fetch macOS apps:", error);
        setMacApps([]);
      } finally {
        setIsLoadingApps(false);
      }
    };

    // Fetch immediately on mount (no debounce for empty query)
    // Debounce only when user is actively typing
    if (query.length === 0) {
      fetchApps();
      return;
    }

    const timeoutId = setTimeout(fetchApps, 150);
    return () => clearTimeout(timeoutId);
  }, [query, searchMode]);

  // Load app icons in background
  useEffect(() => {
    if (macApps.length === 0) return;

    const loadIcons = async () => {
      const newIcons = new Map(loadedIcons);
      let hasChanges = false;

      for (const app of macApps) {
        if (!loadedIcons.has(app.path)) {
          const icon = await fetchAppIcon(app.path);
          newIcons.set(app.path, icon);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        setLoadedIcons(newIcons);
      }
    };

    loadIcons();
  }, [macApps]);

  // Helper to get icon for an app (cached or fallback)
  const getAppIcon = useCallback(
    (app: MacOSApp): React.ReactNode => {
      const cachedIcon = appIconCache.get(app.path) ?? loadedIcons.get(app.path);
      if (cachedIcon) {
        return cachedIcon; // Return base64 string, will be rendered as <img> in LauncherResultItem
      }
      return React.createElement(AppWindow, { className: "w-4 h-4" });
    },
    [loadedIcons]
  );

  const results = useMemo(() => {
    const items: LauncherItem[] = [];

    // Add tools (if mode is all or tools)
    if (searchMode === "all" || searchMode === "tools") {
      TOOL_DEFINITIONS.forEach((tool) => {
        const score = fuzzyScore(query, tool.name);
        // Only show non-subtools when query is empty, show all when searching
        const isSubTool = !!tool.subToolId;
        const shouldShow = query ? score > 0 : !isSubTool;

        if (shouldShow) {
          const actions = createToolActions(tool);
          items.push({
            id: `tool-${tool.id}`,
            type: "tool",
            title: tool.name,
            // For sub-tools, show the parent group as subtitle
            subtitle: isSubTool ? tool.group : tool.description,
            icon: React.createElement(tool.icon, { className: "w-4 h-4" }),
            // Group sub-tools under their parent category
            category: isSubTool && tool.group ? tool.group : "Tools",
            keywords: [tool.actionKey, tool.category],
            score,
            actions,
            defaultAction: actions[0],
            metadata: { toolDef: tool },
          });
        }
      });
    }

    // Add projects (if mode is all or tools)
    if (searchMode === "all" || searchMode === "tools") {
      projects.forEach((project) => {
        const score = fuzzyScore(query, project.name);
        if (score > 0 || !query) {
          const actions = createProjectActions(project, setActiveProject);
          items.push({
            id: `project-${project.id}`,
            type: "project",
            title: project.name,
            subtitle: project.path,
            icon: React.createElement(Folder, { className: "w-4 h-4" }),
            category: "Projects",
            score,
            actions,
            defaultAction: actions[0],
            metadata: { project },
          });
        }
      });
    }

    // Add sessions (if mode is all or tools)
    if (searchMode === "all" || searchMode === "tools") {
      sessions.forEach((projectSessions: Session[], projectId: string) => {
        projectSessions.forEach((session: Session) => {
          const score = fuzzyScore(query, session.name);
          if (score > 0 || !query) {
            const actions = createSessionActions(
              session,
              projectId,
              setActiveSession
            );
            items.push({
              id: `session-${session.id}`,
              type: "session",
              title: session.name,
              subtitle: `Session`,
              icon: React.createElement(MessageSquare, { className: "w-4 h-4" }),
              category: "Sessions",
              score,
              actions,
              defaultAction: actions[0],
              metadata: { session, projectId },
            });
          }
        });
      });
    }

    // Add macOS apps (if mode is all or apps)
    if (searchMode === "all" || searchMode === "apps") {
      macApps.forEach((app) => {
        const actions = createAppActions(app);
        items.push({
          id: `app-${app.path}`,
          type: "application",
          title: app.name,
          subtitle: undefined, // Don't show path for cleaner look
          icon: getAppIcon(app),
          category: "Applications",
          score: fuzzyScore(query, app.name),
          actions,
          defaultAction: actions[0],
          metadata: { app },
        });
      });
    }

    // Sort by combined score (fuzzy + recency + frequency)
    items.sort((a, b) => {
      const aScore =
        (a.score || 0) + getRecencyScore(a.id) + getFrequencyScore(a.id);
      const bScore =
        (b.score || 0) + getRecencyScore(b.id) + getFrequencyScore(b.id);
      return bScore - aScore;
    });

    // Limit results
    return items.slice(0, 50);
  }, [
    query,
    searchMode,
    macApps,
    projects,
    sessions,
    getRecencyScore,
    getFrequencyScore,
    setActiveProject,
    setActiveSession,
    getAppIcon,
    loadedIcons,
  ]);

  return {
    results,
    isLoading: isLoadingApps,
  };
}
