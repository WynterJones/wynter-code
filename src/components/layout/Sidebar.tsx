import { useState, useEffect, useMemo } from "react";
import { Files, Package, FileJson, GitBranch, Info, FileText, PanelRightOpen } from "lucide-react";
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
  onToggleCollapse: () => void;
  width?: number;
}

type FileViewerType = "editor" | "image" | "markdown" | "video" | "pdf" | "audio" | "font" | null;

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

export function Sidebar({ project, isCollapsed, onToggleCollapse, width = 400 }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("files");
  const [openFilePath, setOpenFilePath] = useState<string | null>(null);
  const [fileViewerType, setFileViewerType] = useState<FileViewerType>(null);
  const [hasNodeModules, setHasNodeModules] = useState(false);
  const [hasPackageJson, setHasPackageJson] = useState(false);

  const { checkNodeModulesExists, checkFileExists } = useFileOperations();
  const { minimize, pendingRestore, clearPendingRestore } = useMinimizedPopupsStore();

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
      } catch {
        setHasNodeModules(false);
        setHasPackageJson(false);
      }
    };
    checkProjectFeatures();
  }, [project.path, checkNodeModulesExists, checkFileExists]);

  const tabs = useMemo(() => {
    const baseTabs: { id: SidebarTab; icon: typeof Files; label: string }[] = [
      { id: "files", icon: Files, label: "Files" },
    ];

    if (hasNodeModules) {
      baseTabs.push({ id: "modules", icon: Package, label: "Modules" });
    }

    if (hasPackageJson) {
      baseTabs.push({ id: "package", icon: FileJson, label: "Package" });
    }

    baseTabs.push(
      { id: "git", icon: GitBranch, label: "Git" },
      { id: "docs", icon: FileText, label: "Docs" },
      { id: "info", icon: Info, label: "Info" }
    );

    return baseTabs;
  }, [hasNodeModules, hasPackageJson]);

  useEffect(() => {
    if (activeTab === "modules" && !hasNodeModules) {
      setActiveTab("files");
    }
    if (activeTab === "package" && !hasPackageJson) {
      setActiveTab("files");
    }
  }, [activeTab, hasNodeModules, hasPackageJson]);

  const handleFileOpen = (path: string) => {
    const viewerType = getFileViewerType(path);
    setOpenFilePath(path);
    setFileViewerType(viewerType);
  };

  const handleCloseViewer = () => {
    setOpenFilePath(null);
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
        "flex flex-col bg-bg-secondary border-l border-border transition-all duration-200 ease-in-out",
        isCollapsed && "w-0 overflow-hidden border-l-0"
      )}
      style={!isCollapsed ? { width } : undefined}
    >
      <div className="flex items-center py-2 border-b border-border" style={{ minWidth: width }}>
        <div className="flex items-center justify-evenly flex-1">
          {tabs.map((tab) => (
            <Tooltip key={tab.id} content={tab.label} side="bottom">
              <button
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative p-1.5 rounded transition-colors",
                  activeTab === tab.id
                    ? "text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {activeTab === tab.id && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-accent-blue rounded-full" />
                )}
              </button>
            </Tooltip>
          ))}
        </div>
        <Tooltip content="Hide sidebar" side="left">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 mr-2 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
        </Tooltip>
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
        <FileEditorPopup filePath={openFilePath} onClose={handleCloseViewer} onMinimize={handleMinimize} />
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
