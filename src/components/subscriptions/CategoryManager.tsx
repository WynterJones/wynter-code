import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { SubscriptionCategory } from "@/types";

// Catppuccin color palette
const CATEGORY_COLORS = [
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

interface CategoryManagerProps {
  className?: string;
}

export function CategoryManager({ className }: CategoryManagerProps) {
  const { activeWorkspaceId } = useWorkspaceStore();
  const {
    getCategoriesForWorkspace,
    getSubscriptionsByWorkspace,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useSubscriptionStore();

  const categories = activeWorkspaceId ? getCategoriesForWorkspace(activeWorkspaceId) : [];
  const subscriptions = activeWorkspaceId ? getSubscriptionsByWorkspace(activeWorkspaceId) : [];

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string | null>(CATEGORY_COLORS[0]);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);

  const getSubscriptionCount = (categoryId: string) => {
    return subscriptions.filter((s) => s.categoryId === categoryId).length;
  };

  const handleAdd = () => {
    if (!newName.trim() || !activeWorkspaceId) return;

    addCategory({
      workspaceId: activeWorkspaceId,
      name: newName.trim(),
      color: newColor,
    });

    setNewName("");
    setNewColor(CATEGORY_COLORS[0]);
    setIsAdding(false);
  };

  const handleEdit = (category: SubscriptionCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;

    updateCategory(editingId, {
      name: editName.trim(),
      color: editColor,
    });

    setEditingId(null);
    setEditName("");
    setEditColor(null);
  };

  const handleDelete = (category: SubscriptionCategory) => {
    const count = getSubscriptionCount(category.id);
    const message = count > 0
      ? `Delete "${category.name}"? ${count} subscription(s) will become uncategorized.`
      : `Delete "${category.name}"?`;

    if (confirm(message)) {
      deleteCategory(category.id);
    }
  };

  if (!activeWorkspaceId) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-sm text-text-secondary">
          Select a workspace to manage categories.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">Categories</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs",
              "text-accent hover:bg-accent/10 transition-colors"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Category
          </button>
        )}
      </div>

      {/* Add new category form */}
      {isAdding && (
        <div className="p-3 rounded-lg bg-bg-secondary border border-border space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name..."
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
              {CATEGORY_COLORS.map((color) => (
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
              className="btn-primary !px-3 !py-1.5 !text-xs"
            >
              Add Category
            </button>
          </div>
        </div>
      )}

      {/* Categories list */}
      <div className="space-y-2">
        {categories.length === 0 && !isAdding && (
          <p className="text-sm text-text-secondary text-center py-4">
            No categories yet. Create one to organize your subscriptions.
          </p>
        )}

        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-secondary border border-border group"
          >
            {editingId === category.id ? (
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
                  {CATEGORY_COLORS.map((color) => (
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
                {category.color && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                )}
                <span className="flex-1 text-sm text-text-primary">{category.name}</span>
                <span className="text-xs text-text-secondary">
                  {getSubscriptionCount(category.id)} items
                </span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1 rounded text-text-secondary hover:text-accent hover:bg-bg-hover"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
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
