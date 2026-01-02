import { useState } from "react";
import { RefreshCw, Plus, Check, GitBranch, X } from "lucide-react";
import { IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { EnvFile } from "@/types";

interface EnvFileSelectorProps {
  files: EnvFile[];
  selectedFile: string;
  onSelectFile: (filename: string) => void;
  onCreateFile: (filename: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function EnvFileSelector({
  files,
  selectedFile,
  onSelectFile,
  onCreateFile,
  onRefresh,
  loading,
}: EnvFileSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newFilename, setNewFilename] = useState(".env.");

  // Only show files that exist in the project
  const existingFiles = files.filter((f) => f.exists);

  const handleCreate = () => {
    if (newFilename && newFilename !== ".env.") {
      onCreateFile(newFilename);
      setNewFilename(".env.");
      setShowCreate(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto">
      <div className="flex items-center gap-1 flex-wrap">
        {existingFiles.map((file) => (
          <button
            key={file.filename}
            onClick={() => onSelectFile(file.filename)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
              selectedFile === file.filename
                ? "bg-accent text-[#3d2066]"
                : "bg-bg-tertiary text-text-primary hover:bg-bg-hover"
            )}
          >
            {file.filename}
            {file.isGitignored && (
              <Tooltip content="In .gitignore">
                <GitBranch className="w-3 h-3 text-green-400" />
              </Tooltip>
            )}
            {!file.isGitignored && (
              <Tooltip content="Not in .gitignore">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              </Tooltip>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {showCreate ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              className="w-32 px-2 py-1 rounded-md bg-bg-secondary border border-border text-xs font-mono focus:outline-none focus:border-accent"
              placeholder=".env.custom"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowCreate(false);
              }}
            />
            <IconButton size="sm" onClick={handleCreate} aria-label="Confirm create new file">
              <Check className="w-3.5 h-3.5 text-green-400" />
            </IconButton>
            <IconButton size="sm" onClick={() => setShowCreate(false)} aria-label="Cancel creating new file">
              <X className="w-3.5 h-3.5 text-red-400" />
            </IconButton>
          </div>
        ) : (
          <Tooltip content="Create new .env file">
            <IconButton size="sm" onClick={() => setShowCreate(true)} aria-label="Create new .env file">
              <Plus className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip content="Refresh">
          <IconButton size="sm" onClick={onRefresh} disabled={loading} aria-label="Refresh environment files">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
