import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Terminal,
  StopCircle,
  Tractor,
  Waypoints,
  FolderSearch,
  Play,
} from "lucide-react";
import { Tooltip, TabContextMenu } from "@/components/ui";
import { useSessionStore } from "@/stores/sessionStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { claudeService } from "@/services/claude";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

interface DropdownPosition {
  top: number;
  left: number;
}

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  sessionId: string | null;
}

interface SessionTabBarProps {
  projectId: string;
  hasBeads?: boolean;
  onOpenFarmwork?: () => void;
  onOpenBeads?: () => void;
  onBrowseFiles?: () => void;
  onOpenLivePreview?: () => void;
}

export function SessionTabBar({
  projectId,
  hasBeads,
  onOpenFarmwork,
  onOpenBeads,
  onBrowseFiles,
  onOpenLivePreview,
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

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    sessionId: null,
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const newDropdownRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const closeConfirmRef = useRef<HTMLDivElement>(null);

  const contextMenuSession = contextMenu.sessionId
    ? sessions.find((s) => s.id === contextMenu.sessionId)
    : undefined;

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
    function handleClickOutside(event: MouseEvent) {
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

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const tabElement = e.currentTarget as HTMLElement;
    const rect = tabElement.getBoundingClientRect();
    setContextMenu({
      isOpen: true,
      position: { x: rect.left, y: rect.bottom + 4 },
      sessionId,
    });
  };

  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
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
        await claudeService.stopSession(sessionId);
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
              onContextMenu={(e) => handleContextMenu(e, session.id)}
              className={cn(
                "group flex items-center gap-1.5 px-2 h-9 cursor-pointer transition-colors relative w-[200px] min-w-[140px] max-w-[200px] flex-shrink",
                "border-r border-border/50",
                activeId === session.id
                  ? "bg-bg-secondary text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50",
              )}
            >
              {/* Session color indicator - show color when has color, subtle border when no color */}
              {activeId === session.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: session.color || "var(--border)" }}
                />
              )}

              {/* Session icon */}
              <div className="flex-shrink-0">
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
              <span className="text-sm truncate flex-1 min-w-0">
                {session.name || `Session ${index + 1}`}
              </span>

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

        {/* Live Preview */}
        <Tooltip content="Live Preview">
          <button
            onClick={onOpenLivePreview}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <Play className="w-4 h-4" />
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

      {/* Context Menu for Session Customization */}
      {contextMenuSession && (
        <TabContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          onClose={closeContextMenu}
          name={contextMenuSession.name}
          color={contextMenuSession.color}
          onUpdateName={(name) => {
            if (contextMenu.sessionId) {
              updateSessionName(contextMenu.sessionId, name);
            }
          }}
          onUpdateIcon={() => {}}
          onUpdateColor={(color) => {
            if (contextMenu.sessionId) {
              updateSessionColor(contextMenu.sessionId, color);
            }
          }}
          showIconPicker={false}
        />
      )}
    </div>
  );
}
