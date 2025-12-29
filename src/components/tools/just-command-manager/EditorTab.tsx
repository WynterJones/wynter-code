import { useState, useCallback } from "react";
import { Plus, Save, Trash2, GripVertical, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Button, Checkbox } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { JustfileData, JustRecipe } from "./types";

interface EditorTabProps {
  justfileData: JustfileData;
  onSave: () => void;
}

export function EditorTab({ justfileData, onSave }: EditorTabProps) {
  const [recipes, setRecipes] = useState<JustRecipe[]>(justfileData.recipes);
  const [editingRecipe, setEditingRecipe] = useState<JustRecipe | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Generate justfile content
      let content = "";

      // Add variables
      for (const [key, value] of Object.entries(justfileData.variables)) {
        content += `${key} := ${value}\n`;
      }
      if (Object.keys(justfileData.variables).length > 0) {
        content += "\n";
      }

      // Add recipes
      for (const recipe of recipes) {
        // Add description as comment
        if (recipe.description) {
          content += `# ${recipe.description}\n`;
        }

        // Recipe signature
        let sig = "";
        if (recipe.isQuiet) sig += "@";
        if (recipe.isPrivate) sig += "_";
        sig += recipe.name;

        for (const param of recipe.parameters) {
          sig += ` ${param.name}`;
          if (param.isVariadic) sig += "+";
          if (param.defaultValue) sig += `="${param.defaultValue}"`;
        }
        sig += ":";
        if (recipe.dependencies.length > 0) {
          sig += " " + recipe.dependencies.join(" ");
        }
        content += sig + "\n";

        // Recipe body
        for (const line of recipe.body) {
          content += `    ${line}\n`;
        }
        content += "\n";
      }

      await invoke("write_file_content", {
        path: justfileData.path,
        content,
      });

      setHasChanges(false);
      onSave();
    } catch (error) {
      console.error("Failed to save justfile:", error);
    } finally {
      setIsSaving(false);
    }
  }, [justfileData, recipes, onSave]);

  const handleAddRecipe = () => {
    const newRecipe: JustRecipe = {
      name: "new-recipe",
      description: "",
      dependencies: [],
      parameters: [],
      body: ["echo 'Hello!'"],
      lineNumber: 0,
    };
    setRecipes([...recipes, newRecipe]);
    setEditingRecipe(newRecipe);
    setHasChanges(true);
  };

  const handleDeleteRecipe = (recipeName: string) => {
    setRecipes(recipes.filter((r) => r.name !== recipeName));
    if (editingRecipe?.name === recipeName) {
      setEditingRecipe(null);
    }
    setHasChanges(true);
  };

  const handleUpdateRecipe = (updated: JustRecipe) => {
    setRecipes(
      recipes.map((r) => (r.name === editingRecipe?.name ? updated : r))
    );
    setEditingRecipe(updated);
    setHasChanges(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-tertiary/30">
        <button
          onClick={handleAddRecipe}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Recipe
        </button>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-yellow-500">Unsaved changes</span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <OverlayScrollbarsComponent
          className="w-1/3 border-r border-border"
          options={{
            scrollbars: { theme: "os-theme-custom", autoHide: "leave" },
          }}
        >
          <div className="p-2">
            {recipes.map((recipe) => (
              <div
                key={recipe.name}
                onClick={() => setEditingRecipe(recipe)}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                  editingRecipe?.name === recipe.name
                    ? "bg-accent/10 text-accent"
                    : "hover:bg-bg-hover text-text-primary"
                )}
              >
                <GripVertical className="w-3 h-3 text-text-secondary opacity-50" />
                <span className="font-mono text-sm flex-1 truncate">
                  {recipe.isQuiet && (
                    <span className="opacity-60">@</span>
                  )}
                  {recipe.isPrivate && (
                    <span className="opacity-60">_</span>
                  )}
                  {recipe.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRecipe(recipe.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </OverlayScrollbarsComponent>

        <OverlayScrollbarsComponent
          className="flex-1"
          options={{
            scrollbars: { theme: "os-theme-custom", autoHide: "leave" },
          }}
        >
          <div className="p-4 pb-8">
            {editingRecipe ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Recipe Name
                  </label>
                  <input
                    type="text"
                    value={editingRecipe.name}
                    onChange={(e) =>
                      handleUpdateRecipe({
                        ...editingRecipe,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md font-mono text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editingRecipe.description || ""}
                    onChange={(e) =>
                      handleUpdateRecipe({
                        ...editingRecipe,
                        description: e.target.value,
                      })
                    }
                    placeholder="Optional description..."
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div className="flex gap-4">
                  <Checkbox
                    label="Quiet (@)"
                    checked={editingRecipe.isQuiet || false}
                    onChange={(e) =>
                      handleUpdateRecipe({
                        ...editingRecipe,
                        isQuiet: e.target.checked,
                      })
                    }
                  />
                  <Checkbox
                    label="Private (_)"
                    checked={editingRecipe.isPrivate || false}
                    onChange={(e) =>
                      handleUpdateRecipe({
                        ...editingRecipe,
                        isPrivate: e.target.checked,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Dependencies (space-separated)
                  </label>
                  <input
                    type="text"
                    value={editingRecipe.dependencies.join(" ")}
                    onChange={(e) =>
                      handleUpdateRecipe({
                        ...editingRecipe,
                        dependencies: e.target.value
                          .split(/\s+/)
                          .filter(Boolean),
                      })
                    }
                    placeholder="dep1 dep2"
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md font-mono text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Commands (one per line)
                  </label>
                  <textarea
                    value={editingRecipe.body.join("\n")}
                    onChange={(e) =>
                      handleUpdateRecipe({
                        ...editingRecipe,
                        body: e.target.value.split("\n"),
                      })
                    }
                    rows={10}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md font-mono text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-text-secondary">
                <p className="text-sm">Select a recipe to edit</p>
              </div>
            )}
          </div>
        </OverlayScrollbarsComponent>
      </div>
    </div>
  );
}
