import { useState, useRef, useEffect, useMemo } from "react";
import {
  Wrench,
  Network,
  Package,
  Globe,
  Activity,
  Play,
  Key,
  Send,
  Search,
  FlaskConical,
  BookOpen,
  Server,
  Eye,
  CircleDot,
  Blocks,
  Image,
  Hammer,
  Tractor,
  BarChart3,
  Video,
  AtSign,
  MonitorPlay,
  FileCode,
  Upload,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import { createPortal } from "react-dom";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  actionKey: string;
  category: "development" | "infrastructure" | "utilities";
  disabled?: boolean;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // Development
  {
    id: "live-preview",
    name: "Live Preview",
    description: "Preview project in browser",
    icon: Play,
    actionKey: "openLivePreview",
    category: "development",
  },
  {
    id: "test-runner",
    name: "Test Runner",
    description: "Run and view test results",
    icon: FlaskConical,
    actionKey: "openTestRunner",
    category: "development",
  },
  {
    id: "storybook-viewer",
    name: "Storybook Viewer",
    description: "View and browse Storybook components",
    icon: BookOpen,
    actionKey: "openStorybookViewer",
    category: "development",
  },
  {
    id: "api-tester",
    name: "API Tester",
    description: "Test HTTP APIs with tabs and history",
    icon: Send,
    actionKey: "openApiTester",
    category: "development",
  },
  {
    id: "beads-tracker",
    name: "Beads Tracker",
    description: "View and manage project issues",
    icon: CircleDot,
    actionKey: "openBeadsTracker",
    category: "development",
  },
  // Infrastructure
  {
    id: "port-manager",
    name: "Port Manager",
    description: "View and manage localhost ports",
    icon: Network,
    actionKey: "openPortManager",
    category: "infrastructure",
  },
  {
    id: "localhost-tunnel",
    name: "Localhost Tunnel",
    description: "Share localhost via public URL",
    icon: Globe,
    actionKey: "openLocalhostTunnel",
    category: "infrastructure",
  },
  {
    id: "background-services",
    name: "Background Services",
    description: "View and manage developer services",
    icon: Server,
    actionKey: "openBackgroundServices",
    category: "infrastructure",
  },
  {
    id: "system-health",
    name: "System Health",
    description: "View dev tools and system resources",
    icon: Activity,
    actionKey: "openSystemHealth",
    category: "infrastructure",
  },
  {
    id: "overwatch",
    name: "Overwatch",
    description: "Monitor production services",
    icon: Eye,
    actionKey: "openOverwatch",
    category: "infrastructure",
  },
  // Utilities
  {
    id: "node-modules-cleaner",
    name: "Node Modules Cleaner",
    description: "Clean up node_modules folders",
    icon: Package,
    actionKey: "openNodeModulesCleaner",
    category: "utilities",
  },
  {
    id: "env-manager",
    name: "Environment Variables",
    description: "Manage .env files and secrets",
    icon: Key,
    actionKey: "openEnvManager",
    category: "utilities",
  },
  {
    id: "mcp-manager",
    name: "MCP Servers",
    description: "Manage Model Context Protocol servers",
    icon: Blocks,
    actionKey: "openMcpManager",
    category: "utilities",
  },
  {
    id: "favicon-generator",
    name: "Favicon Generator",
    description: "Generate favicons from any image",
    icon: Image,
    actionKey: "openFaviconGenerator",
    category: "utilities",
  },
  {
    id: "dev-toolkit",
    name: "Dev Toolkit",
    description: "Text and encoding utilities",
    icon: Hammer,
    actionKey: "openDevToolkit",
    category: "utilities",
  },
  {
    id: "farmwork-tycoon",
    name: "Farmwork Tycoon",
    description: "Visualize CLI activity as a farm game",
    icon: Tractor,
    actionKey: "openFarmworkTycoon",
    category: "development",
  },
  {
    id: "claude-code-stats",
    name: "Claude Code Stats",
    description: "View Claude CLI usage analytics and charts",
    icon: BarChart3,
    actionKey: "openClaudeCodeStats",
    category: "development",
  },
  {
    id: "floating-webcam",
    name: "Floating Webcam",
    description: "Webcam overlay for screen recordings with AI effects",
    icon: Video,
    actionKey: "openFloatingWebcam",
    category: "utilities",
  },
  {
    id: "screen-studio",
    name: "Screen Studio",
    description: "Cinematic screen recorder with tutorial effects",
    icon: MonitorPlay,
    actionKey: "openScreenStudio",
    category: "utilities",
  },
  {
    id: "domain-tools",
    name: "Domain Tools",
    description: "WHOIS, DNS, SSL checks and domain analysis",
    icon: AtSign,
    actionKey: "openDomainTools",
    category: "utilities",
  },
  {
    id: "seo-tools",
    name: "SEO Tools",
    description: "Meta tags, Open Graph, and structured data generators",
    icon: FileCode,
    actionKey: "openSeoTools",
    category: "utilities",
  },
  {
    id: "gif-recorder",
    name: "GIF Screen Recorder",
    description: "Record screen region as animated GIF",
    icon: Image,
    actionKey: "openGifRecorder",
    category: "utilities",
  },
  {
    id: "netlify-ftp",
    name: "Netlify FTP",
    description: "Deploy static sites with retro FTP vibes",
    icon: Upload,
    actionKey: "openNetlifyFtp",
    category: "infrastructure",
  },
  {
    id: "bookmarks",
    name: "Bookmarks",
    description: "Organize and manage your bookmarks",
    icon: Bookmark,
    actionKey: "openBookmarks",
    category: "utilities",
  },
];

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  category: "development" | "infrastructure" | "utilities";
  disabled?: boolean;
}

interface ToolCategory {
  id: "development" | "infrastructure" | "utilities";
  label: string;
  tools: Tool[];
}

interface ToolsDropdownProps {
  onOpenPortManager: () => void;
  onOpenNodeModulesCleaner: () => void;
  onOpenLocalhostTunnel: () => void;
  onOpenSystemHealth: () => void;
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
  onOpenDomainTools: () => void;
  onOpenSeoTools: () => void;
  onOpenFloatingWebcam: () => void;
  onOpenScreenStudio: () => void;
  onOpenNetlifyFtp: () => void;
  onOpenGifRecorder: () => void;
  onOpenBookmarks: () => void;
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
  onOpenTestRunner,
  onOpenStorybookViewer,
  onOpenBackgroundServices,
  onOpenOverwatch,
  onOpenMcpManager,
  onOpenFaviconGenerator,
  onOpenDevToolkit,
  onOpenClaudeCodeStats,
  onOpenDomainTools,
  onOpenSeoTools,
  onOpenFloatingWebcam,
  onOpenScreenStudio,
  onOpenNetlifyFtp,
  onOpenGifRecorder,
  onOpenBookmarks,
  hasStorybook = false,
}: ToolsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const tools: Tool[] = [
    // Development
    {
      id: "live-preview",
      name: "Live Preview",
      description: "Preview project in browser",
      icon: <Play className="w-4 h-4" />,
      category: "development",
      onClick: () => {
        onOpenLivePreview();
        setIsOpen(false);
      },
    },
    {
      id: "test-runner",
      name: "Test Runner",
      description: "Run and view test results",
      icon: <FlaskConical className="w-4 h-4" />,
      category: "development",
      onClick: () => {
        onOpenTestRunner();
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
      category: "development",
      onClick: () => {
        if (!hasStorybook) return;
        onOpenStorybookViewer();
        setIsOpen(false);
      },
      disabled: !hasStorybook,
    },
    {
      id: "api-tester",
      name: "API Tester",
      description: "Test HTTP APIs with tabs and history",
      icon: <Send className="w-4 h-4" />,
      category: "development",
      onClick: () => {
        onOpenApiTester();
        setIsOpen(false);
      },
    },
    // Infrastructure
    {
      id: "port-manager",
      name: "Port Manager",
      description: "View and manage localhost ports",
      icon: <Network className="w-4 h-4" />,
      category: "infrastructure",
      onClick: () => {
        onOpenPortManager();
        setIsOpen(false);
      },
    },
    {
      id: "localhost-tunnel",
      name: "Localhost Tunnel",
      description: "Share localhost via public URL",
      icon: <Globe className="w-4 h-4" />,
      category: "infrastructure",
      onClick: () => {
        onOpenLocalhostTunnel();
        setIsOpen(false);
      },
    },
    {
      id: "background-services",
      name: "Background Services",
      description: "View and manage developer services",
      icon: <Server className="w-4 h-4" />,
      category: "infrastructure",
      onClick: () => {
        onOpenBackgroundServices();
        setIsOpen(false);
      },
    },
    {
      id: "system-health",
      name: "System Health",
      description: "View dev tools and system resources",
      icon: <Activity className="w-4 h-4" />,
      category: "infrastructure",
      onClick: () => {
        onOpenSystemHealth();
        setIsOpen(false);
      },
    },
    {
      id: "overwatch",
      name: "Overwatch",
      description: "Monitor production services",
      icon: <Eye className="w-4 h-4" />,
      category: "infrastructure",
      onClick: () => {
        onOpenOverwatch();
        setIsOpen(false);
      },
    },
    // Utilities
    {
      id: "node-modules-cleaner",
      name: "Node Modules Cleaner",
      description: "Clean up node_modules folders",
      icon: <Package className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenNodeModulesCleaner();
        setIsOpen(false);
      },
    },
    {
      id: "env-manager",
      name: "Environment Variables",
      description: "Manage .env files and secrets",
      icon: <Key className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenEnvManager();
        setIsOpen(false);
      },
    },
    {
      id: "mcp-manager",
      name: "MCP Servers",
      description: "Manage Model Context Protocol servers",
      icon: <Blocks className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenMcpManager();
        setIsOpen(false);
      },
    },
    {
      id: "favicon-generator",
      name: "Favicon Generator",
      description: "Generate favicons from any image",
      icon: <Image className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenFaviconGenerator();
        setIsOpen(false);
      },
    },
    {
      id: "dev-toolkit",
      name: "Dev Toolkit",
      description: "Text and encoding utilities",
      icon: <Hammer className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenDevToolkit();
        setIsOpen(false);
      },
    },
    {
      id: "claude-code-stats",
      name: "Claude Code Stats",
      description: "View Claude CLI usage analytics and charts",
      icon: <BarChart3 className="w-4 h-4" />,
      category: "development",
      onClick: () => {
        onOpenClaudeCodeStats();
        setIsOpen(false);
      },
    },
    {
      id: "domain-tools",
      name: "Domain Tools",
      description: "WHOIS, DNS, SSL checks and domain analysis",
      icon: <AtSign className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenDomainTools();
        setIsOpen(false);
      },
    },
    {
      id: "seo-tools",
      name: "SEO Tools",
      description: "Meta tags, Open Graph, and structured data generators",
      icon: <FileCode className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenSeoTools();
        setIsOpen(false);
      },
    },
    {
      id: "floating-webcam",
      name: "Floating Webcam",
      description: "Webcam overlay for screen recordings with AI effects",
      icon: <Video className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenFloatingWebcam();
        setIsOpen(false);
      },
    },
    {
      id: "screen-studio",
      name: "Screen Studio",
      description: "Cinematic screen recorder with tutorial effects",
      icon: <MonitorPlay className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenScreenStudio();
        setIsOpen(false);
      },
    },
    {
      id: "gif-recorder",
      name: "GIF Screen Recorder",
      description: "Record screen region as animated GIF",
      icon: <Image className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenGifRecorder();
        setIsOpen(false);
      },
    },
    {
      id: "netlify-ftp",
      name: "Netlify FTP",
      description: "Deploy static sites with retro FTP vibes",
      icon: <Upload className="w-4 h-4" />,
      category: "infrastructure",
      onClick: () => {
        onOpenNetlifyFtp();
        setIsOpen(false);
      },
    },
    {
      id: "bookmarks",
      name: "Bookmarks",
      description: "Organize and manage your bookmarks",
      icon: <Bookmark className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenBookmarks();
        setIsOpen(false);
      },
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

  // Group tools by category
  const categories: ToolCategory[] = useMemo(() => {
    const categoryOrder: Array<{ id: ToolCategory["id"]; label: string }> = [
      { id: "development", label: "Development" },
      { id: "infrastructure", label: "Infrastructure" },
      { id: "utilities", label: "Utilities" },
    ];

    return categoryOrder
      .map((cat) => ({
        ...cat,
        tools: filteredTools.filter((tool) => tool.category === cat.id),
      }))
      .filter((cat) => cat.tools.length > 0);
  }, [filteredTools]);

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
                scrollbars: {
                  theme: "os-theme-custom",
                  autoHide: "leave",
                  autoHideDelay: 100,
                },
              }}
              className="max-h-[400px] os-theme-custom"
            >
              <div className="p-1">
                {categories.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-text-secondary text-center">
                    No tools found
                  </div>
                ) : (
                  categories.map((category, categoryIndex) => (
                    <div key={category.id}>
                      {/* Category Header */}
                      <div
                        className={cn(
                          "px-3 py-1.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wider",
                          categoryIndex > 0 &&
                            "mt-1 border-t border-border pt-2",
                        )}
                      >
                        {category.label}
                      </div>
                      {/* Category Tools */}
                      {category.tools.map((tool) => (
                        <button
                          key={tool.id}
                          onClick={tool.onClick}
                          disabled={tool.disabled}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors group",
                            tool.disabled
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-bg-hover",
                          )}
                        >
                          <div
                            className={cn(
                              "flex-shrink-0 text-text-secondary transition-colors",
                              !tool.disabled && "group-hover:text-accent",
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
                      ))}
                    </div>
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
