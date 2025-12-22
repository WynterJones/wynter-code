import { useEffect, useCallback } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/sessionStore";

export interface KeyboardShortcut {
  key: string;
  modifiers: ("ctrl" | "meta" | "shift" | "alt")[];
  description: string;
  category: "navigation" | "sessions" | "ui" | "editing";
  action: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { key: "1-9", modifiers: ["ctrl", "meta"], description: "Switch to project tab 1-9", category: "navigation", action: "switchProject" },
  { key: "[", modifiers: ["ctrl", "meta"], description: "Previous session", category: "navigation", action: "prevSession" },
  { key: "]", modifiers: ["ctrl", "meta"], description: "Next session", category: "navigation", action: "nextSession" },

  // Sessions
  { key: "t", modifiers: ["ctrl", "meta"], description: "New session", category: "sessions", action: "newSession" },
  { key: "w", modifiers: ["ctrl", "meta", "shift"], description: "Close current session", category: "sessions", action: "closeSession" },

  // UI
  { key: "k", modifiers: ["ctrl", "meta"], description: "Focus prompt input", category: "ui", action: "focusPrompt" },
  { key: "b", modifiers: ["ctrl", "meta"], description: "Toggle sidebar", category: "ui", action: "toggleSidebar" },
  { key: ",", modifiers: ["ctrl", "meta"], description: "Open settings", category: "ui", action: "openSettings" },
  { key: "e", modifiers: ["ctrl", "meta"], description: "Toggle file browser", category: "ui", action: "toggleFileBrowser" },
  { key: "/", modifiers: ["ctrl", "meta"], description: "Show keyboard shortcuts", category: "ui", action: "showShortcuts" },

  // Editing
  { key: "Enter", modifiers: [], description: "Send prompt", category: "editing", action: "sendPrompt" },
  { key: "Enter", modifiers: ["shift"], description: "New line in prompt", category: "editing", action: "newLine" },
  { key: "Escape", modifiers: [], description: "Close popup / Cancel", category: "editing", action: "escape" },
];

interface UseKeyboardShortcutsOptions {
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onToggleFileBrowser: () => void;
  onShowShortcuts: () => void;
  onFocusPrompt: () => void;
}

export function useKeyboardShortcuts({
  onOpenSettings,
  onToggleSidebar,
  onToggleFileBrowser,
  onShowShortcuts,
  onFocusPrompt,
}: UseKeyboardShortcutsOptions) {
  const { projects, activeProjectId, setActiveProject } = useProjectStore();
  const { createSession, removeSession, getSessionsForProject, getActiveSession, setActiveSession } = useSessionStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMod = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;

    // Ctrl/Cmd + 1-9: Switch project tabs
    if (isMod && !isShift && e.key >= "1" && e.key <= "9") {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      if (projects[index]) {
        setActiveProject(projects[index].id);
      }
      return;
    }

    // Ctrl/Cmd + T: New session
    if (isMod && !isShift && e.key.toLowerCase() === "t") {
      e.preventDefault();
      if (activeProjectId) {
        createSession(activeProjectId);
      }
      return;
    }

    // Ctrl/Cmd + Shift + W: Close current session
    if (isMod && isShift && e.key.toLowerCase() === "w") {
      e.preventDefault();
      if (activeProjectId) {
        const activeSession = getActiveSession(activeProjectId);
        if (activeSession) {
          removeSession(activeProjectId, activeSession.id);
        }
      }
      return;
    }

    // Ctrl/Cmd + K: Focus prompt input
    if (isMod && !isShift && e.key.toLowerCase() === "k") {
      e.preventDefault();
      onFocusPrompt();
      return;
    }

    // Ctrl/Cmd + B: Toggle sidebar
    if (isMod && !isShift && e.key.toLowerCase() === "b") {
      e.preventDefault();
      onToggleSidebar();
      return;
    }

    // Ctrl/Cmd + ,: Open settings
    if (isMod && !isShift && e.key === ",") {
      e.preventDefault();
      onOpenSettings();
      return;
    }

    // Ctrl/Cmd + E: Toggle file browser
    if (isMod && !isShift && e.key.toLowerCase() === "e") {
      e.preventDefault();
      onToggleFileBrowser();
      return;
    }

    // Ctrl/Cmd + /: Show keyboard shortcuts
    if (isMod && !isShift && e.key === "/") {
      e.preventDefault();
      onShowShortcuts();
      return;
    }

    // Ctrl/Cmd + [: Previous session
    if (isMod && !isShift && e.key === "[") {
      e.preventDefault();
      if (activeProjectId) {
        const sessions = getSessionsForProject(activeProjectId);
        const activeSession = getActiveSession(activeProjectId);
        if (activeSession && sessions.length > 1) {
          const currentIndex = sessions.findIndex(s => s.id === activeSession.id);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : sessions.length - 1;
          setActiveSession(activeProjectId, sessions[prevIndex].id);
        }
      }
      return;
    }

    // Ctrl/Cmd + ]: Next session
    if (isMod && !isShift && e.key === "]") {
      e.preventDefault();
      if (activeProjectId) {
        const sessions = getSessionsForProject(activeProjectId);
        const activeSession = getActiveSession(activeProjectId);
        if (activeSession && sessions.length > 1) {
          const currentIndex = sessions.findIndex(s => s.id === activeSession.id);
          const nextIndex = currentIndex < sessions.length - 1 ? currentIndex + 1 : 0;
          setActiveSession(activeProjectId, sessions[nextIndex].id);
        }
      }
      return;
    }
  }, [
    projects,
    activeProjectId,
    setActiveProject,
    createSession,
    removeSession,
    getSessionsForProject,
    getActiveSession,
    setActiveSession,
    onOpenSettings,
    onToggleSidebar,
    onToggleFileBrowser,
    onShowShortcuts,
    onFocusPrompt,
  ]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const parts: string[] = [];

  if (shortcut.modifiers.includes("ctrl") || shortcut.modifiers.includes("meta")) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (shortcut.modifiers.includes("shift")) {
    parts.push(isMac ? "⇧" : "Shift");
  }
  if (shortcut.modifiers.includes("alt")) {
    parts.push(isMac ? "⌥" : "Alt");
  }

  // Format key nicely
  let key = shortcut.key;
  if (key === "Enter") key = "↵";
  else if (key === "Escape") key = "Esc";
  else if (key === "[") key = "[";
  else if (key === "]") key = "]";
  else if (key === ",") key = ",";
  else if (key === "/") key = "/";
  else key = key.toUpperCase();

  parts.push(key);

  return parts.join(isMac ? "" : " + ");
}
