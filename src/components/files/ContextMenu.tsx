import { useEffect, useRef } from "react";
import { Archive, FilePlus, FolderPlus, ImageMinus, Pencil, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { canOptimize } from "@/types/compression";

export interface ContextMenuItem {
  label: string;
  icon?: LucideIcon;
  action: () => void;
  variant?: "default" | "danger";
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] bg-bg-secondary border border-border rounded-md shadow-lg py-1 dropdown-solid"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => (
        <div key={index}>
          {item.separator && index > 0 && (
            <div className="h-px bg-border my-1" />
          )}
          <button
            onClick={() => {
              item.action();
              onClose();
            }}
            className={cn(
              "w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors",
              item.variant === "danger"
                ? "text-accent-red hover:bg-accent-red/10"
                : "text-text-primary hover:bg-bg-hover"
            )}
          >
            {item.icon && <item.icon className="w-4 h-4" />}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}

// Helper to build menu items for a file node
export function buildFileContextMenuItems(
  isDirectory: boolean,
  onNewFile: () => void,
  onNewFolder: () => void,
  onRename: () => void,
  onDelete: () => void
): ContextMenuItem[] {
  if (isDirectory) {
    return [
      { label: "New File", icon: FilePlus, action: onNewFile },
      { label: "New Folder", icon: FolderPlus, action: onNewFolder },
      { label: "Rename", icon: Pencil, action: onRename, separator: true },
      { label: "Delete", icon: Trash2, action: onDelete, variant: "danger", separator: true },
    ];
  }

  return [
    { label: "Rename", icon: Pencil, action: onRename },
    { label: "Delete", icon: Trash2, action: onDelete, variant: "danger", separator: true },
  ];
}

// Helper to build compression menu items
export function buildCompressionMenuItems(
  path: string,
  isDirectory: boolean,
  onCreateArchive: () => void,
  onOptimize: () => void,
  showCompressOption: boolean = true,
  selectedCount?: number
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  // Only show compress option for folders or multiple selection
  if (showCompressOption) {
    const label = selectedCount && selectedCount > 1
      ? `Compress ${selectedCount} Items to Zip`
      : isDirectory
        ? "Compress to Zip"
        : "Add to Zip";

    items.push({
      label,
      icon: Archive,
      action: onCreateArchive,
      separator: true,
    });
  }

  // Add optimize option for supported file types (only for single selection)
  if (!selectedCount && canOptimize(path, isDirectory)) {
    items.push({
      label: "Optimize File Size",
      icon: ImageMinus,
      action: onOptimize,
    });
  }

  return items;
}
