import { useState } from "react";
import {
  Folder,
  FolderOpen,
  Inbox,
  Bookmark,
  MoreVertical,
  Edit2,
  Trash2,
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

  const {
    collections,
    selectedCollectionId,
    setSelectedCollection,
    deleteCollection,
    getBookmarkCount,
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
          <div key={collection.id} className="relative group">
            <button
              onClick={() => setSelectedCollection(collection.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors",
                selectedCollectionId === collection.id
                  ? "bg-accent/20 text-accent"
                  : "text-text-primary hover:bg-bg-hover"
              )}
            >
              <span
                className="flex-shrink-0"
                style={{ color: collection.color || undefined }}
              >
                {getCollectionIcon(collection)}
              </span>
              <span className="flex-1 text-sm truncate">{collection.name}</span>
              <span className="text-xs text-text-secondary">
                {getBookmarkCount(collection.id)}
              </span>
            </button>

            {/* Context menu trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setContextMenuId(contextMenuId === collection.id ? null : collection.id);
              }}
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity",
                "opacity-0 group-hover:opacity-100 hover:bg-bg-tertiary",
                contextMenuId === collection.id && "opacity-100"
              )}
            >
              <MoreVertical className="w-3.5 h-3.5 text-text-secondary" />
            </button>

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

        {/* Separator */}
        <div className="my-2 border-t border-border" />

        {/* Uncategorized */}
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
      </div>
    </OverlayScrollbarsComponent>
  );
}
