import { useState, useRef, useEffect } from "react";
import { ContextMenu, ContextMenuPosition } from "./ContextMenu";
import { IconPicker } from "./IconPicker";
import { cn } from "@/lib/utils";

const TAB_COLORS = [
  "#cba6f7", // Purple
  "#89b4fa", // Blue
  "#a6e3a1", // Green
  "#f9e2af", // Yellow
  "#fab387", // Orange
  "#f38ba8", // Red/Pink
  "#94e2d5", // Teal
  "#cdd6f4", // White-ish
];

export interface TabContextMenuProps {
  isOpen: boolean;
  position: ContextMenuPosition;
  onClose: () => void;
  name: string;
  icon?: string;
  color?: string;
  onUpdateName: (name: string) => void;
  onUpdateIcon: (icon: string) => void;
  onUpdateColor: (color: string) => void;
  showIconPicker?: boolean;
}

export function TabContextMenu({
  isOpen,
  position,
  onClose,
  name,
  icon,
  color,
  onUpdateName,
  onUpdateIcon,
  onUpdateColor,
  showIconPicker = true,
}: TabContextMenuProps) {
  const [activeTab, setActiveTab] = useState<"name" | "icon" | "color">("name");
  const [editingName, setEditingName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEditingName(name);
      setActiveTab("name");
    }
  }, [isOpen, name]);

  useEffect(() => {
    if (isOpen && activeTab === "name" && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen, activeTab]);

  const handleNameSubmit = () => {
    if (editingName.trim() && editingName.trim() !== name) {
      onUpdateName(editingName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSubmit();
      onClose();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if focus moved to another element within the menu
    // If so, don't close or submit yet
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget) {
      // Focus moved somewhere else, let it handle things
      return;
    }
    // Focus lost entirely (clicked outside), submit the name change
    handleNameSubmit();
  };

  const tabs = showIconPicker
    ? [
        { id: "name" as const, label: "Name" },
        { id: "icon" as const, label: "Icon" },
        { id: "color" as const, label: "Color" },
      ]
    : [
        { id: "name" as const, label: "Name" },
        { id: "color" as const, label: "Color" },
      ];

  return (
    <ContextMenu isOpen={isOpen} position={position} onClose={onClose}>
      <div className="min-w-[280px]">
        {/* Tabs */}
        <div className="flex border-b border-border mb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-accent border-b-2 border-accent"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "name" && (
          <div>
            <div className="text-xs text-text-secondary mb-2 font-medium">
              Tab Name
            </div>
            <input
              ref={inputRef}
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="w-full px-3 py-2 text-sm bg-bg-tertiary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Enter tab name..."
            />
          </div>
        )}

        {activeTab === "icon" && showIconPicker && (
          <IconPicker
            selectedIcon={icon}
            onSelectIcon={(newIcon) => {
              onUpdateIcon(newIcon);
              onClose();
            }}
            onRemoveIcon={
              icon
                ? () => {
                    onUpdateIcon("");
                    onClose();
                  }
                : undefined
            }
          />
        )}

        {activeTab === "color" && (
          <div>
            <div className="text-xs text-text-secondary mb-2 font-medium">
              Tab Color
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TAB_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onUpdateColor(c);
                    onClose();
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                    color === c
                      ? "border-white ring-2 ring-accent/50"
                      : "border-transparent hover:border-white/50"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            {color && (
              <button
                onClick={() => {
                  onUpdateColor("");
                  onClose();
                }}
                className="w-full mt-3 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors border-t border-border pt-3"
              >
                Remove color
              </button>
            )}
          </div>
        )}
      </div>
    </ContextMenu>
  );
}
