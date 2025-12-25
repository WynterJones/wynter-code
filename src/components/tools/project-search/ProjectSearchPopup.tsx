import { useState, useCallback } from "react";
import { Modal } from "@/components/ui";
import { useSearchStore, useProjectStore } from "@/stores";
import { SearchHeader } from "./SearchHeader";
import { SearchResults } from "./SearchResults";

interface ProjectSearchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFile?: (path: string, line: number) => void;
}

export function ProjectSearchPopup({
  isOpen,
  onClose,
  onOpenFile,
}: ProjectSearchPopupProps) {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getProject = useProjectStore((s) => s.getProject);
  const activeProject = activeProjectId ? getProject(activeProjectId) : null;

  const {
    query,
    setQuery,
    replaceText,
    setReplaceText,
    showReplace,
    toggleShowReplace,
    options,
    setOptions,
    results,
    totalMatches,
    totalFiles,
    searchTimeMs,
    isSearching,
    searchError,
    truncated,
    currentMatchIndex,
    expandedFiles,
    search,
    replaceInFile,
    replaceAll,
    navigateNext,
    navigatePrev,
    setCurrentMatchIndex,
    toggleFileExpanded,
    expandAll,
    collapseAll,
  } = useSearchStore();

  const [fileExtensionFilter, setFileExtensionFilter] = useState("");

  const handleSearch = useCallback(() => {
    if (activeProject?.path && query) {
      // Parse file extension filter
      const extensions = fileExtensionFilter
        .split(",")
        .map((ext) => ext.trim().replace(/^\*\.?/, ""))
        .filter(Boolean);

      setOptions({
        fileExtensions: extensions.length > 0 ? extensions : undefined,
      });

      search(activeProject.path);
    }
  }, [activeProject?.path, query, fileExtensionFilter, setOptions, search]);

  const handleReplaceInFile = useCallback(async () => {
    if (!activeProject?.path || results.length === 0) return;

    // Find the file containing the current match
    let matchCount = 0;
    for (const file of results) {
      if (matchCount + file.totalMatches > currentMatchIndex) {
        await replaceInFile(activeProject.path, file.filePath);
        break;
      }
      matchCount += file.totalMatches;
    }
  }, [activeProject?.path, results, currentMatchIndex, replaceInFile]);

  const handleReplaceAll = useCallback(async () => {
    if (!activeProject?.path) return;
    await replaceAll(activeProject.path);
  }, [activeProject?.path, replaceAll]);

  const handleOpenFile = useCallback(
    (path: string, line: number) => {
      if (onOpenFile) {
        onOpenFile(path, line);
      } else {
        // Emit event for file opening
        window.dispatchEvent(
          new CustomEvent("open-file-at-line", {
            detail: { path, line },
          })
        );
      }
    },
    [onOpenFile]
  );

  const handleMatchClick = useCallback(
    (globalIndex: number) => {
      setCurrentMatchIndex(globalIndex);
    },
    [setCurrentMatchIndex]
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeProject ? `Project Search — ${activeProject.name}` : "Project Search"}
      size="full"
      overlayClassName="!p-[30px]"
      className="!max-w-none !max-h-none w-full h-full"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {!activeProject ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            <p>Open a project to search</p>
          </div>
        ) : (
          <>
            <SearchHeader
              query={query}
              onQueryChange={setQuery}
              replaceText={replaceText}
              onReplaceTextChange={setReplaceText}
              showReplace={showReplace}
              onToggleReplace={toggleShowReplace}
              currentMatch={currentMatchIndex}
              totalMatches={totalMatches}
              onNavigatePrev={navigatePrev}
              onNavigateNext={navigateNext}
              isSearching={isSearching}
              caseSensitive={options.caseSensitive || false}
              regexMode={options.regexMode || false}
              wholeWord={options.wholeWord || false}
              onToggleCaseSensitive={() =>
                setOptions({ caseSensitive: !options.caseSensitive })
              }
              onToggleRegex={() => setOptions({ regexMode: !options.regexMode })}
              onToggleWholeWord={() =>
                setOptions({ wholeWord: !options.wholeWord })
              }
              onSearch={handleSearch}
              onReplaceInFile={handleReplaceInFile}
              onReplaceAll={handleReplaceAll}
              fileExtensionFilter={fileExtensionFilter}
              onFileExtensionFilterChange={setFileExtensionFilter}
            />

            <SearchResults
              results={results}
              totalMatches={totalMatches}
              totalFiles={totalFiles}
              searchTimeMs={searchTimeMs}
              truncated={truncated}
              searchError={searchError}
              isSearching={isSearching}
              query={query}
              expandedFiles={expandedFiles}
              onToggleFileExpanded={toggleFileExpanded}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              onOpenFile={handleOpenFile}
              currentMatchIndex={currentMatchIndex}
              onMatchClick={handleMatchClick}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
