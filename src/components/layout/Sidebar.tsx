import { useState, useEffect, useMemo } from "react";
import { Files, Package, GitBranch, Info, FileText } from "lucide-react";
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
import { ProjectInfo } from "@/components/project/ProjectInfo";
import { DocsViewer } from "@/components/docs";
import { useFileOperations } from "@/hooks/useFileOperations";
import type { Project } from "@/types";
import type { SidebarTab } from "@/types/file";

interface SidebarProps {
  project: Project;
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

export function Sidebar({ project }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("files");
  const [openFilePath, setOpenFilePath] = useState<string | null>(null);
  const [fileViewerType, setFileViewerType] = useState<FileViewerType>(null);
  const [hasNodeModules, setHasNodeModules] = useState(false);

  const { checkNodeModulesExists } = useFileOperations();

  useEffect(() => {
    const checkModules = async () => {
      try {
        const exists = await checkNodeModulesExists(project.path);
        setHasNodeModules(exists);
      } catch {
        setHasNodeModules(false);
      }
    };
    checkModules();
  }, [project.path, checkNodeModulesExists]);

  const tabs = useMemo(() => {
    const baseTabs: { id: SidebarTab; icon: typeof Files; label: string }[] = [
      { id: "files", icon: Files, label: "Files" },
    ];

    if (hasNodeModules) {
      baseTabs.push({ id: "modules", icon: Package, label: "Modules" });
    }

    baseTabs.push(
      { id: "git", icon: GitBranch, label: "Git" },
      { id: "docs", icon: FileText, label: "Docs" },
      { id: "info", icon: Info, label: "Info" }
    );

    return baseTabs;
  }, [hasNodeModules]);

  useEffect(() => {
    if (activeTab === "modules" && !hasNodeModules) {
      setActiveTab("files");
    }
  }, [activeTab, hasNodeModules]);

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
    <div className="w-64 flex flex-col bg-bg-secondary border-l border-border">
      {/* Tab Bar */}
      <div className="flex items-center justify-evenly py-2 border-b border-border">
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
              {/* Active indicator */}
              {activeTab === tab.id && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-accent-blue rounded-full" />
              )}
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
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
        {activeTab === "git" && <GitPanel projectPath={project.path} />}
        {activeTab === "docs" && (
          <DocsViewer projectPath={project.path} onFileOpen={handleFileOpen} />
        )}
        {activeTab === "info" && <ProjectInfo project={project} />}
      </div>

      {/* File viewers */}
      {openFilePath && fileViewerType === "editor" && (
        <FileEditorPopup filePath={openFilePath} onClose={handleCloseViewer} />
      )}
      {openFilePath && fileViewerType === "image" && (
        <ImageViewerPopup filePath={openFilePath} onClose={handleCloseViewer} />
      )}
      {openFilePath && fileViewerType === "markdown" && (
        <MarkdownEditorPopup filePath={openFilePath} onClose={handleCloseViewer} />
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
