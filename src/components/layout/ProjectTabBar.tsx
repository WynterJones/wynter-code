import { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  X,
  Settings,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Music,
  GripVertical,
  Rocket,
  Minus,
  Database,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
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
import { IconButton, Tooltip, ContextMenu, IconPicker } from "@/components/ui";
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
} from "@/components/tools";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import { McpManagerPopup } from "@/components/tools/mcp-manager";
import { DevToolkitPopup } from "@/components/tools/dev-toolkit";
import { ClaudeCodeStatsPopup } from "@/components/tools/claude-code-stats";
import { WebcamToolPopup } from "@/components/tools/webcam";
import { DomainToolsPopup } from "@/components/tools/domain-tools";
import { SeoToolsPopup } from "@/components/tools/seo-tools";
import { ScreenStudioPopup } from "@/components/tools/screen-studio";
import { GifRecorderPopup } from "@/components/tools/gif-recorder";
import { NetlifyFtpPopup } from "@/components/tools/netlify-ftp";
import { useMcpStore } from "@/stores";
import { cn } from "@/lib/utils";
import { useMeditationStore } from "@/stores/meditationStore";
import { useStorybookDetection } from "@/hooks/useStorybookDetection";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { WorkspaceSelectorPopup } from "@/components/workspaces";
import type { Project } from "@/types";

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

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  projectId: string | null;
  activeTab: "icon" | "color";
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
      onClick={() => {
        if (isMinimized) {
          onToggleMinimize();
        }
        onSelect();
      }}
      onContextMenu={onContextMenu}
      className={cn(
        "group relative flex items-center cursor-pointer transition-all min-w-0 flex-shrink-0",
        isMinimized
          ? cn(
              "px-2.5 gap-1 border-r border-border",
              isCompact ? "h-9" : "h-11",
            )
          : isCompact
            ? "px-2.5 h-full gap-1.5 border-r border-border/50"
            : "px-4 h-full gap-2 border-r border-border/50",
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
      {/* Project color indicator - only show when active */}
      {isActive && project.color && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: project.color }}
        />
      )}

      {/* Drag handle - hidden when minimized */}
      {!isMinimized && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-bg-tertiary transition-opacity",
            "opacity-0 group-hover:opacity-60 hover:!opacity-100",
            isActive && "opacity-40",
          )}
        >
          <GripVertical
            className={cn(isCompact ? "w-2.5 h-2.5" : "w-3 h-3")}
          />
        </div>
      )}

      {/* Project icon */}
      <div className="flex-shrink-0">{renderIcon()}</div>

      {/* Project name - hidden when minimized */}
      {!isMinimized && (
        <span
          className={cn(
            "truncate",
            isCompact ? "text-xs max-w-[80px]" : "text-sm max-w-[140px]",
          )}
        >
          {project.name}
        </span>
      )}

      {/* Minimize button - only shown on hover when not minimized */}
      {!isMinimized && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMinimize();
          }}
          className={cn(
            "p-0.5 rounded hover:bg-bg-hover transition-opacity",
            "text-text-secondary hover:text-text-primary",
            isActive
              ? "opacity-0 group-hover:opacity-60 hover:!opacity-100"
              : "opacity-0 group-hover:opacity-60 hover:!opacity-100",
          )}
          title="Minimize"
        >
          <Minus className={cn(isCompact ? "w-3 h-3" : "w-3.5 h-3.5")} />
        </button>
      )}

      {/* Close button - hidden when minimized */}
      {!isMinimized && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "p-0.5 rounded hover:bg-bg-hover transition-opacity",
            "text-text-secondary hover:text-text-primary",
            isActive
              ? "opacity-60 hover:opacity-100"
              : "opacity-0 group-hover:opacity-60 hover:!opacity-100",
          )}
        >
          <X className={cn(isCompact ? "w-3 h-3" : "w-3.5 h-3.5")} />
        </button>
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
    updateProjectColor,
    updateProjectIcon,
    toggleMinimized,
    reorderProjects,
    getProject,
  } = useProjectStore();

  const isMeditating = useMeditationStore((s) => s.isActive);
  const setMeditationActive = useMeditationStore((s) => s.setActive);

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
    activeTab: "icon",
  });
  const [showPortManager, setShowPortManager] = useState(false);
  const [showNodeModulesCleaner, setShowNodeModulesCleaner] = useState(false);
  const [showTunnelManager, setShowTunnelManager] = useState(false);
  const [showSystemHealth, setShowSystemHealth] = useState(false);
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
  const [showFarmworkTycoon, setShowFarmworkTycoon] = useState(false);
  const [showClaudeCodeStats, setShowClaudeCodeStats] = useState(false);
  const [showWebcamTool, setShowWebcamTool] = useState(false);
  const [showDomainTools, setShowDomainTools] = useState(false);
  const [showSeoTools, setShowSeoTools] = useState(false);
  const [showScreenStudio, setShowScreenStudio] = useState(false);
  const [showGifRecorder, setShowGifRecorder] = useState(false);
  const [showNetlifyFtp, setShowNetlifyFtp] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { hasStorybook } = useStorybookDetection();

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
    const handleCommandPaletteTool = (e: CustomEvent<{ action: string }>) => {
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
          setShowDevToolkit(true);
          break;
        case "openFarmworkTycoon":
          setShowFarmworkTycoon(true);
          break;
        case "openClaudeCodeStats":
          setShowClaudeCodeStats(true);
          break;
        case "openFloatingWebcam":
          setShowWebcamTool(true);
          break;
        case "openDomainTools":
          setShowDomainTools(true);
          break;
        case "openSeoTools":
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
      activeTab: "icon",
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
      {/* Traffic light spacer for macOS */}
      <div
        data-tauri-drag-region
        className="w-20 h-full flex-shrink-0 flex items-center justify-end pr-2"
      />

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

      {/* New Project Button */}
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

      {/* Tools Dropdown */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <ToolsDropdown
          onOpenPortManager={() => setShowPortManager(true)}
          onOpenNodeModulesCleaner={() => setShowNodeModulesCleaner(true)}
          onOpenLocalhostTunnel={() => setShowTunnelManager(true)}
          onOpenSystemHealth={() => setShowSystemHealth(true)}
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
          onOpenDomainTools={() => setShowDomainTools(true)}
          onOpenSeoTools={() => setShowSeoTools(true)}
          onOpenFloatingWebcam={() => setShowWebcamTool(true)}
          onOpenScreenStudio={() => setShowScreenStudio(true)}
          onOpenGifRecorder={() => setShowGifRecorder(true)}
          onOpenNetlifyFtp={() => setShowNetlifyFtp(true)}
          hasStorybook={hasStorybook}
        />
      </div>

      {/* Meditation Mode */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content={isMeditating ? "Exit Meditation" : "Meditation Mode"}>
          <IconButton
            size="sm"
            onClick={() => setMeditationActive(!isMeditating)}
            className={cn(isMeditating && "text-accent bg-accent/10")}
          >
            <Music className={cn("w-4 h-4", isMeditating && "fill-accent")} />
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

      {/* Project Templates */}
      <div className="border-l border-border px-2 h-full flex items-center">
        <Tooltip content="New Project">
          <IconButton size="sm" onClick={() => setShowProjectTemplates(true)}>
            <Rocket className="w-4 h-4" />
          </IconButton>
        </Tooltip>
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
          <SubscriptionButton onOpenManage={onOpenSubscriptions} />
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
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
      >
        <div className="min-w-[280px]">
          {/* Tabs */}
          <div className="flex border-b border-border mb-3">
            <button
              onClick={() =>
                setContextMenu((prev) => ({ ...prev, activeTab: "icon" }))
              }
              className={cn(
                "flex-1 py-1.5 text-sm font-medium transition-colors",
                contextMenu.activeTab === "icon"
                  ? "text-accent border-b-2 border-accent"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              Icon
            </button>
            <button
              onClick={() =>
                setContextMenu((prev) => ({ ...prev, activeTab: "color" }))
              }
              className={cn(
                "flex-1 py-1.5 text-sm font-medium transition-colors",
                contextMenu.activeTab === "color"
                  ? "text-accent border-b-2 border-accent"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              Color
            </button>
          </div>

          {/* Tab Content */}
          {contextMenu.activeTab === "icon" && contextMenuProject && (
            <IconPicker
              selectedIcon={contextMenuProject.icon}
              onSelectIcon={(icon) => {
                if (contextMenu.projectId) {
                  updateProjectIcon(contextMenu.projectId, icon);
                }
                closeContextMenu();
              }}
              onRemoveIcon={
                contextMenuProject.icon
                  ? () => {
                      if (contextMenu.projectId) {
                        updateProjectIcon(contextMenu.projectId, "");
                      }
                      closeContextMenu();
                    }
                  : undefined
              }
            />
          )}

          {contextMenu.activeTab === "color" && contextMenuProject && (
            <div>
              <div className="text-xs text-text-secondary mb-2 font-medium">
                Project Color
              </div>
              <div className="grid grid-cols-4 gap-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      if (contextMenu.projectId) {
                        updateProjectColor(contextMenu.projectId, color);
                      }
                      closeContextMenu();
                    }}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                      contextMenuProject.color === color
                        ? "border-white ring-2 ring-accent/50"
                        : "border-transparent hover:border-white/50",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              {contextMenuProject.color && (
                <button
                  onClick={() => {
                    if (contextMenu.projectId) {
                      updateProjectColor(contextMenu.projectId, "");
                    }
                    closeContextMenu();
                  }}
                  className="w-full mt-3 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors border-t border-border pt-3"
                >
                  Remove color
                </button>
              )}
            </div>
          )}
        </div>
      </ContextMenu>

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
        onClose={() => setShowDevToolkit(false)}
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

      {/* Floating Webcam Tool */}
      <WebcamToolPopup
        isOpen={showWebcamTool}
        onClose={() => setShowWebcamTool(false)}
      />

      {/* Domain Tools */}
      <DomainToolsPopup
        isOpen={showDomainTools}
        onClose={() => setShowDomainTools(false)}
      />

      {/* SEO Tools */}
      <SeoToolsPopup
        isOpen={showSeoTools}
        onClose={() => setShowSeoTools(false)}
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

      {/* Farmwork Mini Player - persists even when popup is closed */}
      <FarmworkMiniPlayerWrapper onExpand={() => setShowFarmworkTycoon(true)} />
    </div>
  );
}

function FarmworkMiniPlayerWrapper({ onExpand }: { onExpand: () => void }) {
  const { showMiniPlayer, hideMiniPlayer } = useFarmworkTycoonStore();

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
