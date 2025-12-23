import { Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeyValuePair } from "@/types";

interface KeyValueRowProps {
  pair: KeyValuePair;
  onChange: (updates: Partial<KeyValuePair>) => void;
  onDelete: () => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function KeyValueRow({
  pair,
  onChange,
  onDelete,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  dragHandleProps,
}: KeyValueRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 group",
        !pair.enabled && "opacity-50"
      )}
    >
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="cursor-grab text-text-secondary/50 hover:text-text-secondary"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      )}

      <input
        type="checkbox"
        checked={pair.enabled}
        onChange={(e) => onChange({ enabled: e.target.checked })}
        className="w-3.5 h-3.5 rounded border-border accent-accent"
      />

      <input
        type="text"
        value={pair.key}
        onChange={(e) => onChange({ key: e.target.value })}
        placeholder={keyPlaceholder}
        className="flex-1 px-2.5 py-1.5 text-sm bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent font-mono"
      />

      <input
        type="text"
        value={pair.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder={valuePlaceholder}
        className="flex-1 px-2.5 py-1.5 text-sm bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent font-mono"
      />

      <button
        onClick={onDelete}
        className="p-1.5 text-text-secondary/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
