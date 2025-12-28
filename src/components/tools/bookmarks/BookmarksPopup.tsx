import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Plus,
  Search,
  List,
  Grid,
  FolderPlus,
  Bookmark,
  Upload,
  Download,
  CheckSquare,
  Square,
  Trash2,
  FolderInput,
  X,
  Folder,
  Inbox,
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
    bulkEditMode,
    selectedBookmarkIds,
    setViewMode,
    setSearchQuery,
    setBulkEditMode,
    toggleBookmarkSelection,
    selectAllBookmarks,
    clearBookmarkSelection,
    bulkDeleteBookmarks,
    bulkMoveBookmarks,
    getFilteredBookmarks,
  } = useBookmarkStore();

  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const filteredBookmarks = getFilteredBookmarks();
  const totalCount = bookmarks.length;
  const selectedCount = selectedBookmarkIds.size;

  const allFilteredSelected = useMemo(() => {
    if (filteredBookmarks.length === 0) return false;
    return filteredBookmarks.every((b) => selectedBookmarkIds.has(b.id));
  }, [filteredBookmarks, selectedBookmarkIds]);

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

  const handleToggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      clearBookmarkSelection();
    } else {
      selectAllBookmarks(filteredBookmarks.map((b) => b.id));
    }
  }, [allFilteredSelected, clearBookmarkSelection, selectAllBookmarks, filteredBookmarks]);

  const handleBulkDelete = useCallback(() => {
    if (selectedCount > 0) {
      bulkDeleteBookmarks(Array.from(selectedBookmarkIds));
    }
  }, [selectedCount, selectedBookmarkIds, bulkDeleteBookmarks]);

  const handleBulkMove = useCallback((collectionId: string | null) => {
    if (selectedCount > 0) {
      bulkMoveBookmarks(Array.from(selectedBookmarkIds), collectionId);
      setShowMoveMenu(false);
    }
  }, [selectedCount, selectedBookmarkIds, bulkMoveBookmarks]);

  const handleExitBulkMode = useCallback(() => {
    setBulkEditMode(false);
  }, [setBulkEditMode]);

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
          {bulkEditMode ? (
            /* Bulk Edit Toolbar */
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExitBulkMode}
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Cancel
                </Button>
                <div className="h-5 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleSelectAll}
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 mr-1.5" />
                  ) : (
                    <Square className="w-4 h-4 mr-1.5" />
                  )}
                  {allFilteredSelected ? "Deselect All" : "Select All"}
                </Button>
                {selectedCount > 0 && (
                  <span className="text-sm text-text-secondary">
                    {selectedCount} selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedCount > 0 && (
                  <>
                    {/* Move to collection dropdown */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowMoveMenu(!showMoveMenu)}
                      >
                        <FolderInput className="w-4 h-4 mr-1.5" />
                        Move to...
                      </Button>
                      {showMoveMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowMoveMenu(false)}
                          />
                          <div className="absolute right-0 top-full mt-1 z-20 bg-bg-secondary border border-border rounded-lg shadow-lg py-1.5 w-[200px] max-h-[280px] overflow-y-auto dropdown-solid">
                            <div className="px-2 pb-1 mb-1 border-b border-border">
                              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                                Move to Collection
                              </span>
                            </div>
                            <button
                              onClick={() => handleBulkMove(null)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover text-left"
                            >
                              <Inbox className="w-4 h-4 text-text-secondary flex-shrink-0" />
                              <span className="truncate">Uncategorized</span>
                            </button>
                            {collections.length > 0 && (
                              <div className="my-1 border-t border-border" />
                            )}
                            {collections.map((collection) => (
                              <button
                                key={collection.id}
                                onClick={() => handleBulkMove(collection.id)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover text-left"
                              >
                                <Folder className="w-4 h-4 text-text-secondary flex-shrink-0" style={{ color: collection.color || undefined }} />
                                <span className="truncate">{collection.name}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="text-accent-red hover:text-accent-red"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            /* Normal Toolbar */
            <>
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
                {/* Bulk Edit Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBulkEditMode(true)}
                >
                  <CheckSquare className="w-4 h-4 mr-1.5" />
                  Select
                </Button>

                <div className="h-5 w-px bg-border" />

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
            </>
          )}
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
                bulkEditMode={bulkEditMode}
                selectedBookmarkIds={selectedBookmarkIds}
                onToggleSelection={toggleBookmarkSelection}
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
