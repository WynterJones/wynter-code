import { useState, useEffect, useRef } from "react";
import { X, FilePlus, FolderPlus, Pencil } from "lucide-react";
import { Button, Input } from "@/components/ui";

interface FileDialogProps {
  type: "file" | "folder" | "rename";
  initialValue?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function FileDialog({ type, initialValue = "", onConfirm, onCancel }: FileDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (type === "rename" && initialValue) {
      // Select filename without extension for renaming
      const dotIndex = initialValue.lastIndexOf(".");
      if (dotIndex > 0) {
        inputRef.current?.setSelectionRange(0, dotIndex);
      } else {
        inputRef.current?.select();
      }
    }
  }, [type, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = value.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }

    // Basic validation for invalid characters
    if (/[<>:"/\\|?*]/.test(trimmed)) {
      setError("Name contains invalid characters");
      return;
    }

    onConfirm(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  const getTitle = () => {
    switch (type) {
      case "file":
        return "New File";
      case "folder":
        return "New Folder";
      case "rename":
        return "Rename";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "file":
        return FilePlus;
      case "folder":
        return FolderPlus;
      case "rename":
        return Pencil;
    }
  };

  const Icon = getIcon();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-bg-secondary border border-border rounded-lg shadow-xl w-80"
        onKeyDown={handleKeyDown}
      >
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-text-primary">{getTitle()}</span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder={type === "rename" ? "New name" : `Enter ${type} name`}
              className="w-full"
            />
            {error && (
              <p className="mt-1 text-xs text-accent-red">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {type === "rename" ? "Rename" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
