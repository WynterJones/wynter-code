import { useState, useCallback } from "react";
import {
  Play,
  Star,
  Clock,
  ChevronRight,
  ChevronDown,
  Terminal as TerminalIcon,
  Square,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Terminal } from "@/components/terminal/Terminal";
import { useJustfileStore } from "@/stores/justfileStore";
import { cn } from "@/lib/utils";
import type { JustfileData, JustRecipe } from "./types";

interface RecipesTabProps {
  justfileData: JustfileData;
  projectPath?: string;
}

export function RecipesTab({ justfileData, projectPath }: RecipesTabProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<JustRecipe | null>(null);
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(
    new Set()
  );
  const [ptyId, setPtyId] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [showPrivate, setShowPrivate] = useState(false);

  const {
    executions,
    favoriteRecipes,
    recentRecipes,
    toggleFavorite,
    addToRecent,
    addExecution,
    updateExecution,
  } = useJustfileStore();

  const toggleExpanded = (recipeName: string) => {
    setExpandedRecipes((prev) => {
      const next = new Set(prev);
      if (next.has(recipeName)) {
        next.delete(recipeName);
      } else {
        next.add(recipeName);
      }
      return next;
    });
  };

  const getRecipeStatus = (recipeName: string) => {
    return (
      executions.find((e) => e.recipeName === recipeName)?.status || "idle"
    );
  };

  const handleRunRecipe = useCallback(
    (recipe: JustRecipe) => {
      if (!projectPath) return;

      setSelectedRecipe(recipe);
      addToRecent(recipe.name);
      setPtyId(null);
    },
    [projectPath, addToRecent]
  );

  const handlePtyCreated = useCallback(
    async (id: string) => {
      if (!selectedRecipe || !projectPath) return;

      setPtyId(id);
      addExecution(selectedRecipe.name, id);

      // Build and send command
      let command = `just ${selectedRecipe.name}`;
      for (const param of selectedRecipe.parameters) {
        const value = paramValues[param.name] || param.defaultValue;
        if (value) {
          command += ` ${value}`;
        }
      }

      await invoke("write_pty", { ptyId: id, data: command + "\n" });
    },
    [selectedRecipe, projectPath, paramValues, addExecution]
  );

  const handleStopRecipe = async () => {
    if (ptyId) {
      await invoke("write_pty", { ptyId, data: "\x03" });
    }
    if (selectedRecipe) {
      updateExecution(selectedRecipe.name, "idle");
    }
  };

  // Filter recipes
  const visibleRecipes = justfileData.recipes.filter(
    (r) => showPrivate || !r.isPrivate
  );

  // Group recipes
  const favoriteList = visibleRecipes.filter((r) =>
    favoriteRecipes.includes(r.name)
  );
  const recentList = visibleRecipes
    .filter(
      (r) =>
        recentRecipes.includes(r.name) && !favoriteRecipes.includes(r.name)
    )
    .slice(0, 5);

  const renderRecipeItem = (recipe: JustRecipe) => {
    const status = getRecipeStatus(recipe.name);
    const isExpanded = expandedRecipes.has(recipe.name);
    const isFavorite = favoriteRecipes.includes(recipe.name);
    const isSelected = selectedRecipe?.name === recipe.name;

    return (
      <div
        key={recipe.name}
        className={cn(
          "border border-border rounded-lg overflow-hidden mb-2",
          isSelected && "ring-1 ring-accent"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
            "hover:bg-bg-hover",
            isSelected && "bg-accent/5"
          )}
          onClick={() => toggleExpanded(recipe.name)}
        >
          <button className="p-0.5">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-secondary" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            )}
          </button>

          <span
            className={cn(
              "font-mono text-sm font-medium",
              recipe.isPrivate ? "text-text-secondary" : "text-text-primary"
            )}
          >
            {recipe.isQuiet && (
              <span className="text-accent opacity-60">@</span>
            )}
            {recipe.isPrivate && (
              <span className="text-text-secondary opacity-60">_</span>
            )}
            {recipe.name}
          </span>

          {recipe.parameters.length > 0 && (
            <span className="text-xs text-text-secondary">
              ({recipe.parameters.map((p) => p.name).join(", ")})
            </span>
          )}

          {recipe.dependencies.length > 0 && (
            <span className="text-xs text-text-secondary opacity-60">
              deps: {recipe.dependencies.join(", ")}
            </span>
          )}

          <div className="ml-auto flex items-center gap-1">
            {status === "running" && (
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(recipe.name);
              }}
              className="p-1 rounded hover:bg-bg-tertiary transition-colors"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                className={cn(
                  "w-3.5 h-3.5",
                  isFavorite
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-text-secondary"
                )}
              />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRunRecipe(recipe);
              }}
              className="p-1 rounded hover:bg-accent/10 hover:text-accent transition-colors"
              title="Run recipe"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="px-3 py-2 border-t border-border bg-bg-tertiary/30">
            {recipe.description && (
              <p className="text-sm text-text-secondary mb-2">
                {recipe.description}
              </p>
            )}

            {recipe.parameters.length > 0 && (
              <div className="mb-2">
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  Parameters
                </label>
                <div className="flex flex-wrap gap-2">
                  {recipe.parameters.map((param) => (
                    <input
                      key={param.name}
                      type="text"
                      placeholder={`${param.name}${param.defaultValue ? ` (${param.defaultValue})` : ""}`}
                      value={paramValues[param.name] || ""}
                      onChange={(e) =>
                        setParamValues((prev) => ({
                          ...prev,
                          [param.name]: e.target.value,
                        }))
                      }
                      className="px-2 py-1 text-sm bg-bg-primary border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ))}
                </div>
              </div>
            )}

            {recipe.body.length > 0 && (
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  Commands
                </label>
                <code className="block text-xs font-mono text-text-secondary bg-bg-primary px-2 py-1.5 rounded max-h-24 overflow-auto">
                  {recipe.body.slice(0, 5).map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                  {recipe.body.length > 5 && (
                    <div className="opacity-60">
                      ... and {recipe.body.length - 5} more
                    </div>
                  )}
                </code>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 min-h-0">
        <OverlayScrollbarsComponent
          className="w-1/2 border-r border-border"
          options={{
            scrollbars: { theme: "os-theme-custom", autoHide: "leave" },
          }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-text-secondary">
                {visibleRecipes.length} recipes
              </span>
              <button
                onClick={() => setShowPrivate(!showPrivate)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors",
                  showPrivate
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:bg-bg-hover"
                )}
              >
                {showPrivate ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <EyeOff className="w-3 h-3" />
                )}
                Private
              </button>
            </div>

            {favoriteList.length > 0 && (
              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  <Star className="w-3 h-3" />
                  Favorites
                </h3>
                {favoriteList.map(renderRecipeItem)}
              </div>
            )}

            {recentList.length > 0 && (
              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  <Clock className="w-3 h-3" />
                  Recent
                </h3>
                {recentList.map(renderRecipeItem)}
              </div>
            )}

            <div>
              <h3 className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                <TerminalIcon className="w-3 h-3" />
                All Recipes
              </h3>
              {visibleRecipes.map(renderRecipeItem)}
            </div>
          </div>
        </OverlayScrollbarsComponent>

        <div className="w-1/2 flex flex-col">
          {selectedRecipe ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-tertiary/30">
                <span className="font-mono text-sm font-medium">
                  just {selectedRecipe.name}
                </span>
                {getRecipeStatus(selectedRecipe.name) === "running" && (
                  <button
                    onClick={handleStopRecipe}
                    className="p-1 rounded hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    title="Stop"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex-1 min-h-0">
                {projectPath && (
                  <Terminal
                    projectPath={projectPath}
                    ptyId={ptyId}
                    onPtyCreated={handlePtyCreated}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-secondary">
              <div className="text-center">
                <TerminalIcon className="w-12 h-12 opacity-10 mx-auto mb-2" />
                <p className="text-sm">Select a recipe to run</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
