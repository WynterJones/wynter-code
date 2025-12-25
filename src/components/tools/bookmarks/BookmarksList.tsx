import { useMemo } from "react";
import { Bookmark as BookmarkIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { BookmarkCard } from "./BookmarkCard";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import type { Bookmark, ViewMode } from "@/stores/bookmarkStore";

interface BookmarksListProps {
  bookmarks: Bookmark[];
  viewMode: ViewMode;
  onEditBookmark: (id: string) => void;
}

export function BookmarksList({
  bookmarks,
  viewMode,
  onEditBookmark,
}: BookmarksListProps) {
  const { reorderBookmarks } = useBookmarkStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const bookmarkIds = useMemo(() => bookmarks.map((b) => b.id), [bookmarks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      reorderBookmarks(active.id as string, over.id as string);
    }
  };

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
          <BookmarkIcon className="w-6 h-6 text-text-secondary" />
        </div>
        <div className="text-sm font-medium text-text-primary mb-1">
          No bookmarks found
        </div>
        <div className="text-xs text-text-secondary max-w-[200px]">
          Add a bookmark using the "Add Bookmark" button above
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <OverlayScrollbarsComponent
        options={{
          scrollbars: {
            theme: "os-theme-custom",
            autoHide: "leave",
            autoHideDelay: 100,
          },
        }}
        className="h-full os-theme-custom"
      >
        <SortableContext
          items={bookmarkIds}
          strategy={viewMode === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
        >
          {viewMode === "grid" ? (
            <div className="p-4 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  viewMode={viewMode}
                  onEdit={onEditBookmark}
                />
              ))}
            </div>
          ) : (
            <div className="p-2">
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  viewMode={viewMode}
                  onEdit={onEditBookmark}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </OverlayScrollbarsComponent>
    </DndContext>
  );
}
