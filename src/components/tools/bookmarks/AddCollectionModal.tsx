import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Type, Palette, type LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";
import { IconPicker } from "@/components/ui/IconPicker";
import { useBookmarkStore } from "@/stores/bookmarkStore";

interface AddCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCollectionId: string | null;
}

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
];

export function AddCollectionModal({
  isOpen,
  onClose,
  editingCollectionId,
}: AddCollectionModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const iconButtonRef = useRef<HTMLButtonElement>(null);

  const { collections, addCollection, updateCollection } = useBookmarkStore();

  const isEditing = editingCollectionId !== null;
  const editingCollection = isEditing
    ? collections.find((c) => c.id === editingCollectionId)
    : null;

  useEffect(() => {
    if (isOpen && editingCollection) {
      setName(editingCollection.name);
      setIcon(editingCollection.icon);
      setColor(editingCollection.color);
    } else if (isOpen) {
      setName("");
      setIcon(undefined);
      setColor(undefined);
    }
  }, [isOpen, editingCollection]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    if (isEditing && editingCollectionId) {
      updateCollection(editingCollectionId, {
        name: name.trim(),
        icon,
        color,
      });
    } else {
      addCollection({
        name: name.trim(),
        icon,
        color,
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Collection" : "New Collection"}
      size="sm"
    >
      <div className="p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="flex items-center gap-2 text-sm text-text-secondary mb-1.5">
            <Type className="w-3.5 h-3.5" />
            Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Collection"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onClose();
            }}
          />
        </div>

        {/* Icon */}
        <div>
          <label className="flex items-center gap-2 text-sm text-text-secondary mb-1.5">
            Icon (optional)
          </label>
          <div className="relative">
            <Button
              ref={iconButtonRef}
              variant="outline"
              size="sm"
              onClick={() => {
                if (!showIconPicker && iconButtonRef.current) {
                  const rect = iconButtonRef.current.getBoundingClientRect();
                  setPickerPosition({
                    top: rect.bottom + 4,
                    left: rect.left,
                  });
                }
                setShowIconPicker(!showIconPicker);
              }}
              className="w-full justify-start"
            >
              {icon ? (
                <span className="flex items-center gap-2 text-sm">
                  {(() => {
                    const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[icon];
                    return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
                  })()}
                  {icon}
                </span>
              ) : (
                <span className="text-text-secondary">Choose an icon...</span>
              )}
            </Button>
            {showIconPicker && createPortal(
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowIconPicker(false)} />
                <div
                  className="fixed z-[61] bg-bg-secondary border border-border rounded-lg p-3 shadow-xl"
                  style={{ top: pickerPosition.top, left: pickerPosition.left }}
                >
                  <IconPicker
                    selectedIcon={icon}
                    onSelectIcon={(iconName) => {
                      setIcon(iconName);
                      setShowIconPicker(false);
                    }}
                    onRemoveIcon={() => {
                      setIcon(undefined);
                      setShowIconPicker(false);
                    }}
                  />
                </div>
              </>,
              document.body
            )}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="flex items-center gap-2 text-sm text-text-secondary mb-1.5">
            <Palette className="w-3.5 h-3.5" />
            Color (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                onClick={() => setColor(color === presetColor ? undefined : presetColor)}
                className="w-6 h-6 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: presetColor,
                  borderColor: color === presetColor ? "white" : "transparent",
                  boxShadow: color === presetColor ? `0 0 0 2px ${presetColor}` : undefined,
                }}
              />
            ))}
            <button
              onClick={() => setColor(undefined)}
              className="w-6 h-6 rounded-full border border-border bg-bg-tertiary flex items-center justify-center text-xs text-text-secondary"
              title="No color"
            >
              ×
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {isEditing ? "Save Changes" : "Create Collection"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
