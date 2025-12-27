import { CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemRowProps {
  name: string;
  path: string;
  size: string;
  lastModified?: string;
  description?: string;
  selected: boolean;
  onToggle: () => void;
}

function shortenPath(path: string): string {
  const home = path.match(/^\/Users\/[^/]+/)?.[0];
  if (home) {
    return path.replace(home, "~");
  }
  return path;
}

export function ItemRow({
  name,
  path,
  size,
  lastModified,
  description,
  selected,
  onToggle,
}: ItemRowProps) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
        selected
          ? "bg-accent/10 border-accent/30"
          : "bg-bg-tertiary/50 border-border hover:border-border-hover"
      )}
    >
      <div className="flex-shrink-0">
        {selected ? (
          <CheckSquare className="w-5 h-5 text-accent" />
        ) : (
          <Square className="w-5 h-5 text-text-secondary" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary truncate">{name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent font-mono flex-shrink-0">
            {size}
          </span>
          {description && (
            <span className="text-xs text-text-tertiary flex-shrink-0">
              {description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-secondary truncate">
            {shortenPath(path)}
          </span>
          {lastModified && (
            <span className="text-[10px] text-text-secondary/50 flex-shrink-0">
              {lastModified}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
