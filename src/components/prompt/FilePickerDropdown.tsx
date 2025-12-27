import { useState, useEffect, useRef, useMemo } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui";
import { FileIcon } from "@/components/files/FileIcon";

interface FilePickerDropdownProps {
  isOpen: boolean;
  searchQuery: string;
  files: string[];
  position: { top: number; left: number };
  onSelect: (path: string) => void;
  onClose: () => void;
}

function fuzzyMatch(query: string, text: string): { match: boolean; score: number } {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  if (textLower.includes(queryLower)) {
    return { match: true, score: 100 - textLower.indexOf(queryLower) };
  }

  let queryIndex = 0;
  let score = 0;
  let consecutiveMatches = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
      consecutiveMatches++;
      score += consecutiveMatches * 2;
    } else {
      consecutiveMatches = 0;
    }
  }

  return {
    match: queryIndex === queryLower.length,
    score,
  };
}

function getFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || parts[parts.length - 2] || path;
}

function getParentPath(path: string): string {
  const parts = path.split("/");
  parts.pop();
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

export function FilePickerDropdown({
  isOpen,
  searchQuery,
  files,
  position,
  onSelect,
  onClose,
}: FilePickerDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) {
      return files.slice(0, 20).map((f) => ({ path: f, score: 0 }));
    }

    return files
      .map((file) => {
        const result = fuzzyMatch(searchQuery, file);
        return { path: file, ...result };
      })
      .filter((f) => f.match)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [files, searchQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredFiles.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Tab":
        case "Enter":
          e.preventDefault();
          if (filteredFiles[selectedIndex]) {
            onSelect(filteredFiles[selectedIndex].path);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredFiles, onSelect, onClose]);

  if (!isOpen) return null;

  // Show empty state when there are files but no matches
  const showEmptyState = files.length > 0 && filteredFiles.length === 0 && searchQuery.length > 0;
  // Don't show if there are no files at all
  if (files.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50",
        "w-80 max-h-64",
        "bg-bg-secondary border border-border rounded-lg shadow-xl",
        "overflow-hidden"
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <ScrollArea className="max-h-64">
        <div className="py-1">
          {showEmptyState ? (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-text-secondary">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No matching files</p>
              <p className="text-xs opacity-70">Try a different search term</p>
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <button
                key={file.path}
                type="button"
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2",
                  "text-left text-sm",
                  "transition-colors",
                  index === selectedIndex
                    ? "bg-accent/10 text-text-primary"
                    : "text-text-secondary hover:bg-bg-hover"
                )}
                onClick={() => onSelect(file.path)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <FileIcon
                  name={getFileName(file.path)}
                  isDirectory={file.path.endsWith("/")}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs truncate">
                    {getFileName(file.path)}
                  </div>
                  {getParentPath(file.path) && (
                    <div className="text-xs text-text-secondary truncate">
                      {getParentPath(file.path)}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
