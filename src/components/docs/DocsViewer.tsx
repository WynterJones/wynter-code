import { useState, useCallback, useEffect } from "react";
import { FileText, Folder, ChevronRight, ChevronDown, Search, Loader2, FolderSearch, RefreshCw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ScrollArea, Input, Button, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useDocsStore } from "@/stores";

interface MarkdownFile {
  name: string;
  path: string;
  folder: string;
}

interface DocsViewerProps {
  projectPath: string;
  onFileOpen?: (path: string) => void;
}

type ScanState = "idle" | "scanning" | "done";

export function DocsViewer({ projectPath, onFileOpen }: DocsViewerProps) {
  const { getDocs, setDocs: cacheDocs } = useDocsStore();
  const cachedData = getDocs(projectPath);

  const [docs, setDocs] = useState<MarkdownFile[]>(cachedData?.docs || []);
  const [scanState, setScanState] = useState<ScanState>(cachedData ? "done" : "idle");
  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize expanded folders from cached docs
  useEffect(() => {
    if (cachedData?.docs) {
      const folders = new Set(cachedData.docs.map((f) => f.folder).filter(Boolean));
      setExpandedFolders(folders);
    }
  }, []);

  // Auto-scan on mount if no cached data
  useEffect(() => {
    if (!cachedData && scanState === "idle") {
      loadDocs(false);
    }
  }, [projectPath]);

  const loadDocs = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setScanState("scanning");
      }

      // Use the efficient dedicated command
      const markdownFiles = await invoke<MarkdownFile[]>("find_markdown_files", {
        projectPath,
      });

      setDocs(markdownFiles);
      cacheDocs(projectPath, markdownFiles);

      // Auto-expand all folders
      const folders = new Set(markdownFiles.map((f) => f.folder).filter(Boolean));
      setExpandedFolders(folders);
    } catch (error) {
      console.error("Failed to load docs:", error);
    } finally {
      setScanState("done");
      setIsRefreshing(false);
    }
  };

  const toggleFolder = useCallback((folder: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) {
        next.delete(folder);
      } else {
        next.add(folder);
      }
      return next;
    });
  }, []);

  const filteredDocs = docs.filter(
    (doc) =>
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.folder.toLowerCase().includes(search.toLowerCase())
  );

  // Group by folder
  const groupedDocs = filteredDocs.reduce(
    (acc, doc) => {
      const key = doc.folder || "__root__";
      if (!acc[key]) acc[key] = [];
      acc[key].push(doc);
      return acc;
    },
    {} as Record<string, MarkdownFile[]>
  );

  // Sort folder keys (root first)
  const folderKeys = Object.keys(groupedDocs).sort((a, b) => {
    if (a === "__root__") return -1;
    if (b === "__root__") return 1;
    return a.localeCompare(b);
  });

  // Start screen - waiting for user to initiate scan
  if (scanState === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-12 h-12 rounded-full bg-bg-hover flex items-center justify-center mb-4">
          <FolderSearch className="w-6 h-6 text-accent-blue" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">Find Documentation</h3>
        <p className="text-xs text-text-secondary text-center mb-4">
          Scan your project for markdown files
        </p>
        <Button size="sm" onClick={() => loadDocs(false)} className="gap-1.5">
          <Search className="w-3.5 h-3.5" />
          Scan Project
        </Button>
      </div>
    );
  }

  // Loading screen - scanning in progress
  if (scanState === "scanning") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 text-accent-blue animate-spin mb-3" />
        <p className="text-sm text-text-primary font-medium">Scanning for docs...</p>
        <p className="text-xs text-text-secondary mt-1">Searching markdown files</p>
      </div>
    );
  }

  // No docs found after scan
  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-12 h-12 rounded-full bg-bg-hover flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-text-secondary" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">No Docs Found</h3>
        <p className="text-xs text-text-secondary text-center mb-4">
          No markdown files in this project
        </p>
        <Button size="sm" variant="ghost" onClick={() => loadDocs(false)} className="gap-1.5">
          <Search className="w-3.5 h-3.5" />
          Scan Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search docs..."
              className="pl-7 h-7 text-xs"
            />
          </div>
          <Tooltip content="Refresh" side="bottom">
            <button
              onClick={() => loadDocs(true)}
              disabled={isRefreshing}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
                isRefreshing && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Docs List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {folderKeys.map((folderKey) => {
            const isRoot = folderKey === "__root__";
            const files = groupedDocs[folderKey];
            const isExpanded = isRoot || expandedFolders.has(folderKey);

            return (
              <div key={folderKey}>
                {/* Folder Header */}
                {!isRoot && (
                  <button
                    onClick={() => toggleFolder(folderKey)}
                    className={cn(
                      "flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md",
                      "text-xs font-medium text-text-secondary",
                      "hover:bg-bg-hover transition-colors"
                    )}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <Folder className="w-3.5 h-3.5 text-accent-yellow" />
                    <span className="truncate">{folderKey}</span>
                    <span className="ml-auto text-text-secondary/60">
                      {files.length}
                    </span>
                  </button>
                )}

                {/* Files */}
                {isExpanded && (
                  <div className={cn(!isRoot && "ml-3 border-l border-border/50 pl-2")}>
                    {files.map((doc) => (
                      <button
                        key={doc.path}
                        onClick={() => onFileOpen?.(doc.path)}
                        className={cn(
                          "flex items-center gap-2 w-full px-2 py-1.5 rounded-md",
                          "text-sm text-text-primary",
                          "hover:bg-bg-hover transition-colors",
                          "text-left"
                        )}
                      >
                        <FileText className="w-4 h-4 text-accent-blue flex-shrink-0" />
                        <span className="truncate">{doc.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filteredDocs.length === 0 && search && (
            <p className="text-xs text-text-secondary text-center py-4">
              No docs match "{search}"
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border">
        <p className="text-xs text-text-secondary">
          {docs.length} document{docs.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
