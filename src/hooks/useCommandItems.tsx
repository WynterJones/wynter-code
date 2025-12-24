import { useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Folder, MessageSquare, Terminal } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/sessionStore";
import { TOOL_DEFINITIONS } from "@/components/tools";
import type { CommandItem } from "@/types";

function dispatchToolAction(actionKey: string) {
  if (actionKey === "openColorPicker") {
    invoke("start_color_picking_mode").catch((err) => {
      console.error("Failed to start color picking mode:", err);
    });
  } else {
    window.dispatchEvent(new CustomEvent("command-palette-tool", { detail: { action: actionKey } }));
  }
}

export function useCommandItems(): CommandItem[] {
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
        action: () => dispatchToolAction(tool.actionKey),
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

    // Add sessions from ALL projects
    projects.forEach((project) => {
      const sessions = getSessionsForProject(project.id);
      sessions.forEach((session, index) => {
        const SessionIcon = session.type === "claude" ? MessageSquare : Terminal;
        const sessionName = session.name || `Session ${index + 1}`;
        items.push({
          id: `session-${session.id}`,
          type: "session",
          label: sessionName,
          description: project.name,
          icon: <SessionIcon className="w-4 h-4" style={{ color: session.color }} />,
          keywords: [project.name, project.path],
          category: "Sessions",
          action: () => {
            // Switch to the project first if not active, then switch to the session
            if (activeProjectId !== project.id) {
              setActiveProject(project.id);
            }
            setActiveSession(project.id, session.id);
          },
        });
      });
    });

    return items;
  }, [projects, activeProjectId, getSessionsForProject, setActiveSession, setActiveProject]);
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
