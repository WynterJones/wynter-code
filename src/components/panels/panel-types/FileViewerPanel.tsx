import { useState, useEffect, useCallback, KeyboardEvent } from "react";
import { FileCode, Loader2, File, FolderOpen } from "lucide-react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { ScrollArea } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PanelContentProps } from "@/types/panel";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "bmp"];
const TEXT_EXTENSIONS = [
  "txt", "md", "json", "ts", "tsx", "js", "jsx", "css", "scss",
  "html", "xml", "yaml", "yml", "toml", "rs", "py", "go", "rb",
  "java", "cpp", "c", "h", "sh", "bash", "zsh", "fish", "env",
  "gitignore", "dockerignore", "editorconfig", "prettierrc", "eslintrc",
];

type PreviewType = "image" | "text" | "unsupported";

function getPreviewType(filePath: string): PreviewType {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const name = filePath.split("/").pop() || "";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (TEXT_EXTENSIONS.includes(ext)) return "text";
  if (name.startsWith(".") && TEXT_EXTENSIONS.includes(name.slice(1))) return "text";
  return "unsupported";
}

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
  const [inputPath, setInputPath] = useState(panel.filePath || "");

  const filePath = panel.filePath;
  const previewType = filePath ? getPreviewType(filePath) : "unsupported";
  const fileName = filePath?.split("/").pop() || "";

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
        .then((text) => {
          const lines = text.split("\n");
          const truncated = lines.slice(0, 500).join("\n");
          setContent(lines.length > 500 ? truncated + "\n\n... (truncated)" : text);
        })
        .catch((err) => setError(String(err)))
        .finally(() => setLoading(false));
    } else if (previewType === "image") {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [filePath, previewType]);

  const handleOpenFile = useCallback(() => {
    const path = inputPath.trim();
    if (path) {
      onPanelUpdate({ filePath: path, title: path.split("/").pop() });
    }
  }, [inputPath, onPanelUpdate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleOpenFile();
      }
    },
    [handleOpenFile]
  );

  // No file selected - show file path input
  if (!filePath) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 p-4">
        <FileCode className="w-10 h-10 text-text-secondary/50" />
        <p className="text-sm text-text-secondary">Enter a file path to view</p>
        <div className="flex items-center gap-2 w-full max-w-md">
          <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-secondary border border-border">
            <FolderOpen className="w-4 h-4 text-text-secondary/50 flex-shrink-0" />
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`${projectPath}/src/file.ts`}
              className={cn(
                "flex-1 text-sm bg-transparent",
                "text-text-primary placeholder-text-secondary/50",
                "focus:outline-none"
              )}
              autoFocus
            />
          </div>
          <button
            onClick={handleOpenFile}
            className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent/80 text-primary-950 transition-colors"
          >
            Open
          </button>
        </div>
        <p className="text-xs text-text-secondary/60">
          Enter the full path to a file in your project
        </p>
      </div>
    );
  }

  const handleChangeFile = useCallback(() => {
    setInputPath(filePath || "");
    onPanelUpdate({ filePath: undefined, title: undefined });
  }, [filePath, onPanelUpdate]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* File header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/30 bg-bg-tertiary/50">
        <div className="flex items-center gap-1.5 text-xs text-text-secondary truncate flex-1 min-w-0">
          <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate" title={filePath}>
            {fileName}
          </span>
        </div>
        <button
          onClick={handleChangeFile}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
        >
          <FolderOpen className="w-3 h-3" />
          Change
        </button>
      </div>

      {/* Content area */}
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

        {!loading && !error && previewType === "image" && (
          <div className="flex items-center justify-center h-full p-4">
            <img
              src={convertFileSrc(filePath)}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        {!loading && !error && previewType === "text" && content && (
          <ScrollArea className="h-full">
            <pre
              className={cn(
                "p-3 text-xs font-mono text-text-primary whitespace-pre-wrap break-words",
                "leading-relaxed"
              )}
            >
              {content}
            </pre>
          </ScrollArea>
        )}

        {!loading && !error && previewType === "unsupported" && (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
            <File className="w-6 h-6 text-text-secondary/50" />
            <p className="text-xs text-text-secondary">Preview not available</p>
          </div>
        )}
      </div>
    </div>
  );
}
