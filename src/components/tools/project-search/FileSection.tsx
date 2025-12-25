import { useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  ExternalLink,
} from "lucide-react";
import { IconButton } from "@/components/ui";
import { MatchLine, ContextLine, getFileLanguage } from "./MatchLine";
import type { FileSearchResult, SearchMatch } from "@/types";

interface FileSectionProps {
  result: FileSearchResult;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenFile: (path: string, line: number) => void;
  onMatchClick: (fileIndex: number, matchIndex: number) => void;
  selectedMatchIndex: number | null;
  fileIndex: number;
  globalMatchOffset: number;
}

export function FileSection({
  result,
  isExpanded,
  onToggle,
  onOpenFile,
  onMatchClick,
  selectedMatchIndex,
  fileIndex,
  globalMatchOffset,
}: FileSectionProps) {
  const language = useMemo(
    () => getFileLanguage(result.filePath),
    [result.filePath]
  );

  // Group consecutive matches to show context efficiently
  const matchGroups = useMemo(() => {
    const groups: { matches: SearchMatch[]; startLine: number }[] = [];
    let currentGroup: SearchMatch[] = [];
    let lastLine = -10;

    for (const match of result.matches) {
      // If this match is within 3 lines of the last, add to current group
      if (match.lineNumber - lastLine <= 3) {
        currentGroup.push(match);
      } else {
        if (currentGroup.length > 0) {
          groups.push({
            matches: currentGroup,
            startLine: currentGroup[0].lineNumber,
          });
        }
        currentGroup = [match];
      }
      lastLine = match.lineNumber;
    }

    if (currentGroup.length > 0) {
      groups.push({
        matches: currentGroup,
        startLine: currentGroup[0].lineNumber,
      });
    }

    return groups;
  }, [result.matches]);

  return (
    <div className="border-b border-border last:border-b-0">
      {/* File Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-hover transition-colors select-none bg-bg-tertiary/50"
        onClick={onToggle}
      >
        <span className="text-text-secondary">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>

        <FileCode className="w-3.5 h-3.5 text-text-secondary" />

        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-text-primary truncate">
            {result.fileName}
          </span>
          <span className="ml-2 text-[10px] text-text-secondary truncate">
            {result.relativePath}
          </span>
        </div>

        <span className="text-[10px] text-text-secondary px-1.5 py-0.5 bg-bg-secondary rounded">
          {result.totalMatches} {result.totalMatches === 1 ? "match" : "matches"}
        </span>

        <IconButton
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpenFile(result.filePath, result.matches[0]?.lineNumber || 1);
          }}
          title="Open file"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </IconButton>
      </div>

      {/* Matches */}
      {isExpanded && (
        <div className="bg-bg-secondary/30">
          {matchGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="border-t border-border/50">
              {group.matches.map((match, matchIdx) => {
                // Calculate global match index for this match
                let localIndex = 0;
                for (let i = 0; i < groupIndex; i++) {
                  localIndex += matchGroups[i].matches.length;
                }
                localIndex += matchIdx;

                const globalIndex = globalMatchOffset + localIndex;
                const isSelected = selectedMatchIndex === globalIndex;

                return (
                  <div key={`${match.lineNumber}-${matchIdx}`}>
                    {/* Context before (only for first match in group) */}
                    {matchIdx === 0 &&
                      match.contextBefore.map((ctx, ctxIdx) => (
                        <ContextLine
                          key={`before-${ctxIdx}`}
                          content={ctx}
                          lineNumber={
                            match.lineNumber -
                            match.contextBefore.length +
                            ctxIdx
                          }
                          language={language}
                        />
                      ))}

                    {/* Match line */}
                    <MatchLine
                      match={match}
                      isSelected={isSelected}
                      onClick={() => onMatchClick(fileIndex, localIndex)}
                    />

                    {/* Context after (only for last match in group) */}
                    {matchIdx === group.matches.length - 1 &&
                      match.contextAfter.map((ctx, ctxIdx) => (
                        <ContextLine
                          key={`after-${ctxIdx}`}
                          content={ctx}
                          lineNumber={match.lineNumber + 1 + ctxIdx}
                          language={language}
                        />
                      ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
