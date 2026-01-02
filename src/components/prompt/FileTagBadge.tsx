import { FileCode, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileReference {
  id: string;
  path: string;
  displayPath: string;
}

function truncatePath(path: string, maxLength: number = 30): string {
  if (path.length <= maxLength) return path;

  const parts = path.split("/");
  if (parts.length <= 2) {
    return path.slice(0, maxLength - 3) + "...";
  }

  const fileName = parts[parts.length - 1];
  const firstPart = parts[0];

  if (fileName.length + firstPart.length + 5 >= maxLength) {
    return ".../" + fileName.slice(-(maxLength - 4));
  }

  return `${firstPart}/.../${fileName}`;
}

interface FileTagBadgeProps {
  file: FileReference;
  onRemove: (id: string) => void;
}

function FileTagBadge({ file, onRemove }: FileTagBadgeProps) {
  const displayPath = truncatePath(file.displayPath);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1",
        "rounded-md text-xs font-mono",
        "bg-accent/10 text-accent border border-accent/20",
        "max-w-[130px]"
      )}
      title={file.path}
    >
      <FileCode className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{displayPath}</span>
      <button
        type="button"
        onClick={() => onRemove(file.id)}
        aria-label="Remove file reference"
        className={cn(
          "flex-shrink-0 p-0.5 -mr-0.5 rounded",
          "hover:bg-accent/20 transition-colors"
        )}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

interface FileTagBadgesProps {
  files: FileReference[];
  onRemove: (id: string) => void;
}

export function FileTagBadges({ files, onRemove }: FileTagBadgesProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {files.map((file) => (
        <FileTagBadge key={file.id} file={file} onRemove={onRemove} />
      ))}
    </div>
  );
}
