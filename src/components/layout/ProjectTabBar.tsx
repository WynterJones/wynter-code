import { useState, useRef, useEffect } from "react";
import { Plus, X, Settings, ChevronLeft, ChevronRight, FolderOpen, Moon, FolderSearch } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { IconButton, Tooltip } from "@/components/ui";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { SubscriptionButton } from "@/components/subscriptions";
import { FileBrowserPopup, ImageAttachment } from "@/components/files/FileBrowserPopup";
import { cn } from "@/lib/utils";
import { useMeditationStore } from "@/stores/meditationStore";

const PROJECT_COLORS = [
  "#cba6f7", // Purple
  "#89b4fa", // Blue
  "#a6e3a1", // Green
  "#f9e2af", // Yellow
  "#fab387", // Orange
  "#f38ba8", // Red/Pink
  "#94e2d5", // Teal
  "#cdd6f4", // White-ish
];

interface DropdownPosition {
  top: number;
  left: number;
}

interface ProjectTabBarProps {
  onOpenSettings?: () => void;
  onOpenSubscriptions?: () => void;
  onSendToPrompt?: (image: ImageAttachment) => void;
  requestImageBrowser?: boolean;
  onImageBrowserOpened?: () => void;
}

export function ProjectTabBar({
  onOpenSettings,
  onOpenSubscriptions,
  onSendToPrompt,
  requestImageBrowser,
  onImageBrowserOpened,
}: ProjectTabBarProps) {
  const {
    projects,
    activeProjectId,
    setActiveProject,
    removeProject,
    addProject,
    updateProjectColor,
    getProject,
  } = useProjectStore();

  const isMeditating = useMeditationStore((s) => s.isActive);
  const setMeditationActive = useMeditationStore((s) => s.setActive);

  const defaultBrowsePath = useSettingsStore((s) => s.defaultBrowsePath);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [colorPickerProjectId, setColorPickerProjectId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [fileBrowserMode, setFileBrowserMode] = useState<"selectProject" | "browse">("selectProject");
  const [fileBrowserInitialPath, setFileBrowserInitialPath] = useState<string | undefined>(undefined);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const activeProject = activeProjectId ? getProject(activeProjectId) : undefined;

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setColorPickerProjectId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle external request to open file browser for images
  useEffect(() => {
    if (requestImageBrowser) {
      handleBrowseFiles();
      onImageBrowserOpened?.();
    }
  }, [requestImageBrowser]);

  const handleIconClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (colorPickerProjectId === projectId) {
      setColorPickerProjectId(null);
    } else {
      const button = e.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
      setColorPickerProjectId(projectId);
    }
  };

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
    setFileBrowserMode("selectProject");
    // For opening projects: use default path if set, else home directory
    if (defaultBrowsePath) {
      setFileBrowserInitialPath(defaultBrowsePath);
    } else {
      try {
        const homeDir = await invoke<string>("get_home_dir");
        setFileBrowserInitialPath(homeDir);
      } catch {
        setFileBrowserInitialPath(undefined);
      }
    }
    setShowFileBrowser(true);
  };

  const handleBrowseFiles = async () => {
    setFileBrowserMode("browse");
    // For browsing: use current project if available, else default path, else home
    if (activeProject?.path) {
      setFileBrowserInitialPath(activeProject.path);
    } else if (defaultBrowsePath) {
      setFileBrowserInitialPath(defaultBrowsePath);
    } else {
      try {
        const homeDir = await invoke<string>("get_home_dir");
        setFileBrowserInitialPath(homeDir);
      } catch {
        setFileBrowserInitialPath(undefined);
      }
    }
    setShowFileBrowser(true);
  };

  const handleSelectProject = (path: string) => {
    addProject(path);
    setShowFileBrowser(false);
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
              onClick={() => {
                setActiveProject(project.id);
                setMeditationActive(false);
              }}
              className={cn(
                "group relative flex items-center gap-2 px-4 h-full cursor-pointer transition-colors min-w-0 flex-shrink-0",
                "border-r border-border/50",
                isActive
                  ? "bg-bg-secondary text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50"
              )}
            >
              {/* Project color indicator - only show when active */}
              {isActive && project.color && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: project.color }}
                />
              )}

              {/* Project icon with color picker */}
              <div className="relative" ref={colorPickerProjectId === project.id ? colorPickerRef : null}>
                <button
                  onClick={(e) => handleIconClick(e, project.id)}
                  className="p-0.5 rounded hover:bg-bg-tertiary transition-colors"
                >
                  <FolderOpen
                    className="w-3.5 h-3.5"
                    style={{ color: project.color || "currentColor" }}
                  />
                </button>

                {/* Color picker dropdown */}
                {colorPickerProjectId === project.id && (
                  <div
                    className="fixed p-3 bg-bg-secondary border border-border rounded-lg shadow-xl z-[9999] min-w-[140px]"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                  >
                    <div className="text-xs text-text-secondary mb-2 font-medium">Project Color</div>
                    <div className="grid grid-cols-4 gap-2">
                      {PROJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProjectColor(project.id, color);
                            setColorPickerProjectId(null);
                          }}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                            project.color === color
                              ? "border-white ring-2 ring-accent/50"
                              : "border-transparent hover:border-white/50"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    {project.color && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateProjectColor(project.id, "");
                          setColorPickerProjectId(null);
                        }}
                        className="w-full mt-2 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
                      >
                        Remove color
                      </button>
                    )}
                  </div>
                )}
              </div>

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

      {/* Meditation Mode */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content={isMeditating ? "Exit Meditation" : "Meditation Mode"}>
          <IconButton
            size="sm"
            onClick={() => setMeditationActive(!isMeditating)}
            className={cn(
              isMeditating && "text-accent bg-accent/10"
            )}
          >
            <Moon className={cn("w-4 h-4", isMeditating && "fill-accent")} />
          </IconButton>
        </Tooltip>
      </div>

      {/* Browse Files */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content="Browse Files">
          <IconButton size="sm" onClick={handleBrowseFiles}>
            <FolderSearch className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>

      {/* Right side controls */}
      <div
        data-tauri-drag-region
        className={cn(
          "flex items-center gap-2 px-3 h-full border-l border-border transition-opacity duration-500",
          isMeditating && "opacity-30 hover:opacity-100"
        )}
      >
        {onOpenSubscriptions && (
          <SubscriptionButton onOpenManage={onOpenSubscriptions} />
        )}
        <Tooltip content="Settings" side="bottom">
          <IconButton size="sm" onClick={onOpenSettings}>
            <Settings className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>

      {/* File Browser Popup */}
      <FileBrowserPopup
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
        initialPath={fileBrowserInitialPath}
        mode={fileBrowserMode}
        onSelectProject={handleSelectProject}
        onSendToPrompt={onSendToPrompt}
      />
    </div>
  );
}
