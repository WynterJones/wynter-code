import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Loader2, FolderArchive, Rocket } from "lucide-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  isUploading: boolean;
  progress: number;
  message: string;
  disabled?: boolean;
  projectPath?: string;
  projectName?: string;
  onDeployProject?: () => void;
  isDeployingProject?: boolean;
  deployProjectMessage?: string;
}

function isZipFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(".zip");
}

async function zipFolderToFile(folderPath: string): Promise<File> {
  const folderName = folderPath.split("/").pop() || "folder";
  const base64Data = await invoke<string>("zip_folder_to_base64", {
    folderPath,
  });

  // Convert base64 to binary
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new File([bytes], `${folderName}.zip`, { type: "application/zip" });
}

async function checkIsDirectory(path: string): Promise<boolean> {
  try {
    const result = await invoke<boolean>("is_directory", { path });
    return result;
  } catch (err) {
    // Fallback: check if path has no extension (likely a folder)
    const fileName = path.split("/").pop() || "";
    return !fileName.includes(".");
  }
}

async function readFileToFile(filePath: string, fileName: string): Promise<File> {
  const base64Data = await invoke<string>("read_file_base64", {
    path: filePath,
  });
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: "application/zip" });
}

export function DropZone({
  onFileDrop,
  isUploading,
  progress,
  message,
  disabled = false,
  projectPath,
  projectName,
  onDeployProject,
  isDeployingProject = false,
  deployProjectMessage,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const isPositionInDropZone = useCallback((x: number, y: number): boolean => {
    if (!dropZoneRef.current) return false;
    const rect = dropZoneRef.current.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }, []);

  // Listen for Tauri file drop events (works with Finder/external apps)
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent(async (event) => {
          if (disabled || isUploading || isZipping) return;

          const eventType = event.payload.type;

          if (eventType === "enter" || eventType === "over") {
            const pos = event.payload.position;
            if (pos && isPositionInDropZone(pos.x, pos.y)) {
              setIsDragging(true);
            } else {
              setIsDragging(false);
            }
          } else if (eventType === "drop") {
            setIsDragging(false);

            const pos = event.payload.position;
            if (!pos || !isPositionInDropZone(pos.x, pos.y)) return;

            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              const filePath = paths[0];
              const fileName = filePath.split("/").pop() || filePath;

              try {
                const isDir = await checkIsDirectory(filePath);

                if (isDir) {
                  // It's a folder - zip it first
                  setIsZipping(true);
                  try {
                    const file = await zipFolderToFile(filePath);
                    onFileDrop(file);
                  } finally {
                    setIsZipping(false);
                  }
                } else if (isZipFile(fileName)) {
                  // It's a zip file - read and use directly
                  const file = await readFileToFile(filePath, fileName);
                  onFileDrop(file);
                }
                // Ignore other file types
              } catch (err) {
                console.error("Failed to process dropped item:", err);
                setIsZipping(false);
              }
            }
          } else if (eventType === "leave") {
            setIsDragging(false);
          }
        });
      } catch (err) {
        console.error("Failed to setup drag-drop listener:", err);
      }
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, [disabled, isUploading, isZipping, onFileDrop, isPositionInDropZone]);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading && !isZipping) {
        setIsDragging(true);
      }
    },
    [disabled, isUploading, isZipping]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // HTML5 drop handler as fallback (for internal drags)
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isUploading || isZipping) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (
          isZipFile(file.name) ||
          file.type === "application/zip" ||
          file.type === "application/x-zip-compressed"
        ) {
          onFileDrop(file);
        }
      }
    },
    [disabled, isUploading, isZipping, onFileDrop]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading && !isZipping) {
      inputRef.current?.click();
    }
  }, [disabled, isUploading, isZipping]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileDrop(file);
      }
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onFileDrop]
  );

  const isBusy = isUploading || isZipping;
  const isProjectBusy = isDeployingProject;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={dropZoneRef}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors",
          "flex flex-col items-center justify-center text-center min-h-[140px]",
          isDragging
            ? "border-accent bg-accent/5"
            : "border-border hover:border-text-secondary",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && !isBusy && "cursor-pointer"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isZipping ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <FolderArchive className="w-8 h-8 text-accent animate-pulse" />
            <div className="text-sm text-text-secondary font-mono">
              Zipping folder...
            </div>
          </div>
        ) : isUploading ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />

            <div className="w-full max-w-[200px] h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="text-sm text-text-secondary font-mono">{message}</div>
          </div>
        ) : (
          <>
            <Upload
              className={cn(
                "w-8 h-8 mb-2",
                isDragging ? "text-accent" : "text-text-secondary"
              )}
            />
            <div className="text-sm text-text-primary mb-1">
              {isDragging ? "Release to deploy!" : "Drop ZIP or folder here"}
            </div>
            <div className="text-xs text-text-secondary">
              Folders will be auto-zipped
            </div>
          </>
        )}
      </div>

      {projectPath && onDeployProject && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeployProject();
          }}
          disabled={disabled || isBusy || isProjectBusy}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
            "text-sm font-medium transition-colors",
            "bg-accent/10 text-accent hover:bg-accent/20",
            "border border-accent/20",
            (disabled || isBusy || isProjectBusy) && "opacity-50 cursor-not-allowed"
          )}
        >
          {isProjectBusy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{deployProjectMessage || "Deploying..."}</span>
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              <span>Deploy {projectName || "Project"}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
