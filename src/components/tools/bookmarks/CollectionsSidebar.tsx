import { useState } from "react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useBookmarkStore, type Collection } from "@/stores/bookmarkStore";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CollectionsSidebarProps {
  onEditCollection: (id: string) => void;
}

interface SortableCollectionItemProps {
  collection: Collection;
  isSelected: boolean;
  count: number;
  contextMenuId: string | null;
  setContextMenuId: (id: string | null) => void;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getIcon: () => React.ReactNode;
}

function SortableCollectionItem({
  collection,
  isSelected,
  count,
  contextMenuId,
  setContextMenuId,
  onSelect,
  onEdit,
  onDelete,
  getIcon,
}: SortableCollectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: collection.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-50 z-50"
      )}
    >
      <div
        className={cn(
          "w-full flex items-center gap-1 pr-2 py-1.5 rounded-md text-left transition-colors",
          isSelected
            ? "bg-accent/20 text-accent"
            : "text-text-primary hover:bg-bg-hover"
        )}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="pl-1 pr-0.5 cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-3.5 h-3.5 text-text-secondary" />
        </div>

        {/* Collection button */}
        <button
          onClick={onSelect}
          className="flex-1 flex items-center gap-2 min-w-0"
        >
          <span
            className="flex-shrink-0"
            style={{ color: collection.color || undefined }}
          >
            {getIcon()}
          </span>
          <span className="flex-1 text-sm text-left truncate">{collection.name}</span>
          <span className="text-xs text-text-secondary">
            {count}
          </span>
        </button>

        {/* Context menu trigger */}
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
                onEdit();
                setContextMenuId(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-bg-hover"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-accent-red hover:bg-bg-hover"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function CollectionsSidebar({ onEditCollection }: CollectionsSidebarProps) {
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  const {
    collections,
    selectedCollectionId,
    setSelectedCollection,
    deleteCollection,
    getBookmarkCount,
    reorderCollections,
  } = useBookmarkStore();

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

  const sortedCollections = [...collections].sort((a, b) => a.order - b.order);
  const collectionIds = sortedCollections.map((c) => c.id);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedCollections.findIndex((c) => c.id === active.id);
      const newIndex = sortedCollections.findIndex((c) => c.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = [...sortedCollections];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);

      reorderCollections(newOrder.map((c) => c.id));
    }
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={collectionIds}
            strategy={verticalListSortingStrategy}
          >
            {sortedCollections.map((collection) => (
              <SortableCollectionItem
                key={collection.id}
                collection={collection}
                isSelected={selectedCollectionId === collection.id}
                count={getBookmarkCount(collection.id)}
                contextMenuId={contextMenuId}
                setContextMenuId={setContextMenuId}
                onSelect={() => setSelectedCollection(collection.id)}
                onEdit={() => onEditCollection(collection.id)}
                onDelete={() => handleDeleteCollection(collection.id)}
                getIcon={() => getCollectionIcon(collection)}
              />
            ))}
          </SortableContext>
        </DndContext>

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
