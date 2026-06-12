import { useSessionStore } from "@/stores/sessionStore";
import { useTerminalStore } from "@/stores/terminalStore";

/**
 * Launch the interactive Claude Code TUI in a PTY-backed terminal session.
 *
 * This runs the real `claude` CLI (full TUI) inside the project shell, so it
 * authenticates with the user's Claude subscription exactly like a normal
 * terminal would. The command is queued and executed once the PTY is ready.
 */
export function createClaudeTuiSession(projectId: string): string {
  const sessionId = useSessionStore
    .getState()
    .createSession(projectId, "terminal", undefined, "claude", "Claude");
  useTerminalStore.getState().queueCommand(sessionId, "claude");
  return sessionId;
}

/**
 * Launch the interactive Codex TUI in a PTY-backed terminal session,
 * authenticated via the user's ChatGPT login (~/.codex/auth.json).
 */
export function createCodexTuiSession(projectId: string): string {
  const sessionId = useSessionStore
    .getState()
    .createSession(projectId, "terminal", undefined, "codex", "Codex");
  useTerminalStore.getState().queueCommand(sessionId, "codex");
  return sessionId;
}
