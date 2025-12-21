import { useState, useMemo } from "react";
import { FileEdit, Plus, Minus, Eye } from "lucide-react";
import { CollapsibleSection } from "./CollapsibleSection";
import { FileChangeItem } from "./FileChangeItem";
import { DiffViewer } from "./DiffViewer";
import { DiffPopup } from "./DiffPopup";
import { IconButton } from "@/components/ui";
import { gitService, type GitFile } from "@/services/git";

interface ChangesSectionProps {
  projectPath: string;
  staged: GitFile[];
  modified: GitFile[];
  untracked: GitFile[];
  onRefresh: () => void;
}

export function ChangesSection({
  projectPath,
  staged,
  modified,
  untracked,
  onRefresh,
}: ChangesSectionProps) {
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [isStageAllLoading, setIsStageAllLoading] = useState(false);
  const [isUnstageAllLoading, setIsUnstageAllLoading] = useState(false);
  const [viewingDiff, setViewingDiff] = useState<{ file: GitFile; isStaged: boolean } | null>(null);
  const [showDiffPopup, setShowDiffPopup] = useState(false);
  const [diffPopupInitialIndex, setDiffPopupInitialIndex] = useState(0);

  const unstaged = [...modified, ...untracked];

  const allDiffableFiles = useMemo(() => {
    const files: { file: GitFile; isStaged: boolean }[] = [];
    staged.filter(f => f.status !== "?").forEach(file => files.push({ file, isStaged: true }));
    modified.forEach(file => files.push({ file, isStaged: false }));
    return files;
  }, [staged, modified]);
  const totalChanges = staged.length + unstaged.length;

  const handleStageFile = async (file: GitFile) => {
    setLoadingFiles((prev) => new Set(prev).add(file.path));
    await gitService.stageFile(projectPath, file.path);
    setLoadingFiles((prev) => {
      const next = new Set(prev);
      next.delete(file.path);
      return next;
    });
    onRefresh();
  };

  const handleUnstageFile = async (file: GitFile) => {
    setLoadingFiles((prev) => new Set(prev).add(file.path));
    await gitService.unstageFile(projectPath, file.path);
    setLoadingFiles((prev) => {
      const next = new Set(prev);
      next.delete(file.path);
      return next;
    });
    onRefresh();
  };

  const handleStageAll = async () => {
    setIsStageAllLoading(true);
    await gitService.stageAll(projectPath);
    setIsStageAllLoading(false);
    onRefresh();
  };

  const handleUnstageAll = async () => {
    setIsUnstageAllLoading(true);
    await gitService.unstageAll(projectPath);
    setIsUnstageAllLoading(false);
    onRefresh();
  };

  if (totalChanges === 0) {
    return null;
  }

  const handleViewDiff = (file: GitFile, isStaged: boolean) => {
    if (viewingDiff?.file.path === file.path && viewingDiff?.isStaged === isStaged) {
      setViewingDiff(null);
    } else {
      setViewingDiff({ file, isStaged });
    }
  };

  const handleOpenDiffPopup = (file?: GitFile, isStaged?: boolean) => {
    if (file && isStaged !== undefined) {
      const index = allDiffableFiles.findIndex(
        f => f.file.path === file.path && f.isStaged === isStaged
      );
      setDiffPopupInitialIndex(index >= 0 ? index : 0);
    } else {
      setDiffPopupInitialIndex(0);
    }
    setShowDiffPopup(true);
  };

  return (
    <CollapsibleSection
      title="Changes"
      icon={FileEdit}
      iconColor="text-accent-yellow"
      count={totalChanges}
      actions={
        <div className="flex items-center gap-0.5">
          {allDiffableFiles.length > 0 && (
            <IconButton
              size="sm"
              onClick={() => handleOpenDiffPopup()}
              title="View all diffs"
            >
              <Eye className="w-3.5 h-3.5" />
            </IconButton>
          )}
          {unstaged.length > 0 && (
            <IconButton
              size="sm"
              onClick={handleStageAll}
              disabled={isStageAllLoading}
              title="Stage all changes"
            >
              <Plus className="w-3.5 h-3.5" />
            </IconButton>
          )}
          {staged.length > 0 && (
            <IconButton
              size="sm"
              onClick={handleUnstageAll}
              disabled={isUnstageAllLoading}
              title="Unstage all"
            >
              <Minus className="w-3.5 h-3.5" />
            </IconButton>
          )}
        </div>
      }
    >
      <div className="space-y-2">
        {staged.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] font-medium text-accent-green uppercase tracking-wide">
              Staged ({staged.length})
            </div>
            <div className="space-y-0.5">
              {staged.map((file) => (
                <FileChangeItem
                  key={file.path}
                  file={file}
                  isStaged={true}
                  isLoading={loadingFiles.has(file.path)}
                  isViewingDiff={viewingDiff?.file.path === file.path && viewingDiff?.isStaged === true}
                  onToggleStage={handleUnstageFile}
                  onViewDiff={() => handleViewDiff(file, true)}
                />
              ))}
            </div>
          </div>
        )}

        {unstaged.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] font-medium text-text-secondary uppercase tracking-wide">
              Changes ({unstaged.length})
            </div>
            <div className="space-y-0.5">
              {unstaged.map((file) => (
                <FileChangeItem
                  key={file.path}
                  file={file}
                  isStaged={false}
                  isLoading={loadingFiles.has(file.path)}
                  isViewingDiff={viewingDiff?.file.path === file.path && viewingDiff?.isStaged === false}
                  onToggleStage={handleStageFile}
                  onViewDiff={() => handleViewDiff(file, false)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Diff Viewer */}
        {viewingDiff && (
          <div className="px-2 pt-2">
            <DiffViewer
              projectPath={projectPath}
              file={viewingDiff.file}
              isStaged={viewingDiff.isStaged}
              onClose={() => setViewingDiff(null)}
            />
          </div>
        )}

        {/* Diff Popup */}
        <DiffPopup
          isOpen={showDiffPopup}
          onClose={() => setShowDiffPopup(false)}
          projectPath={projectPath}
          files={allDiffableFiles}
          initialFileIndex={diffPopupInitialIndex}
        />
      </div>
    </CollapsibleSection>
  );
}
