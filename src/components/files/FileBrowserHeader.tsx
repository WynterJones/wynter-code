import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, Home, Eye, EyeOff } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface FileBrowserHeaderProps {
  currentPath: string;
  canGoBack: boolean;
  canGoForward: boolean;
  showHiddenFiles: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onNavigateTo: (path: string) => void;
  onGoHome: () => void;
  onToggleHiddenFiles: () => void;
}

function getBreadcrumbs(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts.map((part, index) => ({
    name: part,
    path: "/" + parts.slice(0, index + 1).join("/"),
  }));
}

export function FileBrowserHeader({
  currentPath,
  canGoBack,
  canGoForward,
  showHiddenFiles,
  onGoBack,
  onGoForward,
  onGoUp,
  onNavigateTo,
  onGoHome,
  onToggleHiddenFiles,
}: FileBrowserHeaderProps) {
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [pathInputValue, setPathInputValue] = useState(currentPath);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPathInputValue(currentPath);
  }, [currentPath]);

  useEffect(() => {
    if (isEditingPath && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingPath]);

  const handlePathSubmit = () => {
    setIsEditingPath(false);
    if (pathInputValue.trim() && pathInputValue !== currentPath) {
      onNavigateTo(pathInputValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePathSubmit();
    } else if (e.key === "Escape") {
      setIsEditingPath(false);
      setPathInputValue(currentPath);
    }
  };

  const breadcrumbs = getBreadcrumbs(currentPath);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-secondary flex-shrink-0">
      <div className="flex items-center gap-1">
        <IconButton size="sm" onClick={onGoBack} disabled={!canGoBack} aria-label="Go back">
          <ChevronLeft className="w-4 h-4" />
        </IconButton>
        <IconButton size="sm" onClick={onGoForward} disabled={!canGoForward} aria-label="Go forward">
          <ChevronRight className="w-4 h-4" />
        </IconButton>
        <IconButton size="sm" onClick={onGoUp} aria-label="Go up one level">
          <ChevronUp className="w-4 h-4" />
        </IconButton>
        <IconButton size="sm" onClick={onGoHome} aria-label="Go to home directory">
          <Home className="w-4 h-4" />
        </IconButton>
        <div className="w-px h-4 bg-border mx-1" />
        <Tooltip content={showHiddenFiles ? "Hide Dot Files" : "Show Dot Files"} side="bottom">
          <IconButton
            size="sm"
            onClick={onToggleHiddenFiles}
            className={showHiddenFiles ? "text-accent" : ""}
            aria-label={showHiddenFiles ? "Hide hidden files" : "Show hidden files"}
          >
            {showHiddenFiles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </IconButton>
        </Tooltip>
      </div>

      <div className="flex-1 flex items-center min-w-0">
        {isEditingPath ? (
          <input
            ref={inputRef}
            type="text"
            value={pathInputValue}
            onChange={(e) => setPathInputValue(e.target.value)}
            onBlur={handlePathSubmit}
            onKeyDown={handleKeyDown}
            className="flex-1 px-2 py-1 text-sm bg-bg-tertiary border border-border rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        ) : (
          <div
            onClick={() => setIsEditingPath(true)}
            className="flex-1 flex items-center gap-1 text-sm overflow-hidden cursor-pointer hover:bg-bg-hover rounded px-2 py-1 transition-colors"
          >
            {breadcrumbs.length === 0 ? (
              <span className="text-text-secondary">/</span>
            ) : (
              breadcrumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1 min-w-0">
                  {i > 0 && (
                    <ChevronRight className="w-3 h-3 text-text-secondary flex-shrink-0" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateTo(crumb.path);
                    }}
                    className={cn(
                      "truncate transition-colors",
                      i === breadcrumbs.length - 1
                        ? "text-text-primary font-medium"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
