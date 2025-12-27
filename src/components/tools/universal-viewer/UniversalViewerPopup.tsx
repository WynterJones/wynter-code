import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileBrowserPopup } from "@/components/files/FileBrowserPopup";
import {
  FileEditorPopup,
  ImageViewerPopup,
  MarkdownEditorPopup,
  VideoViewerPopup,
  PdfViewerPopup,
  AudioPlayerPopup,
  FontViewerPopup,
} from "@/components/files";

interface UniversalViewerPopupProps {
  onClose: () => void;
  projectPath?: string;
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

export function UniversalViewerPopup({ onClose, projectPath }: UniversalViewerPopupProps) {
  const [showFileBrowser, setShowFileBrowser] = useState(true);
  const [initialPath, setInitialPath] = useState<string | undefined>(projectPath);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileViewerType, setFileViewerType] = useState<FileViewerType>(null);

  useEffect(() => {
    const loadInitialPath = async () => {
      if (!projectPath) {
        try {
          const homeDir = await invoke<string>("get_home_dir");
          setInitialPath(homeDir);
        } catch {
          setInitialPath(undefined);
        }
      }
    };
    loadInitialPath();
  }, [projectPath]);

  const handleFileSelect = useCallback((path: string) => {
    const viewerType = getFileViewerType(path);
    setSelectedFilePath(path);
    setFileViewerType(viewerType);
    setShowFileBrowser(false);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setSelectedFilePath(null);
    setFileViewerType(null);
    onClose();
  }, [onClose]);

  const handleCloseBrowser = useCallback(() => {
    setShowFileBrowser(false);
    onClose();
  }, [onClose]);

  if (showFileBrowser && !selectedFilePath) {
    return (
      <FileBrowserPopup
        isOpen={true}
        onClose={handleCloseBrowser}
        initialPath={initialPath}
        mode="selectFile"
        selectButtonLabel="Open File"
        onSelectFile={handleFileSelect}
      />
    );
  }

  if (selectedFilePath && fileViewerType === "editor") {
    return <FileEditorPopup filePath={selectedFilePath} onClose={handleCloseViewer} />;
  }

  if (selectedFilePath && fileViewerType === "image") {
    return <ImageViewerPopup filePath={selectedFilePath} onClose={handleCloseViewer} />;
  }

  if (selectedFilePath && fileViewerType === "markdown") {
    return <MarkdownEditorPopup filePath={selectedFilePath} onClose={handleCloseViewer} />;
  }

  if (selectedFilePath && fileViewerType === "video") {
    return <VideoViewerPopup filePath={selectedFilePath} onClose={handleCloseViewer} />;
  }

  if (selectedFilePath && fileViewerType === "pdf") {
    return <PdfViewerPopup filePath={selectedFilePath} onClose={handleCloseViewer} />;
  }

  if (selectedFilePath && fileViewerType === "audio") {
    return <AudioPlayerPopup filePath={selectedFilePath} onClose={handleCloseViewer} />;
  }

  if (selectedFilePath && fileViewerType === "font") {
    return <FontViewerPopup filePath={selectedFilePath} onClose={handleCloseViewer} />;
  }

  return null;
}
