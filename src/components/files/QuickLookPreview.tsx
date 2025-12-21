import { useState, useEffect } from "react";
import { X, Loader2, File } from "lucide-react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { IconButton } from "@/components/ui/IconButton";
import type { FileNode } from "@/types";

interface QuickLookPreviewProps {
  file: FileNode;
  onClose: () => void;
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "bmp"];
const TEXT_EXTENSIONS = [
  "txt", "md", "json", "ts", "tsx", "js", "jsx", "css", "scss",
  "html", "xml", "yaml", "yml", "toml", "rs", "py", "go", "rb",
  "java", "cpp", "c", "h", "sh", "bash", "zsh", "fish", "env",
  "gitignore", "dockerignore", "editorconfig", "prettierrc", "eslintrc",
];

type PreviewType = "image" | "text" | "unsupported";

function getPreviewType(file: FileNode): PreviewType {
  if (file.isDirectory) return "unsupported";
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (TEXT_EXTENSIONS.includes(ext)) return "text";
  if (file.name.startsWith(".") && TEXT_EXTENSIONS.includes(file.name.slice(1))) return "text";
  return "unsupported";
}

export function QuickLookPreview({ file, onClose }: QuickLookPreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const previewType = getPreviewType(file);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setContent(null);

    if (previewType === "text") {
      invoke<string>("read_file_content", { path: file.path })
        .then((text) => {
          const lines = text.split("\n");
          const truncated = lines.slice(0, 200).join("\n");
          setContent(lines.length > 200 ? truncated + "\n\n... (truncated)" : text);
        })
        .catch((err) => setError(String(err)))
        .finally(() => setLoading(false));
    } else if (previewType === "image") {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [file.path, previewType]);

  return (
    <div className="w-80 border-l border-border bg-bg-tertiary flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium text-text-primary truncate">
          {file.name}
        </span>
        <IconButton size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </IconButton>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-text-secondary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-accent-red text-sm">
            <p>Failed to load preview</p>
            <p className="text-xs text-text-secondary mt-1">{error}</p>
          </div>
        ) : previewType === "image" ? (
          <div className="flex items-center justify-center h-full">
            <img
              src={convertFileSrc(file.path)}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded"
              onError={() => setError("Failed to load image")}
            />
          </div>
        ) : previewType === "text" && content ? (
          <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-words">
            {content}
          </pre>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <File className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No preview available</p>
            <p className="text-xs mt-1">{file.name}</p>
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-border text-xs text-text-secondary">
        <div className="truncate font-mono">{file.path}</div>
        {file.size !== undefined && (
          <div className="mt-1">
            {file.size < 1024
              ? `${file.size} B`
              : file.size < 1024 * 1024
              ? `${(file.size / 1024).toFixed(1)} KB`
              : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
          </div>
        )}
      </div>
    </div>
  );
}
