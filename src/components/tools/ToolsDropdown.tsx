import { useState, useRef, useEffect, useMemo } from "react";
import { Wrench } from "lucide-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TOOL_DEFINITIONS } from "./toolDefinitions";
import type { ToolDefinition } from "./toolDefinitions";
import { useToolsDropdown } from "./useToolsDropdown";
import type { Tool } from "./useToolsDropdown";
import { ToolsDropdownMenu } from "./ToolsDropdownMenu";

// Re-export for backward compatibility
export { TOOL_DEFINITIONS };
export type { ToolDefinition };

/** Maps actionKey to handler function */
type ActionHandlers = Record<string, (() => void) | undefined>;

interface ToolsDropdownProps {
  onOpenProjectSearch: () => void;
  onOpenPortManager: () => void;
  onOpenNodeModulesCleaner: () => void;
  onOpenLocalhostTunnel: () => void;
  onOpenSystemHealth: () => void;
  onOpenHomebrewManager: () => void;
  onOpenSystemCleaner: () => void;
  onOpenLivePreview: () => void;
  onOpenEnvManager: () => void;
  onOpenApiTester: () => void;
  onOpenTestRunner: () => void;
  onOpenStorybookViewer: () => void;
  onOpenBackgroundServices: () => void;
  onOpenOverwatch: () => void;
  onOpenMcpManager: () => void;
  onOpenFaviconGenerator: () => void;
  onOpenDevToolkit: () => void;
  onOpenClaudeCodeStats: () => void;
  onOpenLimitsMonitor: () => void;
  onOpenDomainTools: () => void;
  onOpenSeoTools: () => void;
  onOpenNetlifyFtp: () => void;
  onOpenBookmarks: () => void;
  onOpenMeditation: () => void;
  onOpenDatabaseViewer: () => void;
  onOpenProjectTemplates: () => void;
  onOpenFileFinder: () => void;
  onOpenSubscriptions: () => void;
  onOpenFarmwork: () => void;
  onOpenJustCommandManager: () => void;
  onOpenUniversalViewer: () => void;
  onOpenDesignerTool: () => void;
  onOpenGitHubManager: () => void;
  onOpenScratchpad: () => void;
  onOpenWebBackup?: () => void;
  onOpenKanbanBoard?: () => void;
  hasStorybook?: boolean;
  hasJustfile?: boolean;
}

export function ToolsDropdown({
  onOpenProjectSearch,
  onOpenPortManager,
  onOpenNodeModulesCleaner,
  onOpenLocalhostTunnel,
  onOpenSystemHealth,
  onOpenHomebrewManager,
  onOpenSystemCleaner,
  onOpenLivePreview,
  onOpenEnvManager,
  onOpenApiTester,
  onOpenTestRunner,
  onOpenStorybookViewer,
  onOpenBackgroundServices,
  onOpenOverwatch,
  onOpenMcpManager,
  onOpenFaviconGenerator,
  onOpenDevToolkit,
  onOpenClaudeCodeStats,
  onOpenLimitsMonitor,
  onOpenDomainTools,
  onOpenSeoTools,
  onOpenNetlifyFtp,
  onOpenBookmarks,
  onOpenMeditation,
  onOpenDatabaseViewer,
  onOpenProjectTemplates,
  onOpenFileFinder,
  onOpenSubscriptions,
  onOpenFarmwork,
  onOpenJustCommandManager,
  onOpenUniversalViewer,
  onOpenDesignerTool,
  onOpenGitHubManager,
  onOpenScratchpad,
  onOpenWebBackup = () => {},
  onOpenKanbanBoard = () => {},
  hasStorybook = false,
  hasJustfile = false,
}: ToolsDropdownProps) {
  // Map actionKey to handler functions - generated from props
  const actionHandlers: ActionHandlers = useMemo(() => ({
    openProjectSearch: onOpenProjectSearch,
    openPortManager: onOpenPortManager,
    openNodeModulesCleaner: onOpenNodeModulesCleaner,
    openLocalhostTunnel: onOpenLocalhostTunnel,
    openSystemHealth: onOpenSystemHealth,
    openHomebrewManager: onOpenHomebrewManager,
    openSystemCleaner: onOpenSystemCleaner,
    openLivePreview: onOpenLivePreview,
    openEnvManager: onOpenEnvManager,
    openApiTester: onOpenApiTester,
    openTestRunner: onOpenTestRunner,
    openStorybookViewer: onOpenStorybookViewer,
    openBackgroundServices: onOpenBackgroundServices,
    openOverwatch: onOpenOverwatch,
    openMcpManager: onOpenMcpManager,
    openFaviconGenerator: onOpenFaviconGenerator,
    openDevToolkit: onOpenDevToolkit,
    openClaudeCodeStats: onOpenClaudeCodeStats,
    openLimitsMonitor: onOpenLimitsMonitor,
    openDomainTools: onOpenDomainTools,
    openSeoTools: onOpenSeoTools,
    openNetlifyFtp: onOpenNetlifyFtp,
    openBookmarks: onOpenBookmarks,
    openMeditation: onOpenMeditation,
    openDatabaseViewer: onOpenDatabaseViewer,
    openProjectTemplates: onOpenProjectTemplates,
    openFileFinder: onOpenFileFinder,
    openSubscriptions: onOpenSubscriptions,
    openFarmwork: onOpenFarmwork,
    openJustCommandManager: onOpenJustCommandManager,
    openUniversalViewer: onOpenUniversalViewer,
    openDesignerTool: onOpenDesignerTool,
    openGitHubManager: onOpenGitHubManager,
    openScratchpad: onOpenScratchpad,
    openWebBackup: onOpenWebBackup,
    openKanbanBoard: onOpenKanbanBoard,
  }), [
    onOpenProjectSearch, onOpenPortManager, onOpenNodeModulesCleaner,
    onOpenLocalhostTunnel, onOpenSystemHealth, onOpenHomebrewManager,
    onOpenSystemCleaner, onOpenLivePreview, onOpenEnvManager, onOpenApiTester,
    onOpenTestRunner, onOpenStorybookViewer, onOpenBackgroundServices,
    onOpenOverwatch, onOpenMcpManager, onOpenFaviconGenerator, onOpenDevToolkit,
    onOpenClaudeCodeStats, onOpenLimitsMonitor, onOpenDomainTools, onOpenSeoTools,
    onOpenNetlifyFtp, onOpenBookmarks, onOpenMeditation, onOpenDatabaseViewer,
    onOpenProjectTemplates, onOpenFileFinder, onOpenSubscriptions, onOpenFarmwork,
    onOpenJustCommandManager, onOpenUniversalViewer, onOpenDesignerTool,
    onOpenGitHubManager, onOpenScratchpad, onOpenWebBackup, onOpenKanbanBoard,
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tools that dispatch events instead of calling handlers directly
  const eventDispatchTools = new Set(["openBeadsTracker", "openAutoBuild", "openFarmworkTycoon", "openKanbanBoard"]);

  // Generate tools from TOOL_DEFINITIONS (excluding mini-tools that are only for command palette)
  const tools: Tool[] = useMemo(() => {
    return TOOL_DEFINITIONS
      .filter(def => !def.parentActionKey) // Exclude mini-tools
      .map((def): Tool => {
        const IconComponent = def.icon;
        const isEventDispatch = eventDispatchTools.has(def.actionKey);

        // Special cases for conditional disabled state
        let disabled = def.disabled;
        let description = def.description;

        if (def.id === "storybook-viewer") {
          disabled = !hasStorybook;
          description = hasStorybook ? def.description : "Storybook not detected";
        } else if (def.id === "just-command-manager") {
          disabled = !hasJustfile;
          description = hasJustfile ? def.description : "Justfile not detected";
        }

        return {
          id: def.id,
          name: def.name,
          description,
          icon: <IconComponent className="w-4 h-4" />,
          category: def.category,
          hiddenInDropdown: def.hiddenInDropdown,
          disabled,
          onClick: () => {
            if (disabled) return;

            if (isEventDispatch) {
              window.dispatchEvent(
                new CustomEvent("command-palette-tool", {
                  detail: { action: def.actionKey },
                })
              );
            } else {
              const handler = actionHandlers[def.actionKey];
              handler?.();
            }
            setIsOpen(false);
          },
        };
      });
  }, [actionHandlers, hasStorybook, hasJustfile]);

  const {
    searchQuery,
    setSearchQuery,
    highlightedIndex,
    setHighlightedIndex,
    collapsedCategories,
    searchInputRef,
    toolButtonRefs,
    categories,
    navigableTools,
    allCollapsed,
    toggleAllCategories,
    toggleCategory,
  } = useToolsDropdown({ isOpen, tools });

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.right - 254,
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <Tooltip content="Tools">
        <button
          ref={buttonRef}
          onClick={handleToggle}
          className={cn(
            "inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors",
            "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
            isOpen && "bg-bg-hover text-text-primary",
          )}
        >
          <Wrench className="w-4 h-4" />
        </button>
      </Tooltip>

      <ToolsDropdownMenu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        dropdownRef={dropdownRef}
        dropdownPosition={dropdownPosition}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        allCollapsed={allCollapsed}
        onToggleAllCategories={toggleAllCategories}
        categories={categories}
        collapsedCategories={collapsedCategories}
        onToggleCategory={toggleCategory}
        toolButtonRefs={toolButtonRefs}
        highlightedIndex={highlightedIndex}
        navigableTools={navigableTools}
        onHighlightChange={setHighlightedIndex}
      />
    </>
  );
}
