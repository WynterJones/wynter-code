import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import type { SubscriptionGroup } from "@/types";

// Catppuccin color palette
const GROUP_COLORS = [
  "#f38ba8", // red
  "#fab387", // peach
  "#f9e2af", // yellow
  "#a6e3a1", // green
  "#94e2d5", // teal
  "#89b4fa", // blue
  "#b4befe", // lavender
  "#f5c2e7", // pink
  "#cba6f7", // mauve
];

interface GroupManagerProps {
  className?: string;
}

export function GroupManager({ className }: GroupManagerProps) {
  const { groups, addGroup, updateGroup, deleteGroup, subscriptions } =
    useSubscriptionStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string | null>(GROUP_COLORS[0]);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);

  const getSubscriptionCount = (groupId: string) => {
    return subscriptions.filter((s) => s.groupId === groupId).length;
  };

  const handleAdd = () => {
    if (!newName.trim()) return;

    addGroup({
      name: newName.trim(),
      color: newColor,
    });

    setNewName("");
    setNewColor(GROUP_COLORS[0]);
    setIsAdding(false);
  };

  const handleEdit = (group: SubscriptionGroup) => {
    setEditingId(group.id);
    setEditName(group.name);
    setEditColor(group.color);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;

    updateGroup(editingId, {
      name: editName.trim(),
      color: editColor,
    });

    setEditingId(null);
    setEditName("");
    setEditColor(null);
  };

  const handleDelete = (group: SubscriptionGroup) => {
    const count = getSubscriptionCount(group.id);
    const message = count > 0
      ? `Delete "${group.name}"? ${count} subscription(s) will become ungrouped.`
      : `Delete "${group.name}"?`;

    if (confirm(message)) {
      deleteGroup(group.id);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">Groups</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs",
              "text-accent hover:bg-accent/10 transition-colors"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Group
          </button>
        )}
      </div>

      {/* Add new group form */}
      {isAdding && (
        <div className="p-3 rounded-lg bg-bg-secondary border border-border space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Group name..."
            autoFocus
            className={cn(
              "w-full px-3 py-2 rounded-md text-sm",
              "bg-bg-tertiary border border-border text-text-primary placeholder:text-text-secondary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setIsAdding(false);
            }}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Color:</span>
            <div className="flex gap-1.5">
              {GROUP_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={cn(
                    "w-5 h-5 rounded-full transition-transform hover:scale-110",
                    newColor === color && "ring-2 ring-offset-2 ring-offset-bg-secondary ring-white/50"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-md text-xs text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium",
                "bg-accent text-white hover:bg-accent/90 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Add Group
            </button>
          </div>
        </div>
      )}

      {/* Groups list */}
      <div className="space-y-2">
        {groups.length === 0 && !isAdding && (
          <p className="text-sm text-text-secondary text-center py-4">
            No groups yet. Create one to organize your subscriptions.
          </p>
        )}

        {groups
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-secondary border border-border group"
            >
              {editingId === group.id ? (
                // Edit mode
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className={cn(
                      "flex-1 px-2 py-1 rounded text-sm",
                      "bg-bg-tertiary border border-border text-text-primary",
                      "focus:outline-none focus:ring-2 focus:ring-accent/50"
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <div className="flex gap-1">
                    {GROUP_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={cn(
                          "w-4 h-4 rounded-full transition-transform hover:scale-110",
                          editColor === color && "ring-2 ring-offset-1 ring-offset-bg-secondary ring-white/50"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    className="p-1 rounded text-accent-green hover:bg-accent-green/10"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 rounded text-text-secondary hover:bg-bg-hover"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                // View mode
                <>
                  {group.color && (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  <span className="flex-1 text-sm text-text-primary">{group.name}</span>
                  <span className="text-xs text-text-secondary">
                    {getSubscriptionCount(group.id)} items
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button
                      onClick={() => handleEdit(group)}
                      className="p-1 rounded text-text-secondary hover:text-accent hover:bg-bg-hover"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(group)}
                      className="p-1 rounded text-text-secondary hover:text-accent-red hover:bg-accent-red/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
