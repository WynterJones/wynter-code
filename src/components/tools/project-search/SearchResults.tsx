import { useMemo } from "react";
import {
  FoldVertical,
  UnfoldVertical,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { ScrollArea, IconButton, Tooltip } from "@/components/ui";
import { FileSection } from "./FileSection";
import type { FileSearchResult } from "@/types";

interface SearchResultsProps {
  results: FileSearchResult[];
  totalMatches: number;
  totalFiles: number;
  searchTimeMs: number;
  truncated: boolean;
  searchError: string | null;
  isSearching: boolean;
  query: string;
  expandedFiles: Set<string>;
  onToggleFileExpanded: (filePath: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onOpenFile: (path: string, line: number) => void;
  currentMatchIndex: number;
  onMatchClick: (globalIndex: number) => void;
}

export function SearchResults({
  results,
  totalMatches,
  totalFiles,
  searchTimeMs,
  truncated,
  searchError,
  isSearching,
  query,
  expandedFiles,
  onToggleFileExpanded,
  onExpandAll,
  onCollapseAll,
  onOpenFile,
  currentMatchIndex,
  onMatchClick,
}: SearchResultsProps) {
  // Calculate global match offset for each file
  const fileMatchOffsets = useMemo(() => {
    const offsets: number[] = [];
    let offset = 0;
    for (const file of results) {
      offsets.push(offset);
      offset += file.totalMatches;
    }
    return offsets;
  }, [results]);

  // Handle match click with global index calculation
  const handleMatchClick = (fileIndex: number, localMatchIndex: number) => {
    const globalIndex = fileMatchOffsets[fileIndex] + localMatchIndex;
    onMatchClick(globalIndex);

    // Open the file at the match line
    const file = results[fileIndex];
    const match = file.matches[localMatchIndex];
    if (match) {
      onOpenFile(file.filePath, match.lineNumber);
    }
  };

  // Empty state
  if (!query && !isSearching) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        <p>Enter a search term to find in project</p>
      </div>
    );
  }

  // Error state
  if (searchError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-4">
          <AlertTriangle className="w-8 h-8 text-accent-red mx-auto mb-2" />
          <p className="text-sm text-text-primary mb-1">Search failed</p>
          <p className="text-xs text-text-secondary">{searchError}</p>
        </div>
      </div>
    );
  }

  // No results
  if (!isSearching && query && results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        <p>No results found for "{query}"</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Results Header */}
      {results.length > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-tertiary/30">
          <div className="flex items-center gap-2 text-[10px] text-text-secondary">
            <span>
              {totalMatches} {totalMatches === 1 ? "result" : "results"} in{" "}
              {totalFiles} {totalFiles === 1 ? "file" : "files"}
            </span>
            {truncated && (
              <span className="text-accent-yellow">(truncated)</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {searchTimeMs}ms
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip content="Expand All">
              <IconButton size="sm" onClick={onExpandAll}>
                <UnfoldVertical className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
            <Tooltip content="Collapse All">
              <IconButton size="sm" onClick={onCollapseAll}>
                <FoldVertical className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Results List */}
      <ScrollArea className="flex-1">
        {results.map((file, fileIndex) => (
          <FileSection
            key={file.filePath}
            result={file}
            isExpanded={expandedFiles.has(file.filePath)}
            onToggle={() => onToggleFileExpanded(file.filePath)}
            onOpenFile={onOpenFile}
            onMatchClick={handleMatchClick}
            selectedMatchIndex={currentMatchIndex}
            fileIndex={fileIndex}
            globalMatchOffset={fileMatchOffsets[fileIndex]}
          />
        ))}
      </ScrollArea>
    </div>
  );
}
