import { useState, useRef, useEffect } from "react";
import { Plus, MessageSquare, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton, Tooltip } from "@/components/ui";
import { useSessionStore } from "@/stores/sessionStore";
import { cn } from "@/lib/utils";

interface DropdownPosition {
  top: number;
  left: number;
}

interface SessionTabBarProps {
  projectId: string;
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

export function SessionTabBar({ projectId }: SessionTabBarProps) {
  const {
    getSessionsForProject,
    activeSessionId,
    setActiveSession,
    createSession,
    removeSession,
    updateSessionName,
    updateSessionColor,
  } = useSessionStore();

  const sessions = getSessionsForProject(projectId);
  const activeId = activeSessionId.get(projectId);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [colorPickerSessionId, setColorPickerSessionId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const colorPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
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
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setColorPickerSessionId(null);
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

  return (
    <div className="flex items-center h-9 bg-bg-primary border-b border-border">
      {/* Session tabs container */}
      <div
        ref={scrollContainerRef}
        className="flex items-center flex-1 overflow-x-auto scrollbar-none"
      >
        {sessions.map((session, index) => (
          <div
            key={session.id}
            onClick={() => setActiveSession(projectId, session.id)}
            className={cn(
              "group flex items-center gap-2 px-4 h-9 cursor-pointer transition-colors relative flex-shrink-0",
              "border-r border-border/50",
              activeId === session.id
                ? "bg-bg-secondary text-text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50"
            )}
          >
            {/* Session color indicator */}
            {session.color && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: session.color }}
              />
            )}

            {/* Session icon with color picker */}
            <div className="relative" ref={colorPickerSessionId === session.id ? colorPickerRef : null}>
              <button
                onClick={(e) => handleIconClick(e, session.id)}
                className="p-0.5 rounded hover:bg-bg-tertiary transition-colors"
              >
                <MessageSquare
                  className="w-3.5 h-3.5"
                  style={{ color: session.color || "currentColor" }}
                />
              </button>

              {/* Color picker dropdown - rendered in portal position */}
              {colorPickerSessionId === session.id && (
                <div
                  className="fixed p-3 bg-bg-secondary border border-border rounded-lg shadow-xl z-[9999] min-w-[140px]"
                  style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                >
                  <div className="text-xs text-text-secondary mb-2 font-medium">Session Color</div>
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
                            : "border-transparent hover:border-white/50"
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
                  handleStartEditing(session.id, session.name || `Session ${index + 1}`);
                }}
              >
                {session.name || `Session ${index + 1}`}
              </span>
            )}

            {/* Edit button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartEditing(session.id, session.name || `Session ${index + 1}`);
              }}
              className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-bg-primary/50 text-text-secondary hover:text-accent transition-opacity"
            >
              <Pencil className="w-3 h-3" />
            </button>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeSession(projectId, session.id);
              }}
              className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-bg-primary/50 text-text-secondary hover:text-accent-red transition-opacity"
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
        ))}
      </div>

      {/* Scroll buttons */}
      <div className="flex items-center border-l border-border">
        <button
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className={cn(
            "p-1.5 transition-colors",
            canScrollLeft
              ? "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              : "text-text-secondary/30 cursor-not-allowed"
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
              : "text-text-secondary/30 cursor-not-allowed"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="border-l border-border px-2">
        <Tooltip content="New Session">
          <IconButton size="sm" onClick={() => createSession(projectId)}>
            <Plus className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
