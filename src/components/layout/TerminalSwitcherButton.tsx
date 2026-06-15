/**
 * TerminalSwitcherButton
 *
 * Toolbar button (terminal icon) that opens a small sticky popover listing
 * every open terminal-type session across all projects, grouped by project.
 * Clicking an entry jumps to it: activates the owning project and selects the
 * terminal session. Lets you hop between terminals in different projects
 * without leaving the current view.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal } from "lucide-react";
import { Tooltip } from "@/components/ui";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/sessionStore";
import { cn } from "@/lib/utils";

interface Position {
  top: number;
  left: number;
}

const POPOVER_WIDTH = 256;

export function TerminalSwitcherButton() {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  const sessionsMap = useSessionStore((s) => s.sessions);
  const activeSessionMap = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Group every open terminal session by its project.
  const groups = useMemo(
    () =>
      projects
        .map((project) => ({
          project,
          terminals: (sessionsMap.get(project.id) ?? []).filter(
            (s) => s.type === "terminal"
          ),
        }))
        .filter((g) => g.terminals.length > 0),
    [projects, sessionsMap]
  );
  const total = useMemo(
    () => groups.reduce((n, g) => n + g.terminals.length, 0),
    [groups]
  );

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 8,
        left: Math.max(8, rect.right - POPOVER_WIDTH),
      });
    }
    setOpen((o) => !o);
  };

  const jump = (projectId: string, sessionId: string) => {
    setActiveProject(projectId);
    setActiveSession(projectId, sessionId);
    setOpen(false);
  };

  return (
    <>
      <Tooltip content="Open Terminals">
        <button
          ref={buttonRef}
          onClick={toggle}
          className="relative p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <Terminal className={cn("w-4 h-4", total > 0 && "text-cyan-500")} />
          {total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full bg-cyan-500 text-white text-[9px] font-semibold leading-none">
              {total}
            </span>
          )}
        </button>
      </Tooltip>

      {open && (
        <div
          ref={popoverRef}
          className="fixed bg-bg-secondary border border-border rounded-lg shadow-xl z-[9999] dropdown-solid overflow-hidden"
          style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
        >
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">Open Terminals</span>
            <span className="text-[10px] text-text-secondary">{total}</span>
          </div>

          {total === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-text-secondary">
              No open terminals
            </div>
          ) : (
            <ScrollArea className="max-h-80" scrollbarVisibility="auto">
              <div className="p-1">
                {groups.map((g) => (
                  <div key={g.project.id} className="mb-1 last:mb-0">
                    <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: g.project.color ?? "var(--accent)" }}
                      />
                      <span className="text-[10px] font-medium uppercase tracking-wide text-text-secondary truncate">
                        {g.project.name}
                      </span>
                    </div>
                    {g.terminals.map((t) => {
                      const isActive =
                        activeProjectId === g.project.id &&
                        activeSessionMap.get(g.project.id) === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => jump(g.project.id, t.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                            isActive
                              ? "bg-accent/15 text-text-primary"
                              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                          )}
                        >
                          <Terminal className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{t.name?.trim() || "Terminal"}</span>
                          {isActive && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </>
  );
}
