import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  MessageSquare,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Terminal,
  StopCircle,
  Tractor,
  Waypoints,
  FolderSearch,
} from "lucide-react";
import { Tooltip } from "@/components/ui";
import { useSessionStore } from "@/stores/sessionStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { claudeService } from "@/services/claude";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

interface DropdownPosition {
  top: number;
  left: number;
}

interface SessionTabBarProps {
  projectId: string;
  hasBeads?: boolean;
  onOpenFarmwork?: () => void;
  onOpenBeads?: () => void;
  onBrowseFiles?: () => void;
}

const SESSION_COLORS = [
  "#cba6f7", // Purple
  "#89b4fa", // Blue
  "#a6e3a1", // Green
  "#f9e2af", // Yellow
  "#fab387", // Orange
  "#f38ba8", // Red/Pink
  "#94e2d5", // Teal
  "#cdd6f4", // White-ish
];

export function SessionTabBar({
  projectId,
  hasBeads,
  onOpenFarmwork,
  onOpenBeads,
  onBrowseFiles
}: SessionTabBarProps) {
  const {
    getSessionsForProject,
    activeSessionId,
    setActiveSession,
    createSession,
    removeSession,
    updateSessionName,
    updateSessionColor,
    getStreamingState,
    finishStreaming,
  } = useSessionStore();
  const { getSessionPtyId } = useTerminalStore();

  const sessions = getSessionsForProject(projectId);
  const activeId = activeSessionId.get(projectId);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [colorPickerSessionId, setColorPickerSessionId] = useState<
    string | null
  >(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({
    top: 0,
    left: 0,
  });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [newDropdownPosition, setNewDropdownPosition] =
    useState<DropdownPosition>({ top: 0, left: 0 });
  const [closeConfirmSessionId, setCloseConfirmSessionId] = useState<
    string | null
  >(null);
  const [closeConfirmPosition, setCloseConfirmPosition] =
    useState<DropdownPosition>({ top: 0, left: 0 });

  const colorPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const newDropdownRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const closeConfirmRef = useRef<HTMLDivElement>(null);

  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", updateScrollButtons);
      const resizeObserver = new ResizeObserver(updateScrollButtons);
      resizeObserver.observe(container);
      return () => {
        container.removeEventListener("scroll", updateScrollButtons);
        resizeObserver.disconnect();
      };
    }
  }, [sessions]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -150, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 150, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (editingSessionId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSessionId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      ) {
        setColorPickerSessionId(null);
      }
      if (
        newDropdownRef.current &&
        !newDropdownRef.current.contains(event.target as Node) &&
        plusButtonRef.current &&
        !plusButtonRef.current.contains(event.target as Node)
      ) {
        setShowNewDropdown(false);
      }
      if (
        closeConfirmRef.current &&
        !closeConfirmRef.current.contains(event.target as Node)
      ) {
        setCloseConfirmSessionId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStartEditing = (sessionId: string, currentName: string) => {
    setEditingSessionId(sessionId);
    setEditingName(currentName);
  };

  const handleFinishEditing = () => {
    if (editingSessionId && editingName.trim()) {
      updateSessionName(editingSessionId, editingName.trim());
    }
    setEditingSessionId(null);
    setEditingName("");
  };

  const handleIconClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (colorPickerSessionId === sessionId) {
      setColorPickerSessionId(null);
    } else {
      const button = e.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
      setColorPickerSessionId(sessionId);
    }
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    setNewDropdownPosition({
      top: rect.bottom + 8,
      left: rect.right - 160,
    });
    setShowNewDropdown(!showNewDropdown);
  };

  const handleCreateSession = (type: "claude" | "terminal") => {
    createSession(projectId, type);
    setShowNewDropdown(false);
  };

  const handleSessionClose = useCallback(
    async (e: React.MouseEvent, sessionId: string, sessionType: string) => {
      e.stopPropagation();

      // For terminal sessions, check if PTY is active
      if (sessionType === "terminal") {
        const ptyId = getSessionPtyId(sessionId);
        if (ptyId) {
          try {
            const isActive = await invoke<boolean>("is_pty_active", { ptyId });
            if (isActive) {
              const button = e.currentTarget as HTMLElement;
              const rect = button.getBoundingClientRect();
              setCloseConfirmPosition({
                top: rect.bottom + 8,
                left: rect.left - 100,
              });
              setCloseConfirmSessionId(sessionId);
              return;
            }
          } catch {
            // If check fails, just close
          }
        }
      }

      removeSession(projectId, sessionId);
    },
    [getSessionPtyId, projectId, removeSession],
  );

  const handleConfirmSessionClose = useCallback(() => {
    if (closeConfirmSessionId) {
      removeSession(projectId, closeConfirmSessionId);
      setCloseConfirmSessionId(null);
    }
  }, [closeConfirmSessionId, projectId, removeSession]);

  const handleStopClaudeSession = useCallback(
    async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      try {
        await claudeService.terminateSession(sessionId);
        finishStreaming(sessionId);
      } catch (error) {
        console.error("Failed to stop Claude session:", error);
      }
    },
    [finishStreaming],
  );

  return (
    <div
      className="flex items-center h-9 bg-bg-primary border-b border-border"
      data-tauri-drag-region
    >
      {/* Session tabs container */}
      <div
        ref={scrollContainerRef}
        id="sessionToolbar"
        className="flex items-center flex-1 overflow-x-auto scrollbar-none"
        data-tauri-drag-region
      >
        {sessions.length === 0 ? (
          <span
            className="px-4 text-sm text-text-secondary/50 italic"
            data-tauri-drag-region
          >
            Add a new session to start working...
          </span>
        ) : (
          sessions.map((session, index) => (
            <div
              key={session.id}
              onClick={() => setActiveSession(projectId, session.id)}
              className={cn(
                "group flex items-center gap-1.5 px-2 h-9 cursor-pointer transition-colors relative min-w-[120px] max-w-[200px] flex-shrink-0",
                "border-r border-border/50",
                activeId === session.id
                  ? "bg-bg-secondary text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50",
              )}
            >
              {/* Session color indicator - only show when active */}
              {activeId === session.id && session.color && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: session.color }}
                />
              )}

              {/* Session icon with color picker */}
              <div
                className="relative flex-shrink-0"
                ref={
                  colorPickerSessionId === session.id ? colorPickerRef : null
                }
              >
                <button
                  onClick={(e) => handleIconClick(e, session.id)}
                  className="p-0.5 rounded hover:bg-bg-tertiary transition-colors"
                >
                  {session.type === "terminal" ? (
                    <Terminal
                      className="w-3.5 h-3.5"
                      style={{ color: session.color || "currentColor" }}
                    />
                  ) : (
                    <MessageSquare
                      className="w-3.5 h-3.5"
                      style={{ color: session.color || "currentColor" }}
                    />
                  )}
                </button>

                {/* Color picker dropdown - rendered in portal position */}
                {colorPickerSessionId === session.id && (
                  <div
                    className="fixed p-3 bg-bg-secondary border border-border rounded-lg shadow-xl z-[9999] min-w-[140px]"
                    style={{
                      top: dropdownPosition.top,
                      left: dropdownPosition.left,
                    }}
                  >
                    <div className="text-xs text-text-secondary mb-2 font-medium">
                      Session Color
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {SESSION_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSessionColor(session.id, color);
                            setColorPickerSessionId(null);
                          }}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                            session.color === color
                              ? "border-white ring-2 ring-accent/50"
                              : "border-transparent hover:border-white/50",
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    {session.color && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSessionColor(session.id, "");
                          setColorPickerSessionId(null);
                        }}
                        className="w-full mt-2 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
                      >
                        Remove color
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Streaming indicator - pulsing green dot */}
              {session.type === "claude" &&
                getStreamingState(session.id)?.isStreaming && (
                  <div className="relative flex items-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <div className="absolute w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
                  </div>
                )}

              {/* Session name */}
              {editingSessionId === session.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleFinishEditing}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFinishEditing();
                    if (e.key === "Escape") {
                      setEditingSessionId(null);
                      setEditingName("");
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm bg-bg-tertiary border border-border px-1 w-24 outline-none focus:border-accent"
                />
              ) : (
                <span
                  className="text-sm truncate max-w-[100px]"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartEditing(
                      session.id,
                      session.name || `Session ${index + 1}`,
                    );
                  }}
                >
                  {session.name || `Session ${index + 1}`}
                </span>
              )}

              {/* Action buttons - overlay with gradient fade on hover */}
              <div
                className={cn(
                  "absolute inset-y-0 right-0 flex items-center pr-1 pl-4",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                )}
                style={{
                  background: activeId === session.id
                    ? "linear-gradient(to right, transparent 0%, var(--bg-secondary) 30%)"
                    : "linear-gradient(to right, transparent 0%, var(--bg-primary) 30%)",
                }}
              >
                {/* Edit button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEditing(
                      session.id,
                      session.name || `Session ${index + 1}`,
                    );
                  }}
                  className="p-0.5 rounded hover:bg-bg-hover/80 text-text-secondary hover:text-accent transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>

                {/* Stop button for streaming Claude sessions */}
                {session.type === "claude" &&
                  getStreamingState(session.id)?.isStreaming && (
                    <button
                      onClick={(e) => handleStopClaudeSession(e, session.id)}
                      className="p-0.5 rounded hover:bg-bg-hover/80 text-accent-red transition-colors"
                      title="Stop streaming"
                    >
                      <StopCircle className="w-3 h-3" />
                    </button>
                  )}

                {/* Close button */}
                <button
                  onClick={(e) => handleSessionClose(e, session.id, session.type)}
                  className="p-0.5 rounded hover:bg-bg-hover/80 text-text-secondary hover:text-accent-red transition-colors"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Toolbar buttons */}
      <div className="flex items-center h-full border-l border-border gap-1 px-2">
        {/* Farmwork */}
        <Tooltip content="Farmwork">
          <button
            onClick={onOpenFarmwork}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <Tractor className="w-4 h-4 text-green-500" />
          </button>
        </Tooltip>

        {/* Beads Tracker */}
        {hasBeads && (
          <Tooltip content="Beads Tracker">
            <button
              onClick={onOpenBeads}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <Waypoints className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        {/* Browse Files */}
        <Tooltip content="Browse Files">
          <button
            onClick={onBrowseFiles}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <FolderSearch className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {/* Scroll buttons */}
      <div className="flex items-center h-full border-l border-border">
        <button
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className={cn(
            "p-1.5 transition-colors",
            canScrollLeft
              ? "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              : "text-text-secondary/30 cursor-not-allowed",
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={scrollRight}
          disabled={!canScrollRight}
          className={cn(
            "p-1.5 transition-colors",
            canScrollRight
              ? "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              : "text-text-secondary/30 cursor-not-allowed",
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="h-full flex items-center border-l border-border px-2 relative">
        <Tooltip content="New Session">
          <button
            ref={plusButtonRef}
            onClick={handlePlusClick}
            className="p-1.5 rounded-md border border-border bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* New session dropdown */}
        {showNewDropdown && (
          <div
            ref={newDropdownRef}
            className="fixed p-1 bg-bg-secondary border border-border rounded-lg shadow-xl z-[9999] min-w-[160px]"
            style={{
              top: newDropdownPosition.top,
              left: newDropdownPosition.left,
            }}
          >
            <button
              onClick={() => handleCreateSession("claude")}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              New Session
            </button>
            <button
              onClick={() => handleCreateSession("terminal")}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
            >
              <Terminal className="w-4 h-4" />
              New Terminal
            </button>
          </div>
        )}
      </div>

      {/* Close confirmation dropdown */}
      {closeConfirmSessionId && (
        <div
          ref={closeConfirmRef}
          className="fixed p-3 bg-bg-secondary border border-border rounded-lg shadow-xl z-[9999] min-w-[200px]"
          style={{
            top: closeConfirmPosition.top,
            left: closeConfirmPosition.left,
          }}
        >
          <div className="text-xs text-text-primary font-medium mb-2">
            Close Terminal?
          </div>
          <p className="text-xs text-text-secondary mb-3">
            There may be a running process. Close anyway?
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setCloseConfirmSessionId(null)}
              className="px-2 py-1 text-xs rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSessionClose}
              className="px-2 py-1 text-xs rounded bg-accent-red/20 hover:bg-accent-red/30 text-accent-red transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
