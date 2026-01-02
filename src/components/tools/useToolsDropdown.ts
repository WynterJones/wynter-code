import { useState, useRef, useEffect, useMemo } from "react";
import type { ToolDefinition } from "./toolDefinitions";

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  category: ToolDefinition["category"];
  disabled?: boolean;
  hiddenInDropdown?: boolean;
}

export interface ToolCategory {
  id: Tool["category"];
  label: string;
  tools: Tool[];
}

interface UseToolsDropdownProps {
  isOpen: boolean;
  tools: Tool[];
}

interface UseToolsDropdownReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  collapsedCategories: Set<string>;
  setCollapsedCategories: (categories: Set<string>) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  toolButtonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  filteredTools: Tool[];
  categories: ToolCategory[];
  navigableTools: Tool[];
  allCollapsed: boolean;
  toggleAllCategories: () => void;
  toggleCategory: (categoryId: string) => void;
}

export function useToolsDropdown({ isOpen, tools }: UseToolsDropdownProps): UseToolsDropdownReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("tools-dropdown-collapsed");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      return new Set();
    }
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const toolButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tools-dropdown-collapsed", JSON.stringify([...collapsedCategories]));
    } catch (error) {
      // Ignore storage errors
    }
  }, [collapsedCategories]);

  // Filter tools based on search query and hiddenInDropdown flag
  const filteredTools = useMemo(() => {
    // First filter out hidden tools (unless searching)
    const visibleTools = searchQuery.trim()
      ? tools // Show all tools when searching (including hidden ones)
      : tools.filter((tool) => !tool.hiddenInDropdown);

    if (!searchQuery.trim()) return visibleTools;

    const query = searchQuery.toLowerCase();
    return visibleTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query),
    );
  }, [searchQuery, tools]);

  // Group tools by category
  const categories: ToolCategory[] = useMemo(() => {
    const categoryOrder: Array<{ id: ToolCategory["id"]; label: string }> = [
      { id: "code", label: "Code" },
      { id: "testing", label: "Testing" },
      { id: "ai-providers", label: "AI Providers" },
      { id: "project", label: "Project" },
      { id: "local-system", label: "Local System" },
      { id: "production", label: "Production" },
      { id: "design", label: "Design" },
      { id: "web-tools", label: "Toolkits" },
      { id: "productivity", label: "Productivity" },
      { id: "utilities", label: "Utilities" },
    ];

    return categoryOrder
      .map((cat) => ({
        ...cat,
        tools: filteredTools.filter((tool) => tool.category === cat.id),
      }))
      .filter((cat) => cat.tools.length > 0);
  }, [filteredTools]);

  // Create flat list of navigable tools (respecting collapsed categories)
  const navigableTools = useMemo(() => {
    const result: Tool[] = [];
    for (const category of categories) {
      if (!collapsedCategories.has(category.id)) {
        for (const tool of category.tools) {
          if (!tool.disabled) {
            result.push(tool);
          }
        }
      }
    }
    return result;
  }, [categories, collapsedCategories]);

  // Reset highlighted index when search changes or navigable tools change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, navigableTools.length]);

  // Scroll highlighted tool into view
  useEffect(() => {
    if (navigableTools.length > 0 && highlightedIndex >= 0) {
      const tool = navigableTools[highlightedIndex];
      if (tool) {
        const button = toolButtonRefs.current[tool.id];
        button?.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, navigableTools]);

  // Category collapse logic
  const allCollapsed = collapsedCategories.size === categories.length && categories.length > 0;

  const toggleAllCategories = () => {
    if (allCollapsed) {
      setCollapsedCategories(new Set());
    } else {
      setCollapsedCategories(new Set(categories.map((c) => c.id)));
    }
  };

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Autofocus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the DOM is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
      // Reset highlighted index when opening
      setHighlightedIndex(0);
    } else {
      // Reset search when closing
      setSearchQuery("");
    }
  }, [isOpen]);

  return {
    searchQuery,
    setSearchQuery,
    highlightedIndex,
    setHighlightedIndex,
    collapsedCategories,
    setCollapsedCategories,
    searchInputRef,
    toolButtonRefs,
    filteredTools,
    categories,
    navigableTools,
    allCollapsed,
    toggleAllCategories,
    toggleCategory,
  };
}
