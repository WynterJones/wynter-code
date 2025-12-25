import { useState, useRef } from "react";
import {
  Folder,
  FolderOpen,
  Inbox,
  Bookmark,
  MoreVertical,
  Edit2,
  Trash2,
  GripVertical,
} from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import { useBookmarkStore, type Collection } from "@/stores/bookmarkStore";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CollectionsSidebarProps {
  onEditCollection: (id: string) => void;
}

export function CollectionsSidebar({ onEditCollection }: CollectionsSidebarProps) {
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const {
    collections,
    selectedCollectionId,
    setSelectedCollection,
    deleteCollection,
    getBookmarkCount,
    reorderCollections,
  } = useBookmarkStore();

  const sortedCollections = [...collections].sort((a, b) => a.order - b.order);
  const allCount = getBookmarkCount(null);
  const uncategorizedCount = getBookmarkCount("uncategorized");

  const handleDeleteCollection = (id: string) => {
    if (confirm("Delete this collection? Bookmarks will be moved to Uncategorized.")) {
      deleteCollection(id, true);
    }
    setContextMenuId(null);
  };

  const getCollectionIcon = (collection: Collection) => {
    if (collection.icon) {
      const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[collection.icon];
      if (IconComponent) {
        return <IconComponent className="w-4 h-4" />;
      }
    }
    return selectedCollectionId === collection.id ? (
      <FolderOpen className="w-4 h-4" />
    ) : (
      <Folder className="w-4 h-4" />
    );
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    // Add a slight delay to allow the drag image to be set
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = "0.5";
      }
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = sortedCollections.findIndex((c) => c.id === draggedId);
    const targetIndex = sortedCollections.findIndex((c) => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...sortedCollections];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    reorderCollections(newOrder.map((c) => c.id));
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <OverlayScrollbarsComponent
      options={{
        scrollbars: {
          theme: "os-theme-custom",
          autoHide: "leave",
          autoHideDelay: 100,
        },
      }}
      className="flex-1 os-theme-custom"
    >
      <div className="p-2">
        {/* All Bookmarks */}
        <button
          onClick={() => setSelectedCollection(null)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors",
            selectedCollectionId === null
              ? "bg-accent/20 text-accent"
              : "text-text-primary hover:bg-bg-hover"
          )}
        >
          <Bookmark className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-sm font-medium truncate">All Bookmarks</span>
          <span className="text-xs text-text-secondary">{allCount}</span>
        </button>

        {/* Separator */}
        <div className="my-2 border-t border-border" />

        {/* Collections Label */}
        <div className="px-3 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
          Collections
        </div>

        {/* Collections */}
        {sortedCollections.map((collection) => (
          <div
            key={collection.id}
            ref={draggedId === collection.id ? dragNodeRef : null}
            draggable
            onDragStart={(e) => handleDragStart(e, collection.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, collection.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, collection.id)}
            className={cn(
              "relative group",
              dragOverId === collection.id && "ring-2 ring-accent ring-inset rounded-md",
              draggedId === collection.id && "opacity-50"
            )}
          >
            <div
              className={cn(
                "w-full flex items-center gap-1 pr-2 py-1.5 rounded-md text-left transition-colors",
                selectedCollectionId === collection.id
                  ? "bg-accent/20 text-accent"
                  : "text-text-primary hover:bg-bg-hover"
              )}
            >
              {/* Drag handle */}
              <div className="pl-1 pr-0.5 cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-3.5 h-3.5 text-text-secondary" />
              </div>

              {/* Collection button */}
              <button
                onClick={() => setSelectedCollection(collection.id)}
                className="flex-1 flex items-center gap-2 min-w-0"
              >
                <span
                  className="flex-shrink-0"
                  style={{ color: collection.color || undefined }}
                >
                  {getCollectionIcon(collection)}
                </span>
                <span className="flex-1 text-sm text-left truncate">{collection.name}</span>
                <span className="text-xs text-text-secondary">
                  {getBookmarkCount(collection.id)}
                </span>
              </button>

              {/* Context menu trigger - always visible */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenuId(contextMenuId === collection.id ? null : collection.id);
                }}
                className={cn(
                  "p-1 rounded transition-colors shrink-0",
                  "opacity-50 group-hover:opacity-100 hover:bg-bg-tertiary",
                  contextMenuId === collection.id && "opacity-100 bg-bg-tertiary"
                )}
              >
                <MoreVertical className="w-3.5 h-3.5 text-text-secondary" />
              </button>
            </div>

            {/* Context menu */}
            {contextMenuId === collection.id && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setContextMenuId(null)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 bg-bg-secondary border border-border rounded-md shadow-lg py-1 min-w-[120px]">
                  <button
                    onClick={() => {
                      onEditCollection(collection.id);
                      setContextMenuId(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-bg-hover"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCollection(collection.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-accent-red hover:bg-bg-hover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {collections.length === 0 && (
          <div className="px-3 py-4 text-xs text-text-secondary text-center">
            No collections yet
          </div>
        )}

        {/* Uncategorized - only show if there are uncategorized bookmarks */}
        {uncategorizedCount > 0 && (
          <>
            <div className="my-2 border-t border-border" />
            <button
              onClick={() => setSelectedCollection("uncategorized")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors",
                selectedCollectionId === "uncategorized"
                  ? "bg-accent/20 text-accent"
                  : "text-text-primary hover:bg-bg-hover"
              )}
            >
              <Inbox className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-sm truncate">Uncategorized</span>
              <span className="text-xs text-text-secondary">{uncategorizedCount}</span>
            </button>
          </>
        )}
      </div>
    </OverlayScrollbarsComponent>
  );
}
