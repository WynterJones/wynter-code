import { useEffect, useCallback } from "react";
import { X, Keyboard } from "lucide-react";
import { IconButton, Tooltip, ScrollArea } from "@/components/ui";
import { KEYBOARD_SHORTCUTS, formatShortcut, type KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsPopupProps {
  onClose: () => void;
}

const CATEGORY_LABELS: Record<KeyboardShortcut["category"], string> = {
  navigation: "Navigation",
  sessions: "Sessions",
  ui: "Interface",
  editing: "Editing",
};

const CATEGORY_ORDER: KeyboardShortcut["category"][] = ["navigation", "sessions", "ui", "editing"];

export function KeyboardShortcutsPopup({ onClose }: KeyboardShortcutsPopupProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Group shortcuts by category
  const groupedShortcuts = CATEGORY_ORDER.map(category => ({
    category,
    label: CATEGORY_LABELS[category],
    shortcuts: KEYBOARD_SHORTCUTS.filter(s => s.category === category),
  })).filter(g => g.shortcuts.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header - Drags the window */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-accent" />
            <span className="font-medium text-text-primary">Keyboard Shortcuts</span>
          </div>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-4">
            <div className="space-y-6">
              {groupedShortcuts.map((group) => (
                <div key={group.category}>
                  <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.shortcuts.map((shortcut, index) => (
                      <div
                        key={`${shortcut.action}-${index}`}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-bg-hover/50"
                      >
                        <span className="text-sm text-text-primary">{shortcut.description}</span>
                        <kbd className="px-2 py-1 text-xs font-mono bg-bg-secondary border border-border rounded text-text-secondary">
                          {formatShortcut(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-bg-secondary">
          <p className="text-xs text-text-secondary text-center">
            Press <kbd className="px-1.5 py-0.5 mx-1 text-xs font-mono bg-bg-primary border border-border rounded">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
