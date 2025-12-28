import { useDragStore } from "@/stores/dragStore";
import { FileIcon } from "./FileIcon";

export function DragGhost() {
  const isDragging = useDragStore((s) => s.isDragging);
  const draggedFiles = useDragStore((s) => s.draggedFiles);
  const mousePosition = useDragStore((s) => s.mousePosition);

  if (!isDragging || !mousePosition || draggedFiles.length === 0) {
    return null;
  }

  const primaryFile = draggedFiles[0];
  const count = draggedFiles.length;

  return (
    <div
      className="fixed pointer-events-none z-[9999] flex items-center gap-2 px-2 py-1.5 bg-bg-secondary border border-border rounded-lg shadow-lg text-sm select-none"
      style={{
        left: mousePosition.x + 12,
        top: mousePosition.y + 12,
        transform: "translate(0, 0)",
      }}
    >
      <FileIcon
        name={primaryFile.name}
        isDirectory={primaryFile.isDirectory}
        isExpanded={false}
      />
      <span className="text-text-primary max-w-[200px] truncate">
        {primaryFile.name}
      </span>
      {count > 1 && (
        <span className="px-1.5 py-0.5 bg-accent text-white text-xs rounded-full font-medium min-w-[20px] text-center">
          {count}
        </span>
      )}
    </div>
  );
}
