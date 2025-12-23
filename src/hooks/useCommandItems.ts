import { useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Folder, MessageSquare, Terminal } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/sessionStore";
import { TOOL_DEFINITIONS } from "@/components/tools";
import type { CommandItem } from "@/types";

export interface ToolActions {
  openLivePreview: () => void;
  openColorPicker: () => void;
  openPortManager: () => void;
  openNodeModulesCleaner: () => void;
  openLocalhostTunnel: () => void;
  openSystemHealth: () => void;
}

export function useCommandItems(toolActions: ToolActions): CommandItem[] {
  const { projects, activeProjectId, setActiveProject } = useProjectStore();
  const { getSessionsForProject, setActiveSession } = useSessionStore();

  return useMemo(() => {
    const items: CommandItem[] = [];

    // Add tools
    TOOL_DEFINITIONS.forEach((tool) => {
      const Icon = tool.icon;
      items.push({
        id: `tool-${tool.id}`,
        type: "tool",
        label: tool.name,
        description: tool.description,
        icon: <Icon className="w-4 h-4" />,
        category: "Tools",
        action: () => {
          const actionFn = toolActions[tool.actionKey as keyof ToolActions];
          if (actionFn) {
            actionFn();
          }
        },
      });
    });

    // Add projects
    projects.forEach((project) => {
      items.push({
        id: `project-${project.id}`,
        type: "project",
        label: project.name,
        description: project.path,
        icon: <Folder className="w-4 h-4" style={{ color: project.color }} />,
        keywords: [project.path],
        category: "Projects",
        action: () => setActiveProject(project.id),
      });
    });

    // Add sessions for active project only
    if (activeProjectId) {
      const sessions = getSessionsForProject(activeProjectId);
      sessions.forEach((session) => {
        const SessionIcon = session.type === "claude" ? MessageSquare : Terminal;
        items.push({
          id: `session-${session.id}`,
          type: "session",
          label: session.name,
          description: session.type === "claude" ? "Claude Session" : "Terminal",
          icon: <SessionIcon className="w-4 h-4" style={{ color: session.color }} />,
          category: "Sessions",
          action: () => setActiveSession(activeProjectId, session.id),
        });
      });
    }

    return items;
  }, [projects, activeProjectId, getSessionsForProject, setActiveSession, setActiveProject, toolActions]);
}

export function filterCommandItems(items: CommandItem[], query: string): CommandItem[] {
  if (!query.trim()) {
    // Return all items, sorted by category: Tools > Projects > Sessions
    const categoryOrder: Record<string, number> = { Tools: 0, Projects: 1, Sessions: 2 };
    return [...items].sort((a, b) => {
      return (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99);
    });
  }

  const lowerQuery = query.toLowerCase();

  // Filter items by matching label, description, or keywords
  const filtered = items.filter((item) => {
    if (item.label.toLowerCase().includes(lowerQuery)) return true;
    if (item.description?.toLowerCase().includes(lowerQuery)) return true;
    if (item.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))) return true;
    return false;
  });

  // Sort by relevance: exact prefix match > contains match
  return filtered.sort((a, b) => {
    const aStartsWith = a.label.toLowerCase().startsWith(lowerQuery);
    const bStartsWith = b.label.toLowerCase().startsWith(lowerQuery);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    return 0;
  });
}
