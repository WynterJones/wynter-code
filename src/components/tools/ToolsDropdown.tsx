import { useState, useRef, useEffect, useMemo } from "react";
import {
  Wrench,
  Network,
  Package,
  Globe,
  Pipette,
  Activity,
  Play,
  Key,
  Send,
  Rocket,
  Search,
  FlaskConical,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  actionKey: string;
  disabled?: boolean;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: "live-preview",
    name: "Live Preview",
    description: "Preview project in browser",
    icon: Play,
    actionKey: "openLivePreview",
  },
  {
    id: "color-picker",
    name: "Color Picker",
    description: "Pick colors from anywhere on screen",
    icon: Pipette,
    actionKey: "openColorPicker",
  },
  {
    id: "port-manager",
    name: "Port Manager",
    description: "View and manage localhost ports",
    icon: Network,
    actionKey: "openPortManager",
  },
  {
    id: "node-modules-cleaner",
    name: "Node Modules Cleaner",
    description: "Clean up node_modules folders",
    icon: Package,
    actionKey: "openNodeModulesCleaner",
  },
  {
    id: "localhost-tunnel",
    name: "Localhost Tunnel",
    description: "Share localhost via public URL",
    icon: Globe,
    actionKey: "openLocalhostTunnel",
  },
  {
    id: "system-health",
    name: "System Health",
    description: "View dev tools and system resources",
    icon: Activity,
    actionKey: "openSystemHealth",
  },
  {
    id: "env-manager",
    name: "Environment Variables",
    description: "Manage .env files and secrets",
    icon: Key,
    actionKey: "openEnvManager",
  },
  {
    id: "api-tester",
    name: "API Tester",
    description: "Test HTTP APIs with tabs and history",
    icon: Send,
    actionKey: "openApiTester",
  },
  {
    id: "project-templates",
    name: "Project Templates",
    description: "Create new project from template",
    icon: Rocket,
    actionKey: "openProjectTemplates",
  },
  {
    id: "test-runner",
    name: "Test Runner",
    description: "Run and view test results",
    icon: FlaskConical,
    actionKey: "openTestRunner",
  },
  {
    id: "storybook-viewer",
    name: "Storybook Viewer",
    description: "View and browse Storybook components",
    icon: BookOpen,
    actionKey: "openStorybookViewer",
  },
];

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface ToolsDropdownProps {
  onOpenPortManager: () => void;
  onOpenNodeModulesCleaner: () => void;
  onOpenLocalhostTunnel: () => void;
  onOpenSystemHealth: () => void;
  onOpenLivePreview: () => void;
  onOpenEnvManager: () => void;
  onOpenApiTester: () => void;
  onOpenStorybookViewer: () => void;
  hasStorybook?: boolean;
}

export function ToolsDropdown({
  onOpenPortManager,
  onOpenNodeModulesCleaner,
  onOpenLocalhostTunnel,
  onOpenSystemHealth,
  onOpenLivePreview,
  onOpenEnvManager,
  onOpenApiTester,
  onOpenStorybookViewer,
  hasStorybook = false,
}: ToolsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleOpenColorPicker = async () => {
    try {
      await invoke("pick_color_and_show");
    } catch (err) {
      console.error("Failed to open color picker:", err);
    }
    setIsOpen(false);
  };

  const tools: Tool[] = [
    {
      id: "live-preview",
      name: "Live Preview",
      description: "Preview project in browser",
      icon: <Play className="w-4 h-4" />,
      onClick: () => {
        onOpenLivePreview();
        setIsOpen(false);
      },
    },
    {
      id: "color-picker",
      name: "Color Picker",
      description: "Pick colors from anywhere on screen",
      icon: <Pipette className="w-4 h-4" />,
      onClick: handleOpenColorPicker,
    },
    {
      id: "port-manager",
      name: "Port Manager",
      description: "View and manage localhost ports",
      icon: <Network className="w-4 h-4" />,
      onClick: () => {
        onOpenPortManager();
        setIsOpen(false);
      },
    },
    {
      id: "node-modules-cleaner",
      name: "Node Modules Cleaner",
      description: "Clean up node_modules folders",
      icon: <Package className="w-4 h-4" />,
      onClick: () => {
        onOpenNodeModulesCleaner();
        setIsOpen(false);
      },
    },
    {
      id: "localhost-tunnel",
      name: "Localhost Tunnel",
      description: "Share localhost via public URL",
      icon: <Globe className="w-4 h-4" />,
      onClick: () => {
        onOpenLocalhostTunnel();
        setIsOpen(false);
      },
    },
    {
      id: "system-health",
      name: "System Health",
      description: "View dev tools and system resources",
      icon: <Activity className="w-4 h-4" />,
      onClick: () => {
        onOpenSystemHealth();
        setIsOpen(false);
      },
    },
    {
      id: "env-manager",
      name: "Environment Variables",
      description: "Manage .env files and secrets",
      icon: <Key className="w-4 h-4" />,
      onClick: () => {
        onOpenEnvManager();
        setIsOpen(false);
      },
    },
    {
      id: "api-tester",
      name: "API Tester",
      description: "Test HTTP APIs with tabs and history",
      icon: <Send className="w-4 h-4" />,
      onClick: () => {
        onOpenApiTester();
        setIsOpen(false);
      },
    },
    {
      id: "storybook-viewer",
      name: "Storybook Viewer",
      description: hasStorybook
        ? "View and browse Storybook components"
        : "Storybook not detected in project",
      icon: <BookOpen className="w-4 h-4" />,
      onClick: () => {
        if (!hasStorybook) return;
        onOpenStorybookViewer();
        setIsOpen(false);
      },
      disabled: !hasStorybook,
    },
  ];

  // Filter tools based on search query
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools;
    const query = searchQuery.toLowerCase();
    return tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query),
    );
  }, [searchQuery, tools]);

  // Autofocus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the DOM is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
    } else {
      // Reset search when closing
      setSearchQuery("");
    }
  }, [isOpen]);

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

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
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
            "flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors",
            "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
            isOpen && "bg-bg-hover text-text-primary",
          )}
        >
          <Wrench className="w-4 h-4" />
        </button>
      </Tooltip>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] w-64 bg-bg-secondary border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            {/* Search Input */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-bg-primary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>
            </div>

            {/* Tools List */}
            <OverlayScrollbarsComponent
              options={{
                scrollbars: { autoHide: "leave", autoHideDelay: 100 },
              }}
              className="max-h-[400px]"
            >
              <div className="p-1">
                {filteredTools.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-text-secondary text-center">
                    No tools found
                  </div>
                ) : (
                  filteredTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={tool.onClick}
                      disabled={tool.disabled}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors group",
                        tool.disabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-bg-hover"
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 text-text-secondary transition-colors",
                          !tool.disabled && "group-hover:text-accent"
                        )}
                      >
                        {tool.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary">
                          {tool.name}
                        </div>
                        <div className="text-[10px] text-text-secondary truncate">
                          {tool.description}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </OverlayScrollbarsComponent>
          </div>,
          document.body,
        )}
    </>
  );
}
