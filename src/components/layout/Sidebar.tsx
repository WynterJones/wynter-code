import { useState, useEffect, useMemo } from "react";
import { Files, Package, FileJson, GitBranch, Info, FileText, PanelRightOpen, PanelLeftOpen } from "lucide-react";
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
import type { SidebarPosition } from "@/stores/settingsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";
import {
  FileTree,
  FileEditorPopup,
  ImageViewerPopup,
  MarkdownEditorPopup,
  VideoViewerPopup,
  PdfViewerPopup,
  AudioPlayerPopup,
  FontViewerPopup,
} from "@/components/files";
import { ModulesViewer } from "@/components/modules/ModulesViewer";
import { GitPanel } from "@/components/git/GitPanel";
import { ProjectInfo, PackageInfo } from "@/components/project";
import { DocsViewer } from "@/components/docs";
import { useFileOperations } from "@/hooks/useFileOperations";
import { useMinimizedPopupsStore } from "@/stores";
import type { Project } from "@/types";
import type { SidebarTab } from "@/types/file";

interface SidebarProps {
  project: Project;
  isCollapsed: boolean;
  isResizing?: boolean;
  onToggleCollapse: () => void;
  onResizeStart?: (e: React.MouseEvent) => void;
  width?: number;
  position?: SidebarPosition;
}

type FileViewerType = "editor" | "image" | "markdown" | "video" | "pdf" | "audio" | "font" | null;

// Tab definitions with icons
const TAB_DEFINITIONS: Record<SidebarTab, { icon: typeof Files; label: string }> = {
  files: { icon: Files, label: "Files" },
  modules: { icon: Package, label: "Modules" },
  package: { icon: FileJson, label: "Package" },
  git: { icon: GitBranch, label: "Git" },
  docs: { icon: FileText, label: "Docs" },
  info: { icon: Info, label: "Info" },
};

interface SortableSidebarTabProps {
  id: SidebarTab;
  isActive: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}

function SortableSidebarTab({ id, isActive, isDisabled, onSelect }: SortableSidebarTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tab = TAB_DEFINITIONS[id];

  if (isDisabled) return null;

  return (
    <Tooltip content={tab.label} side="bottom">
      <button
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onSelect}
        className={cn(
          "relative p-1.5 rounded transition-colors",
          isDragging && "opacity-50 z-50",
          isActive
            ? "text-text-primary"
            : "text-text-secondary hover:text-text-primary"
        )}
      >
        <tab.icon className="w-4 h-4" />
        {isActive && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-accent-blue rounded-full" />
        )}
      </button>
    </Tooltip>
  );
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "tiff", "avif"];
const MARKDOWN_EXTENSIONS = ["md", "mdx", "markdown"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "mkv", "avi", "m4v", "ogv"];
const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "wma"];
const PDF_EXTENSIONS = ["pdf"];
const FONT_EXTENSIONS = ["ttf", "otf", "woff", "woff2", "eot"];

function getFileViewerType(path: string): FileViewerType {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (MARKDOWN_EXTENSIONS.includes(ext)) return "markdown";
  if (VIDEO_EXTENSIONS.includes(ext)) return "video";
  if (AUDIO_EXTENSIONS.includes(ext)) return "audio";
  if (PDF_EXTENSIONS.includes(ext)) return "pdf";
  if (FONT_EXTENSIONS.includes(ext)) return "font";
  return "editor";
}

export function Sidebar({ project, isCollapsed, isResizing, onToggleCollapse, onResizeStart, width = 400, position = "right" }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("files");
  const [openFilePath, setOpenFilePath] = useState<string | null>(null);
  const [openFileLine, setOpenFileLine] = useState<number | undefined>(undefined);
  const [fileViewerType, setFileViewerType] = useState<FileViewerType>(null);
  const [hasNodeModules, setHasNodeModules] = useState(false);
  const [hasPackageJson, setHasPackageJson] = useState(false);

  const { checkNodeModulesExists, checkFileExists } = useFileOperations();
  const { minimize, pendingRestore, clearPendingRestore } = useMinimizedPopupsStore();
  const sidebarTabOrder = useSettingsStore((s) => s.sidebarTabOrder);
  const setSidebarTabOrder = useSettingsStore((s) => s.setSidebarTabOrder);

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

  const handleMinimize = () => {
    if (openFilePath && fileViewerType) {
      const type = fileViewerType === "markdown" ? "markdown" : "editor";
      minimize({
        filePath: openFilePath,
        type,
        projectId: project.id,
      });
      setOpenFilePath(null);
      setFileViewerType(null);
    }
  };

  useEffect(() => {
    if (pendingRestore && pendingRestore.projectId === project.id) {
      const viewerType = pendingRestore.type === "markdown" ? "markdown" : "editor";
      setOpenFilePath(pendingRestore.filePath);
      setFileViewerType(viewerType);
      clearPendingRestore();
    }
  }, [pendingRestore, project.id, clearPendingRestore]);

  useEffect(() => {
    const checkProjectFeatures = async () => {
      try {
        const [modulesExist, packageExists] = await Promise.all([
          checkNodeModulesExists(project.path),
          checkFileExists(`${project.path}/package.json`),
        ]);
        setHasNodeModules(modulesExist);
        setHasPackageJson(packageExists);
      } catch (error) {
        setHasNodeModules(false);
        setHasPackageJson(false);
      }
    };
    checkProjectFeatures();
  }, [project.path, checkNodeModulesExists, checkFileExists]);

  // Listen for global focus-file-browser event (keyboard shortcut)
  useEffect(() => {
    const handleFocusFileBrowser = () => {
      setActiveTab("files");
    };
    window.addEventListener("focus-file-browser", handleFocusFileBrowser);
    return () => window.removeEventListener("focus-file-browser", handleFocusFileBrowser);
  }, []);

  // Listen for open-file-at-line event (from project search)
  useEffect(() => {
    const handleOpenFileAtLine = (e: CustomEvent<{ path: string; line: number }>) => {
      const { path, line } = e.detail;
      handleFileOpen(path, line);
    };
    window.addEventListener("open-file-at-line", handleOpenFileAtLine as EventListener);
    return () => window.removeEventListener("open-file-at-line", handleOpenFileAtLine as EventListener);
  }, []);

  // Use saved tab order, filtering out tabs that shouldn't be shown
  const visibleTabs = useMemo(() => {
    const isTabVisible = (tabId: SidebarTab): boolean => {
      if (tabId === "modules") return hasNodeModules;
      if (tabId === "package") return hasPackageJson;
      return true;
    };

    // Filter the saved order to only include visible tabs
    return sidebarTabOrder.filter(isTabVisible);
  }, [sidebarTabOrder, hasNodeModules, hasPackageJson]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sidebarTabOrder.indexOf(active.id as SidebarTab);
      const newIndex = sidebarTabOrder.indexOf(over.id as SidebarTab);

      const newOrder = [...sidebarTabOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id as SidebarTab);

      setSidebarTabOrder(newOrder);
    }
  };

  useEffect(() => {
    if (activeTab === "modules" && !hasNodeModules) {
      setActiveTab("files");
    }
    if (activeTab === "package" && !hasPackageJson) {
      setActiveTab("files");
    }
  }, [activeTab, hasNodeModules, hasPackageJson]);

  const handleFileOpen = (path: string, line?: number) => {
    const viewerType = getFileViewerType(path);
    setOpenFilePath(path);
    setOpenFileLine(line);
    setFileViewerType(viewerType);
  };

  const handleCloseViewer = () => {
    setOpenFilePath(null);
    setOpenFileLine(undefined);
    setFileViewerType(null);
  };

  const handleNodeModulesClick = () => {
    if (hasNodeModules) {
      setActiveTab("modules");
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col bg-bg-secondary border-border",
        position === "right" ? "border-l" : "border-r",
        !isResizing && "transition-[width,border] duration-200 ease-in-out",
        isCollapsed && "w-0 overflow-hidden border-l-0 border-r-0"
      )}
      style={!isCollapsed ? { width } : undefined}
    >
      {/* Resize handle */}
      {!isCollapsed && onResizeStart && (
        <div
          onMouseDown={onResizeStart}
          className={cn(
            "absolute top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-accent/50",
            position === "right" ? "left-0" : "right-0",
            isResizing && "bg-accent/50"
          )}
        />
      )}
      <div className="relative flex items-center py-2 border-b border-border" style={{ minWidth: width }}>
        {position === "right" && (
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-20">
            <Tooltip content="Hide sidebar" side="left">
              <button
                onClick={onToggleCollapse}
                className="p-1.5 rounded-md bg-[#0d0d0d] border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors shadow-sm"
              >
                <PanelRightOpen className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className={cn(
            "flex items-center justify-evenly flex-1",
            position === "left" ? "pr-4" : "pl-4"
          )}>
            <SortableContext
              items={visibleTabs}
              strategy={horizontalListSortingStrategy}
            >
              {visibleTabs.map((tabId) => (
                <SortableSidebarTab
                  key={tabId}
                  id={tabId}
                  isActive={activeTab === tabId}
                  isDisabled={false}
                  onSelect={() => setActiveTab(tabId)}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
        {position === "left" && (
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-20">
            <Tooltip content="Hide sidebar" side="right">
              <button
                onClick={onToggleCollapse}
                className="p-1.5 rounded-md bg-[#0d0d0d] border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors shadow-sm"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden" style={{ minWidth: width }}>
        {activeTab === "files" && (
          <FileTree
            projectPath={project.path}
            onFileOpen={handleFileOpen}
            onNodeModulesClick={handleNodeModulesClick}
          />
        )}
        {activeTab === "modules" && hasNodeModules && (
          <ModulesViewer projectPath={project.path} />
        )}
        {activeTab === "package" && hasPackageJson && (
          <PackageInfo projectPath={project.path} />
        )}
        {activeTab === "git" && <GitPanel projectPath={project.path} />}
        {activeTab === "docs" && (
          <DocsViewer projectPath={project.path} onFileOpen={handleFileOpen} />
        )}
        {activeTab === "info" && <ProjectInfo project={project} />}
      </div>

      {openFilePath && fileViewerType === "editor" && (
        <FileEditorPopup filePath={openFilePath} initialLine={openFileLine} onClose={handleCloseViewer} onMinimize={handleMinimize} />
      )}
      {openFilePath && fileViewerType === "image" && (
        <ImageViewerPopup filePath={openFilePath} onClose={handleCloseViewer} />
      )}
      {openFilePath && fileViewerType === "markdown" && (
        <MarkdownEditorPopup filePath={openFilePath} onClose={handleCloseViewer} onMinimize={handleMinimize} />
      )}
      {openFilePath && fileViewerType === "video" && (
        <VideoViewerPopup filePath={openFilePath} onClose={handleCloseViewer} />
      )}
      {openFilePath && fileViewerType === "pdf" && (
        <PdfViewerPopup filePath={openFilePath} onClose={handleCloseViewer} />
      )}
      {openFilePath && fileViewerType === "audio" && (
        <AudioPlayerPopup filePath={openFilePath} onClose={handleCloseViewer} />
      )}
      {openFilePath && fileViewerType === "font" && (
        <FontViewerPopup filePath={openFilePath} onClose={handleCloseViewer} />
      )}
    </div>
  );
}
