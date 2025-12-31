import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/ScrollArea";
import type { LucideIcon } from "lucide-react";

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

interface ToolCategory<T extends ToolItem = ToolItem> {
  name: string;
  tools: T[];
}

interface SearchableToolSidebarProps<T extends ToolItem = ToolItem> {
  categories: ToolCategory<T>[];
  activeToolId: string;
  onToolSelect: (toolId: string) => void;
  searchPlaceholder?: string;
}

export function SearchableToolSidebar<T extends ToolItem = ToolItem>({
  categories,
  activeToolId,
  onToolSelect,
  searchPlaceholder = "Search tools...",
}: SearchableToolSidebarProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }

    const query = searchQuery.toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        tools: category.tools.filter(
          (tool) =>
            tool.name.toLowerCase().includes(query) ||
            tool.description.toLowerCase().includes(query) ||
            tool.id.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.tools.length > 0);
  }, [categories, searchQuery]);

  const allFilteredTools = useMemo(() => {
    return filteredCategories.flatMap((cat) => cat.tools);
  }, [filteredCategories]);

  return (
    <ScrollArea className="w-56 border-r border-border bg-bg-secondary" scrollbarVisibility="visible">
      <div className="p-2 flex flex-col gap-2">
        <div className="relative px-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              "w-full pl-9 pr-8 py-2 text-sm rounded-lg",
              "bg-bg-primary border border-border",
              "placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {searchQuery && allFilteredTools.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-text-tertiary">
            No tools found matching "{searchQuery}"
          </div>
        )}

        {filteredCategories.map((category) => (
          <div key={category.name}>
            <div className="text-[10px] text-text-secondary/70 uppercase tracking-wider px-3 py-2">
              {category.name}
            </div>
            {category.tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToolSelect(tool.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left group",
                  activeToolId === tool.id
                    ? "bg-bg-hover text-text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50"
                )}
              >
                <tool.icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{tool.name}</div>
                  {searchQuery && (
                    <div className="text-xs text-text-tertiary truncate mt-0.5">
                      {tool.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

