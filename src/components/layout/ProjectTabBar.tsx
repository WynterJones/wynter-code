import { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  X,
  Settings,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Music,
  FolderPlus,
  Minus,
  Database,
  Search,
  Bot,
  Eye,
  Bookmark,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconButton, Tooltip, TabContextMenu } from "@/components/ui";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { SubscriptionButton } from "@/components/subscriptions";
import {
  FileBrowserPopup,
  ImageAttachment,
} from "@/components/files/FileBrowserPopup";
import {
  ToolsDropdown,
  PortManagerPopup,
  NodeModulesCleanerPopup,
  LocalhostTunnelPopup,
  SystemHealthPopup,
  LivePreviewPopup,
  EnvManagerPopup,
  ApiTesterPopup,
  ProjectTemplatesPopup,
  TestRunnerPopup,
  StorybookViewerPopup,
  BackgroundServicesPopup,
  DatabaseViewerPopup,
  OverwatchPopup,
  BeadsTrackerPopup,
  FaviconGeneratorPopup,
  FarmworkTycoonPopup,
  MiniGamePlayer,
  HomebrewManagerPopup,
} from "@/components/tools";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import { McpManagerPopup } from "@/components/tools/mcp-manager";
import { DevToolkitPopup } from "@/components/tools/dev-toolkit";
import { ClaudeCodeStatsPopup } from "@/components/tools/claude-code-stats";
import { LimitsMonitorPopup } from "@/components/tools/limits-monitor";
import { WebcamToolPopup } from "@/components/tools/webcam";
import { DomainToolsPopup } from "@/components/tools/domain-tools";
import { SeoToolsPopup } from "@/components/tools/seo-tools";
import { ScreenStudioPopup } from "@/components/tools/screen-studio";
import { GifRecorderPopup } from "@/components/tools/gif-recorder";
import { NetlifyFtpPopup } from "@/components/tools/netlify-ftp";
import { BookmarksPopup } from "@/components/tools/bookmarks";
import { ProjectSearchPopup } from "@/components/tools/project-search";
import { AutoBuildPopup } from "@/components/tools/auto-build";
import { SystemCleanerPopup } from "@/components/tools/system-cleaner";
import { useMcpStore, useSessionStore } from "@/stores";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import { cn } from "@/lib/utils";
import { useMeditationStore } from "@/stores/meditationStore";
import { useStorybookDetection } from "@/hooks/useStorybookDetection";
import { useJustfileDetection } from "@/hooks/useJustfileDetection";
import { useFarmworkDetection } from "@/hooks/useFarmworkDetection";
import { JustCommandManagerPopup } from "@/components/tools/just-command-manager";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { WorkspaceSelectorPopup } from "@/components/workspaces";
import type { Project } from "@/types";

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  projectId: string | null;
}

interface ProjectTabBarProps {
  onOpenSettings?: () => void;
  onOpenSubscriptions?: () => void;
  onSendToPrompt?: (image: ImageAttachment) => void;
  requestImageBrowser?: boolean;
  onImageBrowserOpened?: () => void;
}

interface SortableProjectTabProps {
  project: Project;
  isActive: boolean;
  isCompact: boolean;
  isDimmed: boolean;
  onSelect: () => void;
  onClose: () => void;
  onToggleMinimize: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function SortableProjectTab({
  project,
  isActive,
  isCompact,
  isDimmed,
  onSelect,
  onClose,
  onToggleMinimize,
  onContextMenu,
}: SortableProjectTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderIcon = () => {
    if (project.icon) {
      const IconComponent = LucideIcons[
        project.icon as keyof typeof LucideIcons
      ] as React.ComponentType<{
        className?: string;
        style?: React.CSSProperties;
      }>;
      if (IconComponent) {
        return (
          <IconComponent
            className={cn(isCompact ? "w-3 h-3" : "w-3.5 h-3.5")}
            style={{ color: project.color || "currentColor" }}
          />
        );
      }
    }
    return (
      <FolderOpen
        className={cn(isCompact ? "w-3 h-3" : "w-3.5 h-3.5")}
        style={{ color: project.color || "currentColor" }}
      />
    );
  };

  const isMinimized = project.minimized;

  const tabContent = (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (isMinimized) {
          onToggleMinimize();
        }
        onSelect();
      }}
      onContextMenu={onContextMenu}
      className={cn(
        "group relative flex items-center cursor-pointer transition-all w-[200px] min-w-[140px] max-w-[200px] flex-shrink",
        isMinimized
          ? cn(
              "px-2 gap-1 border-r border-border w-auto min-w-0 max-w-none",
              isCompact ? "h-9" : "h-11",
            )
          : isCompact
            ? "px-2 h-full gap-1.5 border-r border-border/50"
            : "px-2.5 h-full gap-1.5 border-r border-border/50",
        isActive
          ? "bg-bg-secondary text-text-primary"
          : cn(
              "hover:text-text-primary hover:bg-bg-secondary/50",
              isDimmed || isMinimized
                ? "text-text-secondary/50"
                : "text-text-secondary",
            ),
        isDragging && "opacity-50 z-50",
      )}
    >
      {/* Project color indicator - show color when has color, subtle border when no color */}
      {isActive && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: project.color || "var(--border)" }}
        />
      )}

      {/* Project icon */}
      <div className="flex-shrink-0">{renderIcon()}</div>

      {/* Project name - hidden when minimized */}
      {!isMinimized && (
        <span
          className={cn(
            "truncate flex-1 min-w-0",
            isCompact ? "text-xs" : "text-sm",
          )}
        >
          {project.name}
        </span>
      )}

      {/* Action buttons - overlay with gradient fade on hover */}
      {!isMinimized && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center pr-1 pl-4",
            "opacity-0 group-hover:opacity-100 transition-opacity",
          )}
          style={{
            background: isActive
              ? "linear-gradient(to right, transparent 0%, var(--bg-secondary) 30%)"
              : "linear-gradient(to right, transparent 0%, var(--bg-primary) 30%)",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMinimize();
            }}
            className={cn(
              "p-0.5 rounded hover:bg-bg-hover/80 transition-colors",
              "text-text-secondary hover:text-text-primary",
            )}
            title="Minimize"
          >
            <Minus className={cn(isCompact ? "w-3 h-3" : "w-3.5 h-3.5")} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={cn(
              "p-0.5 rounded hover:bg-bg-hover/80 transition-colors",
              "text-text-secondary hover:text-text-primary",
            )}
            title="Close"
          >
            <X className={cn(isCompact ? "w-3 h-3" : "w-3.5 h-3.5")} />
          </button>
        </div>
      )}
    </div>
  );

  if (isMinimized) {
    return (
      <div className="h-full flex items-center">
        <Tooltip content={project.name} side="bottom">
          {tabContent}
        </Tooltip>
      </div>
    );
  }

  return tabContent;
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
    updateProjectName,
    updateProjectColor,
    updateProjectIcon,
    toggleMinimized,
    reorderProjects,
    getProject,
  } = useProjectStore();

  const isMeditating = useMeditationStore((s) => s.isActive);
  const setMeditationActive = useMeditationStore((s) => s.setActive);

  const isAutoBuildOpen = useAutoBuildStore((s) => s.isPopupOpen);
  const isAutoBuildRunning = useAutoBuildStore((s) => s.status === "running");
  const openAutoBuildPopup = useAutoBuildStore((s) => s.openPopup);

  const {
    workspaces,
    activeWorkspaceId,
    migrateFromProjectStore,
    addProjectToWorkspace,
    getActiveWorkspace,
    setLastActiveProject,
  } = useWorkspaceStore();

  const defaultBrowsePath = useSettingsStore((s) => s.defaultBrowsePath);
  const compactProjectTabs = useSettingsStore((s) => s.compactProjectTabs);
  const dimInactiveProjects = useSettingsStore((s) => s.dimInactiveProjects);
  const userAvatar = useSettingsStore((s) => s.userAvatar);

  // Get the active workspace and filter projects
  const activeWorkspace = getActiveWorkspace();
  const workspaceProjectIds = activeWorkspace?.projectIds || [];
  const filteredProjects = useMemo(() => {
    if (!activeWorkspace) return projects; // Show all if no workspace
    return projects.filter((p) => workspaceProjectIds.includes(p.id));
  }, [projects, workspaceProjectIds, activeWorkspace]);

  // Migrate existing projects to workspace on first load
  useEffect(() => {
    if (workspaces.length === 0 && projects.length > 0) {
      migrateFromProjectStore(projects);
    }
  }, [workspaces.length, projects.length, migrateFromProjectStore]);

  // Restore last active project when switching workspaces
  useEffect(() => {
    if (activeWorkspace?.lastActiveProjectId) {
      // Only restore if the project exists and is in this workspace
      const projectExists = projects.some(
        (p) => p.id === activeWorkspace.lastActiveProjectId
      );
      if (projectExists && activeProjectId !== activeWorkspace.lastActiveProjectId) {
        setActiveProject(activeWorkspace.lastActiveProjectId);
      }
    } else if (activeWorkspace && activeWorkspace.projectIds.length > 0) {
      // If no last active, select first project in workspace
      const firstProjectId = activeWorkspace.projectIds[0];
      if (firstProjectId && activeProjectId !== firstProjectId) {
        setActiveProject(firstProjectId);
      }
    }
  }, [activeWorkspaceId]); // Only run when workspace changes

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [fileBrowserMode, setFileBrowserMode] = useState<
    "selectProject" | "browse"
  >("selectProject");
  const [fileBrowserInitialPath, setFileBrowserInitialPath] = useState<
    string | undefined
  >(undefined);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    projectId: null,
  });
  const [showPortManager, setShowPortManager] = useState(false);
  const [showNodeModulesCleaner, setShowNodeModulesCleaner] = useState(false);
  const [showTunnelManager, setShowTunnelManager] = useState(false);
  const [showSystemHealth, setShowSystemHealth] = useState(false);
  const [showHomebrewManager, setShowHomebrewManager] = useState(false);
  const [showSystemCleaner, setShowSystemCleaner] = useState(false);
  const [showOverwatch, setShowOverwatch] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [showApiTester, setShowApiTester] = useState(false);
  const [showProjectTemplates, setShowProjectTemplates] = useState(false);
  const [showTestRunner, setShowTestRunner] = useState(false);
  const [showStorybookViewer, setShowStorybookViewer] = useState(false);
  const [showBackgroundServices, setShowBackgroundServices] = useState(false);
  const [showDatabaseViewer, setShowDatabaseViewer] = useState(false);
  const [showBeadsTracker, setShowBeadsTracker] = useState(false);
  const [showFaviconGenerator, setShowFaviconGenerator] = useState(false);
  const [showDevToolkit, setShowDevToolkit] = useState(false);
  const [devToolkitInitialTool, setDevToolkitInitialTool] = useState<string | undefined>();
  const [showFarmworkTycoon, setShowFarmworkTycoon] = useState(false);
  const [showClaudeCodeStats, setShowClaudeCodeStats] = useState(false);
  const [showLimitsMonitor, setShowLimitsMonitor] = useState(false);
  const [showWebcamTool, setShowWebcamTool] = useState(false);
  const [showDomainTools, setShowDomainTools] = useState(false);
  const [domainToolsInitialTool, setDomainToolsInitialTool] = useState<string | undefined>();
  const [showSeoTools, setShowSeoTools] = useState(false);
  const [seoToolsInitialTool, setSeoToolsInitialTool] = useState<string | undefined>();
  const [showScreenStudio, setShowScreenStudio] = useState(false);
  const [showGifRecorder, setShowGifRecorder] = useState(false);
  const [showNetlifyFtp, setShowNetlifyFtp] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showProjectSearch, setShowProjectSearch] = useState(false);
  const [showJustCommandManager, setShowJustCommandManager] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { hasStorybook } = useStorybookDetection();
  const { hasJustfile } = useJustfileDetection();

  const activeProject = activeProjectId
    ? getProject(activeProjectId)
    : undefined;
  const contextMenuProject = contextMenu.projectId
    ? getProject(contextMenu.projectId)
    : undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const projectIds = useMemo(() => filteredProjects.map((p) => p.id), [filteredProjects]);

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
  }, [projects]);

  useEffect(() => {
    if (requestImageBrowser) {
      handleBrowseFiles();
      onImageBrowserOpened?.();
    }
  }, [requestImageBrowser]);

  // Listen for command palette tool actions
  useEffect(() => {
    const handleCommandPaletteTool = (e: CustomEvent<{ action: string; subToolId?: string }>) => {
      const { subToolId } = e.detail;
      switch (e.detail.action) {
        case "openLivePreview":
          setShowLivePreview(true);
          break;
        case "openPortManager":
          setShowPortManager(true);
          break;
        case "openNodeModulesCleaner":
          setShowNodeModulesCleaner(true);
          break;
        case "openLocalhostTunnel":
          setShowTunnelManager(true);
          break;
        case "openSystemHealth":
          setShowSystemHealth(true);
          break;
        case "openHomebrewManager":
          setShowHomebrewManager(true);
          break;
        case "openSystemCleaner":
          setShowSystemCleaner(true);
          break;
        case "openEnvManager":
          setShowEnvManager(true);
          break;
        case "openApiTester":
          setShowApiTester(true);
          break;
        case "openProjectTemplates":
          setShowProjectTemplates(true);
          break;
        case "openTestRunner":
          setShowTestRunner(true);
          break;
        case "openStorybookViewer":
          setShowStorybookViewer(true);
          break;
        case "openBackgroundServices":
          setShowBackgroundServices(true);
          break;
        case "openOverwatch":
          setShowOverwatch(true);
          break;
        case "openBeadsTracker":
          setShowBeadsTracker(true);
          break;
        case "openMcpManager":
          useMcpStore.getState().openPopup();
          break;
        case "openFaviconGenerator":
          setShowFaviconGenerator(true);
          break;
        case "openDevToolkit":
          setDevToolkitInitialTool(subToolId || undefined);
          setShowDevToolkit(true);
          break;
        case "openFarmworkTycoon":
          setShowFarmworkTycoon(true);
          break;
        case "openClaudeCodeStats":
          setShowClaudeCodeStats(true);
          break;
        case "openLimitsMonitor":
          setShowLimitsMonitor(true);
          break;
        case "openFloatingWebcam":
          setShowWebcamTool(true);
          break;
        case "openDomainTools":
          setDomainToolsInitialTool(subToolId || undefined);
          setShowDomainTools(true);
          break;
        case "openSeoTools":
          setSeoToolsInitialTool(subToolId || undefined);
          setShowSeoTools(true);
          break;
        case "openScreenStudio":
          setShowScreenStudio(true);
          break;
        case "openGifRecorder":
          setShowGifRecorder(true);
          break;
        case "openNetlifyFtp":
          setShowNetlifyFtp(true);
          break;
        case "openWebBackup":
          // Open settings to the backup tab
          window.dispatchEvent(new CustomEvent("open-settings", { detail: { tab: "backup" } }));
          break;
        case "openBookmarks":
          setShowBookmarks(true);
          break;
        case "openProjectSearch":
          setShowProjectSearch(true);
          break;
        case "openAutoBuild":
          openAutoBuildPopup();
          break;
        case "openMeditation":
          setMeditationActive(true);
          break;
        case "openDatabaseViewer":
          setShowDatabaseViewer(true);
          break;
        case "openFileFinder":
          handleBrowseFiles();
          break;
        case "openSubscriptions":
          onOpenSubscriptions?.();
          break;
        case "openFarmwork":
          setShowFarmworkTycoon(true);
          break;
      }
    };

    window.addEventListener(
      "command-palette-tool",
      handleCommandPaletteTool as EventListener,
    );
    return () => {
      window.removeEventListener(
        "command-palette-tool",
        handleCommandPaletteTool as EventListener,
      );
    };
  }, []);

  // Listen for tool actions from the launcher window (via Tauri event)
  useEffect(() => {
    interface LauncherToolPayload {
      action: string;
      subToolId?: string | null;
    }

    const unlisten = listen<LauncherToolPayload>("launcher-open-tool", (event) => {
      // Dispatch local event to trigger tool opening with optional subToolId
      window.dispatchEvent(
        new CustomEvent("command-palette-tool", {
          detail: {
            action: event.payload.action,
            subToolId: event.payload.subToolId,
          },
        })
      );
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // For now, reorder in projectStore - in future, reorder within workspace
      const oldGlobalIndex = projects.findIndex((p) => p.id === active.id);
      const newGlobalIndex = projects.findIndex((p) => p.id === over.id);
      reorderProjects(oldGlobalIndex, newGlobalIndex);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const tabElement = e.currentTarget as HTMLElement;
    const rect = tabElement.getBoundingClientRect();
    setContextMenu({
      isOpen: true,
      position: { x: rect.left, y: rect.bottom + 4 },
      projectId,
    });
  };

  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
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
    // Add to projectStore first
    addProject(path);

    // Get the newly added project ID
    const newProject = useProjectStore.getState().projects.find((p) => p.path === path);

    // Add to active workspace
    if (newProject && activeWorkspaceId) {
      addProjectToWorkspace(activeWorkspaceId, newProject.id);
    }

    setShowFileBrowser(false);
  };

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
      className={cn(
        "flex items-center bg-bg-primary border-b border-border select-none",
        compactProjectTabs ? "h-9" : "h-11",
      )}
    >
      {/* Traffic light spacer for macOS with version */}
      <div
        data-tauri-drag-region
        className="w-20 h-full flex-shrink-0 flex flex-col items-center justify-end pb-0.5"
      >
        <Tooltip content="Check for Updates" side="bottom">
          <button
            onClick={async () => {
              try {
                const { check } = await import("@tauri-apps/plugin-updater");
                const update = await check();
                if (update) {
                  if (confirm(`Update v${update.version} is available. Download and install now?`)) {
                    await update.downloadAndInstall();
                    const { relaunch } = await import("@tauri-apps/plugin-process");
                    await relaunch();
                  }
                } else {
                  alert("You're up to date!");
                }
              } catch (error) {
                console.error("Update check failed:", error);
                alert("Update check failed. Try again later.");
              }
            }}
            className="text-[8px] text-text-secondary/50 font-mono hover:text-text-secondary transition-colors"
          >
            v1.0.2
          </button>
        </Tooltip>
      </div>

      {/* Workspace Selector */}
      <div className="flex items-center px-2 h-full border-r border-border">
        <WorkspaceSelectorPopup compact={compactProjectTabs} />
      </div>

      {/* Project Tabs with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={scrollContainerRef}
          data-tauri-drag-region
          className="flex items-center flex-1 gap-0.5 overflow-x-auto scrollbar-none h-full"
        >
          <SortableContext
            items={projectIds}
            strategy={horizontalListSortingStrategy}
          >
            {filteredProjects.map((project) => (
              <SortableProjectTab
                key={project.id}
                project={project}
                isActive={activeProjectId === project.id}
                isCompact={compactProjectTabs}
                isDimmed={dimInactiveProjects && activeProjectId !== project.id}
                onSelect={() => {
                  setActiveProject(project.id);
                  // Track last active project in workspace
                  if (activeWorkspaceId) {
                    setLastActiveProject(activeWorkspaceId, project.id);
                  }
                  setMeditationActive(false);
                }}
                onClose={() => removeProject(project.id)}
                onToggleMinimize={() => toggleMinimized(project.id)}
                onContextMenu={(e) => handleContextMenu(e, project.id)}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>

      {/* Scroll buttons */}
      <div className="flex items-center border-l border-border h-full">
        <button
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className={cn(
            "p-1.5 h-full transition-colors",
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
            "p-1.5 h-full transition-colors",
            canScrollRight
              ? "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              : "text-text-secondary/30 cursor-not-allowed",
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Open Project Button */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content="Open Project">
          <button
            onClick={handleOpenProject}
            className="p-1.5 rounded-md border border-border bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {/* Project Templates (New Project) */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content="New Project">
          <IconButton size="sm" onClick={() => setShowProjectTemplates(true)}>
            <FolderPlus className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>

      {/* Project Search */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content="Project Search">
          <IconButton size="sm" onClick={() => setShowProjectSearch(true)}>
            <Search className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>

      {/* Meditation Mode */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content={isMeditating ? "Exit Meditation" : "Meditation Mode"}>
          <IconButton
            size="sm"
            onClick={() => setMeditationActive(!isMeditating)}
            className={cn(isMeditating && "text-accent")}
          >
            <Music className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>

      {/* Overwatch */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content="Overwatch">
          <IconButton size="sm" onClick={() => setShowOverwatch(true)}>
            <Eye className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>

      {/* Bookmarks */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content="Bookmarks">
          <IconButton size="sm" onClick={() => setShowBookmarks(true)}>
            <Bookmark className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>

      {/* Auto Build */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content="Auto Build">
          <IconButton
            size="sm"
            onClick={() => openAutoBuildPopup()}
            className={cn(isAutoBuildRunning && "text-accent bg-accent/10")}
          >
            <Bot className={cn("w-4 h-4", isAutoBuildRunning && "animate-pulse")} />
          </IconButton>
        </Tooltip>
      </div>

      {/* Database Viewer */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content="Database Viewer">
          <IconButton size="sm" onClick={() => setShowDatabaseViewer(true)}>
            <Database className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>

      {/* Tools Dropdown */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <ToolsDropdown
          onOpenPortManager={() => setShowPortManager(true)}
          onOpenNodeModulesCleaner={() => setShowNodeModulesCleaner(true)}
          onOpenLocalhostTunnel={() => setShowTunnelManager(true)}
          onOpenSystemHealth={() => setShowSystemHealth(true)}
          onOpenHomebrewManager={() => setShowHomebrewManager(true)}
          onOpenSystemCleaner={() => setShowSystemCleaner(true)}
          onOpenLivePreview={() => setShowLivePreview(true)}
          onOpenEnvManager={() => setShowEnvManager(true)}
          onOpenApiTester={() => setShowApiTester(true)}
          onOpenTestRunner={() => setShowTestRunner(true)}
          onOpenStorybookViewer={() => setShowStorybookViewer(true)}
          onOpenBackgroundServices={() => setShowBackgroundServices(true)}
          onOpenOverwatch={() => setShowOverwatch(true)}
          onOpenMcpManager={() => useMcpStore.getState().openPopup()}
          onOpenFaviconGenerator={() => setShowFaviconGenerator(true)}
          onOpenDevToolkit={() => setShowDevToolkit(true)}
          onOpenClaudeCodeStats={() => setShowClaudeCodeStats(true)}
          onOpenLimitsMonitor={() => setShowLimitsMonitor(true)}
          onOpenDomainTools={() => setShowDomainTools(true)}
          onOpenSeoTools={() => setShowSeoTools(true)}
          onOpenFloatingWebcam={() => setShowWebcamTool(true)}
          onOpenScreenStudio={() => setShowScreenStudio(true)}
          onOpenGifRecorder={() => setShowGifRecorder(true)}
          onOpenNetlifyFtp={() => setShowNetlifyFtp(true)}
          onOpenBookmarks={() => setShowBookmarks(true)}
          onOpenProjectSearch={() => setShowProjectSearch(true)}
          onOpenMeditation={() => setMeditationActive(true)}
          onOpenDatabaseViewer={() => setShowDatabaseViewer(true)}
          onOpenProjectTemplates={() => setShowProjectTemplates(true)}
          onOpenFileFinder={handleBrowseFiles}
          onOpenSubscriptions={() => onOpenSubscriptions?.()}
          onOpenFarmwork={() => setShowFarmworkTycoon(true)}
          onOpenJustCommandManager={() => setShowJustCommandManager(true)}
          hasStorybook={hasStorybook}
          hasJustfile={hasJustfile}
        />
      </div>

      {/* Right side controls */}
      <div
        data-tauri-drag-region
        className={cn(
          "flex items-center gap-2 px-3 h-full border-l border-border transition-opacity duration-500",
          isMeditating && "opacity-30 hover:opacity-100",
        )}
      >
        {onOpenSubscriptions && (
          <SubscriptionButton
            onOpenManage={onOpenSubscriptions}
            workspaceId={activeWorkspaceId}
          />
        )}
{userAvatar ? (
          <Tooltip content="Settings" side="bottom">
            <button
              onClick={onOpenSettings}
              className="w-7 h-7 rounded-full overflow-hidden border-2 border-border hover:border-accent transition-colors flex-shrink-0"
            >
              <img
                src={userAvatar}
                alt="User avatar"
                className="w-full h-full object-cover"
              />
            </button>
          </Tooltip>
        ) : (
          <Tooltip content="Settings" side="bottom">
            <IconButton size="sm" onClick={onOpenSettings}>
              <Settings className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        )}
      </div>

      {/* Context Menu for Project Customization */}
      {contextMenuProject && (
        <TabContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          onClose={closeContextMenu}
          name={contextMenuProject.name}
          icon={contextMenuProject.icon}
          color={contextMenuProject.color}
          onUpdateName={(name) => {
            if (contextMenu.projectId) {
              updateProjectName(contextMenu.projectId, name);
            }
          }}
          onUpdateIcon={(icon) => {
            if (contextMenu.projectId) {
              updateProjectIcon(contextMenu.projectId, icon);
            }
          }}
          onUpdateColor={(color) => {
            if (contextMenu.projectId) {
              updateProjectColor(contextMenu.projectId, color);
            }
          }}
        />
      )}

      {/* File Browser Popup */}
      <FileBrowserPopup
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
        initialPath={fileBrowserInitialPath}
        mode={fileBrowserMode}
        onSelectProject={handleSelectProject}
        onSendToPrompt={onSendToPrompt}
      />

      {/* Port Manager Popup */}
      <PortManagerPopup
        isOpen={showPortManager}
        onClose={() => setShowPortManager(false)}
      />

      {/* Node Modules Cleaner Popup */}
      <NodeModulesCleanerPopup
        isOpen={showNodeModulesCleaner}
        onClose={() => setShowNodeModulesCleaner(false)}
      />

      {/* Localhost Tunnel Popup */}
      <LocalhostTunnelPopup
        isOpen={showTunnelManager}
        onClose={() => setShowTunnelManager(false)}
      />

      {/* System Health Popup */}
      <SystemHealthPopup
        isOpen={showSystemHealth}
        onClose={() => setShowSystemHealth(false)}
      />

      {/* Homebrew Manager Popup */}
      <HomebrewManagerPopup
        isOpen={showHomebrewManager}
        onClose={() => setShowHomebrewManager(false)}
      />

      {/* System Cleaner Popup */}
      <SystemCleanerPopup
        isOpen={showSystemCleaner}
        onClose={() => setShowSystemCleaner(false)}
      />

      {/* Overwatch Popup */}
      <OverwatchPopup
        isOpen={showOverwatch}
        onClose={() => setShowOverwatch(false)}
      />

      {/* Live Preview Popup */}
      <LivePreviewPopup
        isOpen={showLivePreview}
        onClose={() => setShowLivePreview(false)}
      />

      {/* Environment Variables Manager */}
      <EnvManagerPopup
        isOpen={showEnvManager}
        onClose={() => setShowEnvManager(false)}
      />

      {/* API Tester */}
      <ApiTesterPopup
        isOpen={showApiTester}
        onClose={() => setShowApiTester(false)}
      />

      {/* Project Templates */}
      <ProjectTemplatesPopup
        isOpen={showProjectTemplates}
        onClose={() => setShowProjectTemplates(false)}
        onOpenProject={(path) => {
          addProject(path);
          setShowProjectTemplates(false);
        }}
      />

      {/* Test Runner */}
      <TestRunnerPopup
        isOpen={showTestRunner}
        onClose={() => setShowTestRunner(false)}
      />

      {/* Storybook Viewer */}
      <StorybookViewerPopup
        isOpen={showStorybookViewer}
        onClose={() => setShowStorybookViewer(false)}
      />

      {/* Background Services */}
      <BackgroundServicesPopup
        isOpen={showBackgroundServices}
        onClose={() => setShowBackgroundServices(false)}
      />

      {/* Database Viewer */}
      <DatabaseViewerPopup
        isOpen={showDatabaseViewer}
        onClose={() => setShowDatabaseViewer(false)}
      />

      {/* Beads Tracker */}
      {activeProject?.path && (
        <BeadsTrackerPopup
          isOpen={showBeadsTracker}
          onClose={() => setShowBeadsTracker(false)}
          projectPath={activeProject.path}
        />
      )}

      {/* Auto Build */}
      {activeProject?.path && isAutoBuildOpen && (
        <AutoBuildPopup projectPath={activeProject.path} />
      )}

      {/* MCP Manager */}
      <McpManagerPopup />

      {/* Favicon Generator */}
      <FaviconGeneratorPopup
        isOpen={showFaviconGenerator}
        onClose={() => setShowFaviconGenerator(false)}
      />

      {/* Dev Toolkit */}
      <DevToolkitPopup
        isOpen={showDevToolkit}
        onClose={() => {
          setShowDevToolkit(false);
          setDevToolkitInitialTool(undefined);
        }}
        initialTool={devToolkitInitialTool}
      />

      {/* Farmwork Tycoon */}
      <FarmworkTycoonPopup
        isOpen={showFarmworkTycoon}
        onClose={() => setShowFarmworkTycoon(false)}
      />

      {/* Claude Code Stats */}
      <ClaudeCodeStatsPopup
        isOpen={showClaudeCodeStats}
        onClose={() => setShowClaudeCodeStats(false)}
      />

      {/* Claude Limits Monitor */}
      <LimitsMonitorPopup
        isOpen={showLimitsMonitor}
        onClose={() => setShowLimitsMonitor(false)}
      />

      {/* Floating Webcam Tool */}
      <WebcamToolPopup
        isOpen={showWebcamTool}
        onClose={() => setShowWebcamTool(false)}
      />

      {/* Domain Tools */}
      <DomainToolsPopup
        isOpen={showDomainTools}
        onClose={() => {
          setShowDomainTools(false);
          setDomainToolsInitialTool(undefined);
        }}
        initialTool={domainToolsInitialTool}
      />

      {/* SEO Tools */}
      <SeoToolsPopup
        isOpen={showSeoTools}
        onClose={() => {
          setShowSeoTools(false);
          setSeoToolsInitialTool(undefined);
        }}
        initialTool={seoToolsInitialTool}
      />

      {/* Screen Studio */}
      <ScreenStudioPopup
        isOpen={showScreenStudio}
        onClose={() => setShowScreenStudio(false)}
      />

      {/* GIF Screen Section Recorder */}
      <GifRecorderPopup
        isOpen={showGifRecorder}
        onClose={() => setShowGifRecorder(false)}
      />

      {/* Netlify FTP */}
      <NetlifyFtpPopup
        isOpen={showNetlifyFtp}
        onClose={() => setShowNetlifyFtp(false)}
      />

      {/* Bookmarks */}
      <BookmarksPopup
        isOpen={showBookmarks}
        onClose={() => setShowBookmarks(false)}
      />

      {/* Project Search */}
      <ProjectSearchPopup
        isOpen={showProjectSearch}
        onClose={() => setShowProjectSearch(false)}
        onOpenFile={(path, line) => {
          setShowProjectSearch(false);
          window.dispatchEvent(
            new CustomEvent("open-file-at-line", {
              detail: { path, line },
            })
          );
        }}
      />

      {/* Just Command Manager */}
      <JustCommandManagerPopup
        isOpen={showJustCommandManager}
        onClose={() => setShowJustCommandManager(false)}
      />

      {/* Farmwork Mini Player - persists even when popup is closed */}
      <FarmworkMiniPlayerWrapper onExpand={() => setShowFarmworkTycoon(true)} />
    </div>
  );
}

function FarmworkMiniPlayerWrapper({ onExpand }: { onExpand: () => void }) {
  const { showMiniPlayer, hideMiniPlayer, showMiniPlayerFn } = useFarmworkTycoonStore();
  const autoOpenFarmworkMiniPlayer = useSettingsStore((s) => s.autoOpenFarmworkMiniPlayer);
  const { hasFarmwork } = useFarmworkDetection();
  const streamingState = useSessionStore((s) => s.streamingState);
  const wasStreamingRef = useRef(false);

  // Check if any session is currently streaming
  const isAnySessionStreaming = useMemo(() => {
    for (const state of streamingState.values()) {
      if (state.isStreaming) {
        return true;
      }
    }
    return false;
  }, [streamingState]);

  // Auto-open/close mini player based on streaming state
  useEffect(() => {
    if (!autoOpenFarmworkMiniPlayer || !hasFarmwork) {
      return;
    }

    // Session just started streaming
    if (isAnySessionStreaming && !wasStreamingRef.current) {
      wasStreamingRef.current = true;
      showMiniPlayerFn();
    }

    // All sessions stopped streaming
    if (!isAnySessionStreaming && wasStreamingRef.current) {
      wasStreamingRef.current = false;
      hideMiniPlayer();
    }
  }, [isAnySessionStreaming, autoOpenFarmworkMiniPlayer, hasFarmwork, showMiniPlayerFn, hideMiniPlayer]);

  return (
    <MiniGamePlayer
      isOpen={showMiniPlayer}
      onClose={hideMiniPlayer}
      onExpand={() => {
        hideMiniPlayer();
        onExpand();
      }}
    />
  );
}
