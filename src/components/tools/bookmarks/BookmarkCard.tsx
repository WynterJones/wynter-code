import { useState, useRef, useCallback } from "react";
import { ExternalLink, Edit2, Trash2, GripVertical } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { BookmarkIcon } from "./BookmarkIcon";
import { useBookmarkStore, type Bookmark, type ViewMode } from "@/stores/bookmarkStore";

interface BookmarkCardProps {
  bookmark: Bookmark;
  viewMode: ViewMode;
  onEdit: (id: string) => void;
}

const HOLD_DURATION = 1000; // 1 second

export function BookmarkCard({ bookmark, viewMode, onEdit }: BookmarkCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [isHoldingDelete, setIsHoldingDelete] = useState(false);
  const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const deleteStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { deleteBookmark } = useBookmarkStore();

  const clearDeleteTimer = useCallback(() => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    deleteStartTimeRef.current = null;
    setDeleteProgress(0);
    setIsHoldingDelete(false);
  }, []);

  const updateProgress = useCallback(() => {
    if (!deleteStartTimeRef.current) return;

    const elapsed = Date.now() - deleteStartTimeRef.current;
    const progress = Math.min(elapsed / HOLD_DURATION, 1);
    setDeleteProgress(progress);

    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const handleDeleteStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsHoldingDelete(true);
    deleteStartTimeRef.current = Date.now();

    // Start progress animation
    animationFrameRef.current = requestAnimationFrame(updateProgress);

    // Set timer for actual deletion
    deleteTimerRef.current = setTimeout(() => {
      deleteBookmark(bookmark.id);
      clearDeleteTimer();
    }, HOLD_DURATION);
  }, [bookmark.id, deleteBookmark, clearDeleteTimer, updateProgress]);

  const handleDeleteEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    clearDeleteTimer();
  }, [clearDeleteTimer]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bookmark.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleOpenUrl = async () => {
    try {
      await open(bookmark.url);
    } catch (err) {
      console.error("Failed to open URL:", err);
    }
  };

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  if (viewMode === "grid") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative group flex flex-col items-center p-3 rounded-lg border border-transparent",
          "hover:border-border hover:bg-bg-hover transition-all cursor-pointer",
          isDragging && "opacity-50 z-50 shadow-lg"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleOpenUrl}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute top-1 left-1 p-1 rounded cursor-grab active:cursor-grabbing",
            "opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:bg-bg-tertiary transition-opacity"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3 text-text-secondary" />
        </div>

        {/* Icon */}
        <div className="w-12 h-12 flex items-center justify-center mb-2">
          <BookmarkIcon
            url={bookmark.url}
            faviconUrl={bookmark.faviconUrl}
            name={bookmark.title}
            size="lg"
            className="w-8 h-8"
          />
        </div>

        {/* Title */}
        <div className="w-full text-center">
          <div className="text-sm font-medium text-text-primary truncate">
            {bookmark.title}
          </div>
          <div className="text-[10px] text-text-secondary truncate">
            {getHostname(bookmark.url)}
          </div>
        </div>

        {/* Hover actions */}
        {isHovered && (
          <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-bg-secondary border border-border rounded-md shadow-sm">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(bookmark.id);
              }}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-l-md transition-colors"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onMouseDown={handleDeleteStart}
              onMouseUp={handleDeleteEnd}
              onMouseLeave={handleDeleteEnd}
              onTouchStart={handleDeleteStart}
              onTouchEnd={handleDeleteEnd}
              className={cn(
                "relative p-1.5 text-text-secondary hover:text-accent-red rounded-r-md transition-colors overflow-hidden",
                isHoldingDelete && "text-accent-red"
              )}
              title="Hold to delete"
            >
              {/* Progress fill */}
              {isHoldingDelete && (
                <div
                  className="absolute inset-0 bg-accent-red/20 origin-left"
                  style={{ transform: `scaleX(${deleteProgress})` }}
                />
              )}
              <Trash2 className="w-3 h-3 relative z-10" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-md",
        "hover:bg-bg-hover transition-colors cursor-pointer",
        isDragging && "opacity-50 z-50 shadow-lg bg-bg-secondary"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleOpenUrl}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-bg-tertiary"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-text-secondary" />
      </div>

      {/* Icon */}
      <BookmarkIcon
        url={bookmark.url}
        faviconUrl={bookmark.faviconUrl}
        name={bookmark.title}
        size="md"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {bookmark.title}
          </span>
          <ExternalLink className="w-3 h-3 text-text-secondary flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-xs text-text-secondary truncate">
          {bookmark.url}
        </div>
        {bookmark.description && (
          <div className="text-xs text-text-secondary/80 truncate mt-0.5">
            {bookmark.description}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className={cn(
          "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(bookmark.id);
          }}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={handleDeleteStart}
          onMouseUp={handleDeleteEnd}
          onMouseLeave={handleDeleteEnd}
          onTouchStart={handleDeleteStart}
          onTouchEnd={handleDeleteEnd}
          className={cn(
            "relative p-1.5 text-text-secondary hover:text-accent-red hover:bg-bg-tertiary rounded transition-colors overflow-hidden",
            isHoldingDelete && "text-accent-red bg-bg-tertiary"
          )}
          title="Hold to delete"
        >
          {/* Progress fill */}
          {isHoldingDelete && (
            <div
              className="absolute inset-0 bg-accent-red/20 origin-left"
              style={{ transform: `scaleX(${deleteProgress})` }}
            />
          )}
          <Trash2 className="w-3.5 h-3.5 relative z-10" />
        </button>
      </div>
    </div>
  );
}
