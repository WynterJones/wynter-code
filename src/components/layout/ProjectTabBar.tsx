import { useState, useRef, useEffect } from "react";
import { Plus, Star, X, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconButton, Tooltip } from "@/components/ui";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/sessionStore";
import { ModelSelector } from "@/components/model/ModelSelector";
import { PermissionModeToggle } from "@/components/session";
import { SubscriptionButton } from "@/components/subscriptions";
import { cn } from "@/lib/utils";
import type { PermissionMode } from "@/types";

interface ProjectTabBarProps {
  onOpenSettings?: () => void;
  onOpenSubscriptions?: () => void;
}

export function ProjectTabBar({ onOpenSettings, onOpenSubscriptions }: ProjectTabBarProps) {
  const {
    projects,
    activeProjectId,
    setActiveProject,
    removeProject,
    addProject,
  } = useProjectStore();

  const {
    activeSessionId,
    getSession,
    updateSessionPermissionMode,
  } = useSessionStore();

  const activeId = activeProjectId ? activeSessionId.get(activeProjectId) : undefined;
  const activeSession = activeId ? getSession(activeId) : undefined;

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
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
  }, [projects]);

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

  const handleModeChange = (mode: PermissionMode) => {
    if (activeId) {
      updateSessionPermissionMode(activeId, mode);
    }
  };

  const handleDoubleClick = async () => {
    const window = getCurrentWindow();
    const isMaximized = await window.isMaximized();
    if (isMaximized) {
      await window.unmaximize();
    } else {
      await window.maximize();
    }
  };

  const handleOpenProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Open Project Folder",
      });

      if (selected && typeof selected === "string") {
        addProject(selected);
      }
    } catch (error) {
      console.error("Failed to open folder dialog:", error);
    }
  };

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
      className="flex items-center h-11 bg-bg-primary border-b border-border select-none"
    >
      {/* Traffic light spacer for macOS */}
      <div
        data-tauri-drag-region
        className="w-20 h-full flex-shrink-0 flex items-center justify-end pr-2"
      >
        {/* App icon or other controls can go here */}
      </div>

      {/* Project Tabs */}
      <div
        ref={scrollContainerRef}
        data-tauri-drag-region
        className="flex items-center flex-1 gap-0.5 overflow-x-auto scrollbar-none h-full"
      >
        {projects.map((project) => {
          const isActive = activeProjectId === project.id;
          return (
            <div
              key={project.id}
              onClick={() => setActiveProject(project.id)}
              className={cn(
                "group relative flex items-center gap-2 px-4 h-full cursor-pointer transition-colors min-w-0 flex-shrink-0",
                "border-r border-border/50",
                isActive
                  ? "bg-bg-secondary text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50"
              )}
            >
              {/* Favorite indicator */}
              {project.isFavorite && (
                <Star
                  className="w-3 h-3 text-accent-yellow flex-shrink-0"
                  fill="currentColor"
                />
              )}

              <span className="truncate text-sm max-w-[140px]">{project.name}</span>

              {/* Close button - always show on hover, or if active */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeProject(project.id);
                }}
                className={cn(
                  "p-0.5 rounded hover:bg-bg-hover transition-opacity ml-1",
                  "text-text-secondary hover:text-text-primary",
                  isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Active indicator line */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll buttons */}
      <div className="flex items-center border-l border-border h-full">
        <button
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className={cn(
            "p-1.5 h-full transition-colors",
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
            "p-1.5 h-full transition-colors",
            canScrollRight
              ? "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              : "text-text-secondary/30 cursor-not-allowed"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* New Project Button */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content="Open Project">
          <IconButton size="sm" onClick={handleOpenProject}>
            <Plus className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>

      {/* Right side controls */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 px-3 h-full border-l border-border"
      >
        <ModelSelector />
        {onOpenSubscriptions && (
          <SubscriptionButton onOpenManage={onOpenSubscriptions} />
        )}
        {activeSession && (
          <PermissionModeToggle
            mode={activeSession.permissionMode || "default"}
            onChange={handleModeChange}
          />
        )}
        <Tooltip content="Settings" side="bottom">
          <IconButton size="sm" onClick={onOpenSettings}>
            <Settings className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
