import { useState, useEffect, useCallback } from "react";
import { FileCode, Loader2, File, FolderOpen, List, Music, Film, FolderSearch } from "lucide-react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import Editor, { type Monaco } from "@monaco-editor/react";
import { FileBrowserPopup } from "@/components/files/FileBrowserPopup";
import { defineMonacoThemes } from "@/hooks/useMonacoTheme";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import type { PanelContentProps } from "@/types/panel";
import { AudioPlayerWithVisualizer } from "./AudioPlayerWithVisualizer";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "bmp"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "mkv", "avi", "m4v", "ogv"];
const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "wma"];
const TEXT_EXTENSIONS = [
  "txt", "md", "json", "ts", "tsx", "js", "jsx", "css", "scss",
  "html", "xml", "yaml", "yml", "toml", "rs", "py", "go", "rb",
  "java", "cpp", "c", "h", "sh", "bash", "zsh", "fish", "env",
  "gitignore", "dockerignore", "editorconfig", "prettierrc", "eslintrc",
];

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    rb: "ruby",
    php: "php",
    sql: "sql",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    toml: "toml",
    c: "c",
    cpp: "cpp",
    h: "c",
    txt: "plaintext",
  };
  return languageMap[ext || ""] || "plaintext";
}

type PreviewType = "image" | "video" | "audio" | "text" | "unsupported";

function getPreviewType(filePath: string): PreviewType {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const name = filePath.split("/").pop() || "";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (VIDEO_EXTENSIONS.includes(ext)) return "video";
  if (AUDIO_EXTENSIONS.includes(ext)) return "audio";
  if (TEXT_EXTENSIONS.includes(ext)) return "text";
  if (name.startsWith(".") && TEXT_EXTENSIONS.includes(name.slice(1))) return "text";
  return "unsupported";
}

const MEDIA_EXTENSIONS = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS];

export function FileViewerPanel({
  panelId: _panelId,
  projectId: _projectId,
  projectPath,
  panel,
  isFocused: _isFocused,
  onProcessStateChange: _onProcessStateChange,
  onPanelUpdate,
}: PanelContentProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [scanningFolder, setScanningFolder] = useState(false);

  const { editorTheme, editorFontSize } = useSettingsStore();

  const filePath = panel.filePath;
  const playlistItems = panel.playlistItems || [];
  const playlistIndex = panel.playlistIndex ?? 0;
  const playlistFolder = panel.playlistFolder;

  const previewType = filePath ? getPreviewType(filePath) : "unsupported";
  const fileName = filePath?.split("/").pop() || "";
  const language = filePath ? getLanguageFromPath(filePath) : "plaintext";

  const isInPlaylistMode = playlistItems.length > 0;

  // Define themes and disable diagnostics before mount
  const handleEditorWillMount = (monaco: Monaco) => {
    defineMonacoThemes(monaco);
    // Disable all diagnostics/error checking
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
  };

  useEffect(() => {
    if (!filePath) {
      setContent(null);
      return;
    }

    setLoading(true);
    setError(null);
    setContent(null);

    if (previewType === "text") {
      invoke<string>("read_file_content", { path: filePath })
        .then((text) => setContent(text))
        .catch((err) => setError(String(err)))
        .finally(() => setLoading(false));
    } else {
      // image, video, audio, unsupported - no content loading needed
      setLoading(false);
    }
  }, [filePath, previewType]);

  const handleFileSelect = useCallback((path: string) => {
    onPanelUpdate({
      filePath: path,
      title: path.split("/").pop(),
      playlistItems: undefined,
      playlistIndex: undefined,
      playlistFolder: undefined,
    });
    setShowFileBrowser(false);
  }, [onPanelUpdate]);

  const handleChangeFile = useCallback(() => {
    setShowFileBrowser(true);
  }, []);

  const scanFolderForMedia = useCallback(async (folderPath: string) => {
    setScanningFolder(true);
    try {
      const entries = await invoke<Array<{
        name: string;
        path: string;
        is_directory: boolean;
        size: number | null;
        children: unknown[] | null;
        is_ignored: boolean;
      }>>("get_file_tree", { path: folderPath, depth: 1 });

      const mediaFiles = entries
        .filter((entry) => {
          if (entry.is_directory) return false;
          const ext = entry.name.split(".").pop()?.toLowerCase() || "";
          return MEDIA_EXTENSIONS.includes(ext);
        })
        .map((entry) => entry.path)
        .sort((a, b) => a.localeCompare(b));

      return mediaFiles;
    } catch (err) {
      console.error("Failed to scan folder:", err);
      return [];
    } finally {
      setScanningFolder(false);
    }
  }, []);

  const handleFolderSelect = useCallback(async (folderPath: string) => {
    setShowFolderBrowser(false);
    const mediaFiles = await scanFolderForMedia(folderPath);

    if (mediaFiles.length === 0) {
      setError("No audio or video files in this folder");
      onPanelUpdate({
        playlistFolder: folderPath,
        playlistItems: [],
        playlistIndex: 0,
        filePath: undefined,
      });
    } else {
      onPanelUpdate({
        playlistFolder: folderPath,
        playlistItems: mediaFiles,
        playlistIndex: 0,
        filePath: mediaFiles[0],
        title: mediaFiles[0].split("/").pop(),
      });
      setError(null);
      setShowPlaylist(true);
    }
  }, [onPanelUpdate, scanFolderForMedia]);

  const handlePlaylistNavigate = useCallback((index: number) => {
    if (index >= 0 && index < playlistItems.length) {
      onPanelUpdate({
        playlistIndex: index,
        filePath: playlistItems[index],
        title: playlistItems[index].split("/").pop(),
      });
    }
  }, [onPanelUpdate, playlistItems]);

  const handlePrevious = useCallback(() => {
    handlePlaylistNavigate(playlistIndex - 1);
  }, [handlePlaylistNavigate, playlistIndex]);

  const handleNext = useCallback(() => {
    handlePlaylistNavigate(playlistIndex + 1);
  }, [handlePlaylistNavigate, playlistIndex]);

  const clearPlaylist = useCallback(() => {
    onPanelUpdate({
      playlistFolder: undefined,
      playlistItems: undefined,
      playlistIndex: undefined,
    });
    setShowPlaylist(false);
  }, [onPanelUpdate]);

  const getMediaIcon = useCallback((path: string) => {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    if (AUDIO_EXTENSIONS.includes(ext)) return Music;
    if (VIDEO_EXTENSIONS.includes(ext)) return Film;
    return File;
  }, []);

  // No file selected or empty playlist error - show browse buttons
  if (!filePath && !scanningFolder) {
    const hasEmptyPlaylistError = playlistFolder && playlistItems.length === 0;

    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 p-4">
        {hasEmptyPlaylistError ? (
          <>
            <FolderSearch className="w-10 h-10 text-accent-yellow/50" />
            <p className="text-sm text-text-secondary text-center">
              No audio or video files in this folder
            </p>
            <p className="text-xs text-text-secondary/70 truncate max-w-[80%]">
              {playlistFolder}
            </p>
          </>
        ) : (
          <>
            <FileCode className="w-10 h-10 text-text-secondary/50" />
            <p className="text-sm text-text-secondary">Select a file or folder to view</p>
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setShowFileBrowser(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm rounded-lg",
              "bg-accent hover:bg-accent/80 text-primary-950 transition-colors"
            )}
          >
            <File className="w-4 h-4" />
            Open File
          </button>
          <button
            onClick={() => setShowFolderBrowser(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm rounded-lg",
              "bg-bg-tertiary hover:bg-bg-hover text-text-primary border border-border/50 transition-colors"
            )}
          >
            <FolderOpen className="w-4 h-4" />
            Open Folder
          </button>
        </div>

        <FileBrowserPopup
          isOpen={showFileBrowser}
          onClose={() => setShowFileBrowser(false)}
          initialPath={projectPath}
          mode="selectFile"
          selectButtonLabel="Open File"
          onSelectFile={handleFileSelect}
        />
        <FileBrowserPopup
          isOpen={showFolderBrowser}
          onClose={() => setShowFolderBrowser(false)}
          initialPath={projectPath}
          mode="selectProject"
          selectButtonLabel="Open Folder"
          onSelectProject={handleFolderSelect}
        />
      </div>
    );
  }

  // Loading state for folder scanning
  if (scanningFolder) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-accent-cyan" />
        <p className="text-sm text-text-secondary">Scanning folder for media...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* File header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/30 bg-bg-tertiary/50">
        <div className="flex items-center gap-1.5 text-xs text-text-secondary truncate flex-1 min-w-0">
          <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate" title={filePath}>
            {fileName}
          </span>
          {isInPlaylistMode && (
            <span className="text-[10px] text-accent-cyan ml-1">
              ({playlistIndex + 1}/{playlistItems.length})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isInPlaylistMode && (
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded transition-colors",
                showPlaylist
                  ? "bg-accent-cyan/20 text-accent-cyan"
                  : "hover:bg-bg-hover text-text-secondary hover:text-text-primary"
              )}
              title="Toggle playlist"
            >
              <List className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => setShowFolderBrowser(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            title="Open folder as playlist"
          >
            <FolderOpen className="w-3 h-3" />
          </button>
          <button
            onClick={handleChangeFile}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            title="Open single file"
          >
            <File className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content area with optional playlist sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Playlist sidebar */}
        {isInPlaylistMode && showPlaylist && (
          <div className="w-48 flex-shrink-0 border-r border-border/30 bg-bg-tertiary/30 flex flex-col overflow-hidden">
            <div className="px-2 py-1.5 border-b border-border/30 flex items-center justify-between">
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">
                Playlist
              </span>
              <button
                onClick={clearPlaylist}
                className="text-[10px] text-text-secondary hover:text-accent-red transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {playlistItems.map((item, index) => {
                const itemName = item.split("/").pop() || item;
                const ItemIcon = getMediaIcon(item);
                const isActive = index === playlistIndex;

                return (
                  <button
                    key={item}
                    onClick={() => handlePlaylistNavigate(index)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors",
                      isActive
                        ? "bg-accent-cyan/20 text-accent-cyan"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    )}
                  >
                    <ItemIcon className="w-3 h-3 flex-shrink-0" />
                    <span className="text-xs truncate">{itemName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
              <File className="w-6 h-6 text-accent-red/50" />
              <p className="text-xs text-accent-red text-center">{error}</p>
            </div>
          )}

          {!loading && !error && previewType === "image" && filePath && (
            <div className="flex items-center justify-center h-full p-4">
              <img
                src={convertFileSrc(filePath)}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}

          {!loading && !error && previewType === "video" && filePath && (
            <div className="flex items-center justify-center h-full p-4 bg-black">
              <video
                src={convertFileSrc(filePath)}
                controls
                autoPlay={false}
                className="max-w-full max-h-full"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {!loading && !error && previewType === "audio" && filePath && (
            <AudioPlayerWithVisualizer
              key={filePath}
              src={convertFileSrc(filePath)}
              fileName={fileName}
              onPrevious={isInPlaylistMode ? handlePrevious : undefined}
              onNext={isInPlaylistMode ? handleNext : undefined}
              hasPrevious={isInPlaylistMode && playlistIndex > 0}
              hasNext={isInPlaylistMode && playlistIndex < playlistItems.length - 1}
              playlistInfo={
                isInPlaylistMode
                  ? { current: playlistIndex + 1, total: playlistItems.length }
                  : undefined
              }
            />
          )}

          {!loading && !error && previewType === "text" && content !== null && (
            <Editor
              height="100%"
              language={language}
              value={content}
              theme={editorTheme || "github-dark"}
              beforeMount={handleEditorWillMount}
              loading={
                <div className="flex items-center justify-center h-full bg-bg-tertiary text-text-secondary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              }
              options={{
                readOnly: true,
                fontSize: editorFontSize || 12,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
                lineNumbers: "on",
                renderLineHighlight: "none",
                padding: { top: 8, bottom: 8 },
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
                renderValidationDecorations: "off",
                guides: {
                  indentation: false,
                  bracketPairs: false,
                  highlightActiveIndentation: false,
                },
              }}
            />
          )}

          {!loading && !error && previewType === "unsupported" && (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
              <File className="w-6 h-6 text-text-secondary/50" />
              <p className="text-xs text-text-secondary">Preview not available</p>
            </div>
          )}
        </div>
      </div>

      <FileBrowserPopup
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
        initialPath={projectPath}
        mode="selectFile"
        selectButtonLabel="Open File"
        onSelectFile={handleFileSelect}
      />
      <FileBrowserPopup
        isOpen={showFolderBrowser}
        onClose={() => setShowFolderBrowser(false)}
        initialPath={projectPath}
        mode="selectProject"
        selectButtonLabel="Open Folder"
        onSelectProject={handleFolderSelect}
      />
    </div>
  );
}
