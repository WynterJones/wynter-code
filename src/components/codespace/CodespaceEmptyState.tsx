import { Code, Plus } from "lucide-react";

interface CodespaceEmptyStateProps {
  onOpenFile: () => void;
}

export function CodespaceEmptyState({ onOpenFile }: CodespaceEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-bg-primary blueprint-grid">
      <div className="flex flex-col items-center gap-3 opacity-80">
        <Code className="w-16 h-16 text-text-secondary/30" />
        <div className="text-center">
          <h3 className="text-lg font-medium text-text-primary mb-1">Codespace</h3>
          <p className="text-sm text-text-secondary mb-4 max-w-xs">
            Open files to start editing, or drag files from the sidebar
          </p>
          <button
            onClick={onOpenFile}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-primary-950 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Open File
          </button>
        </div>
      </div>
    </div>
  );
}
