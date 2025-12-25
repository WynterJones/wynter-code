import { useState, useCallback, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  List,
  Grid,
  FolderPlus,
  Bookmark,
  Upload,
  Download,
} from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { CollectionsSidebar } from "./CollectionsSidebar";
import { BookmarksList } from "./BookmarksList";
import { AddBookmarkModal } from "./AddBookmarkModal";
import { AddCollectionModal } from "./AddCollectionModal";
import { ImportBookmarksModal } from "./ImportBookmarksModal";
import { ExportBookmarksModal } from "./ExportBookmarksModal";

interface BookmarksPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 240;

export function BookmarksPopup({ isOpen, onClose }: BookmarksPopupProps) {
  const [showAddBookmark, setShowAddBookmark] = useState(false);
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const {
    bookmarks,
    collections,
    selectedCollectionId,
    viewMode,
    searchQuery,
    setViewMode,
    setSearchQuery,
    getFilteredBookmarks,
  } = useBookmarkStore();

  const filteredBookmarks = getFilteredBookmarks();
  const totalCount = bookmarks.length;

  const currentCollectionName = selectedCollectionId === null
    ? "All Bookmarks"
    : selectedCollectionId === "uncategorized"
    ? "Uncategorized"
    : collections.find((c) => c.id === selectedCollectionId)?.name || "Unknown";

  // Sidebar resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    },
    [sidebarWidth]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const deltaX = e.clientX - resizeRef.current.startX;
      const newWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, resizeRef.current.startWidth + deltaX)
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleEditBookmark = useCallback((id: string) => {
    setEditingBookmarkId(id);
    setShowAddBookmark(true);
  }, []);

  const handleEditCollection = useCallback((id: string) => {
    setEditingCollectionId(id);
    setShowAddCollection(true);
  }, []);

  const handleCloseAddBookmark = useCallback(() => {
    setShowAddBookmark(false);
    setEditingBookmarkId(null);
  }, []);

  const handleCloseAddCollection = useCallback(() => {
    setShowAddCollection(false);
    setEditingCollectionId(null);
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      title="Bookmarks"
      className="!max-w-[calc(100vw-60px)] !max-h-[calc(100vh-60px)] !h-[calc(100vh-60px)]"
    >
      <div className={cn("flex flex-col h-full", isResizing && "select-none")}>
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddBookmark(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Bookmark
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddCollection(true)}
            >
              <FolderPlus className="w-4 h-4 mr-1.5" />
              New Collection
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImport(true)}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              Import
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExport(true)}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <Input
                type="text"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-8 h-8 text-sm"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-accent text-primary-950"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-accent text-primary-950"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                )}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex">
          {/* Left Pane - Collections */}
          <div
            className="relative border-r border-border flex flex-col shrink-0 bg-bg-primary"
            style={{ width: sidebarWidth }}
          >
            <CollectionsSidebar
              onEditCollection={handleEditCollection}
            />

            {/* Resize handle */}
            <div
              onMouseDown={handleResizeStart}
              className={cn(
                "absolute top-0 right-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-accent/50 transition-colors",
                isResizing && "bg-accent/50"
              )}
            />
          </div>

          {/* Right Pane - Bookmarks */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Bookmark className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-medium">{currentCollectionName}</span>
              <span className="text-xs text-text-secondary">
                ({filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? "s" : ""})
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <BookmarksList
                bookmarks={filteredBookmarks}
                viewMode={viewMode}
                onEditBookmark={handleEditBookmark}
              />
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-bg-secondary text-xs text-text-secondary">
          <div className="flex items-center gap-4">
            <span>{totalCount} total bookmarks</span>
            <span>{collections.length} collections</span>
          </div>
          <div>{currentCollectionName}</div>
        </div>

        {/* Add/Edit Bookmark Modal */}
        <AddBookmarkModal
          isOpen={showAddBookmark}
          onClose={handleCloseAddBookmark}
          editingBookmarkId={editingBookmarkId}
        />

        {/* Add/Edit Collection Modal */}
        <AddCollectionModal
          isOpen={showAddCollection}
          onClose={handleCloseAddCollection}
          editingCollectionId={editingCollectionId}
        />

        {/* Import Bookmarks Modal */}
        <ImportBookmarksModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
        />

        {/* Export Bookmarks Modal */}
        <ExportBookmarksModal
          isOpen={showExport}
          onClose={() => setShowExport(false)}
        />
      </div>
    </Modal>
  );
}
