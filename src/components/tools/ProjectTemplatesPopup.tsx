import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Chrome,
  Terminal as TerminalIcon,
  Globe,
  Train,
  Zap,
  Box,
  MonitorSmartphone,
  Atom,
  FolderOpen,
  Play,
  Check,
  ArrowLeft,
  Search,
  Smartphone,
  Feather,
  Flame,
  Star,
  Disc,
  Circle,
  Shield,
  Server,
  Rocket,
  Database,
  Code,
  Boxes,
  Layers,
  BookOpen,
  Book,
  Triangle,
  Puzzle,
  Brain,
  Bot,
  Sparkles,
  MessageSquare,
  Cpu,
  type LucideIcon,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Modal, IconButton } from "@/components/ui";
import { Terminal } from "@/components/terminal/Terminal";
import { FileBrowserPopup } from "@/components/files/FileBrowserPopup";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";
import { ScrollArea } from "@/components/ui";

interface ProjectTemplatesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProject?: (path: string) => void;
}

interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  command: string;
  projectNamePlaceholder: string;
  color: string;
  category: TemplateCategory;
}

type TemplateCategory =
  | "ai"
  | "extensions"
  | "mobile"
  | "frontend"
  | "backend"
  | "desktop"
  | "tooling";

const CATEGORY_INFO: Record<
  TemplateCategory,
  { label: string; order: number }
> = {
  ai: { label: "AI & LLM Apps", order: 1 },
  extensions: { label: "Browser Extensions", order: 2 },
  mobile: { label: "Mobile", order: 3 },
  frontend: { label: "Frontend", order: 4 },
  backend: { label: "Backend / Full-Stack", order: 5 },
  desktop: { label: "Desktop", order: 6 },
  tooling: { label: "Tooling & Libraries", order: 7 },
};

const FAVORITES_STORAGE_KEY = "wynter-project-template-favorites";

const TEMPLATES: TemplateDefinition[] = [
  // AI & LLM Apps
  {
    id: "create-llama",
    name: "LlamaIndex",
    description: "RAG & AI agents with LlamaIndex",
    icon: Brain,
    command: "npx create-llama@latest",
    projectNamePlaceholder: "my-llama-app",
    color: "text-purple-400",
    category: "ai",
  },
  {
    id: "mastra",
    name: "Mastra",
    description: "TypeScript AI agent framework",
    icon: Bot,
    command: "npm create mastra@latest",
    projectNamePlaceholder: "my-mastra-agent",
    color: "text-blue-400",
    category: "ai",
  },
  {
    id: "vercel-ai",
    name: "Vercel AI Chatbot",
    description: "Next.js AI chatbot with streaming",
    icon: MessageSquare,
    command:
      "npx create-next-app --example https://github.com/vercel/ai-chatbot",
    projectNamePlaceholder: "my-ai-chatbot",
    color: "text-white",
    category: "ai",
  },
  {
    id: "agent-chat",
    name: "LangGraph Chat",
    description: "LangGraph agent chat application",
    icon: Sparkles,
    command: "npx create-agent-chat-app@latest",
    projectNamePlaceholder: "my-agent-chat",
    color: "text-yellow-400",
    category: "ai",
  },
  {
    id: "copilotkit",
    name: "CopilotKit",
    description: "In-app AI copilots & agents",
    icon: Cpu,
    command: "npx create-ag-ui-app@latest",
    projectNamePlaceholder: "my-copilot",
    color: "text-green-400",
    category: "ai",
  },
  {
    id: "langchain-next",
    name: "LangChain + Next.js",
    description: "LangChain starter with Vercel AI SDK",
    icon: Brain,
    command:
      "npx create-next-app --example https://github.com/langchain-ai/langchain-nextjs-template",
    projectNamePlaceholder: "my-langchain-app",
    color: "text-emerald-400",
    category: "ai",
  },

  // Browser Extensions
  {
    id: "wxt",
    name: "WXT",
    description: "Next-gen framework for Chrome/Firefox/Safari",
    icon: Chrome,
    command: "npx wxt@latest init",
    projectNamePlaceholder: "my-extension",
    color: "text-emerald-400",
    category: "extensions",
  },
  {
    id: "plasmo",
    name: "Plasmo",
    description: "React-based browser extension framework",
    icon: Puzzle,
    command: "npx plasmo init",
    projectNamePlaceholder: "my-plasmo-ext",
    color: "text-violet-400",
    category: "extensions",
  },
  {
    id: "crxjs",
    name: "CRXJS Vite",
    description: "Chrome extension with Vite HMR",
    icon: Zap,
    command: "npm create vite@latest",
    projectNamePlaceholder: "my-crxjs-ext",
    color: "text-yellow-400",
    category: "extensions",
  },
  {
    id: "chrome-ext-cli",
    name: "Chrome Extension CLI",
    description: "Official Chrome extension starter",
    icon: Chrome,
    command: "npx chrome-extension-cli",
    projectNamePlaceholder: "my-chrome-ext",
    color: "text-blue-400",
    category: "extensions",
  },
  {
    id: "webext",
    name: "WebExtension",
    description: "Cross-browser extension boilerplate",
    icon: Globe,
    command: "npx degit AXeL-dev/browser-extension-boilerplate",
    projectNamePlaceholder: "my-webext",
    color: "text-orange-400",
    category: "extensions",
  },
  {
    id: "bedframe",
    name: "Bedframe",
    description: "Multi-browser extension framework",
    icon: Layers,
    command: "npx create-bedframe@latest",
    projectNamePlaceholder: "my-bedframe-ext",
    color: "text-pink-400",
    category: "extensions",
  },

  // Mobile
  {
    id: "expo",
    name: "Expo",
    description: "React Native with Expo SDK",
    icon: Smartphone,
    command: "npx create-expo-app@latest",
    projectNamePlaceholder: "my-expo-app",
    color: "text-violet-400",
    category: "mobile",
  },
  {
    id: "react-native",
    name: "React Native",
    description: "Bare React Native CLI",
    icon: Smartphone,
    command: "npx @react-native-community/cli init",
    projectNamePlaceholder: "MyRNApp",
    color: "text-cyan-400",
    category: "mobile",
  },
  {
    id: "flutter",
    name: "Flutter",
    description: "Google's cross-platform UI toolkit",
    icon: Feather,
    command: "flutter create",
    projectNamePlaceholder: "my_flutter_app",
    color: "text-sky-400",
    category: "mobile",
  },
  {
    id: "ionic",
    name: "Ionic",
    description: "Hybrid mobile apps with web tech",
    icon: Zap,
    command: "npx @ionic/cli start",
    projectNamePlaceholder: "my-ionic-app",
    color: "text-blue-500",
    category: "mobile",
  },

  // Frontend
  {
    id: "nextjs",
    name: "Next.js",
    description: "React framework with SSR & routing",
    icon: Globe,
    command: "npx create-next-app@latest",
    projectNamePlaceholder: "my-next-app",
    color: "text-white",
    category: "frontend",
  },
  {
    id: "vite-react",
    name: "React + Vite",
    description: "Lightning fast React setup",
    icon: Atom,
    command: "npm create vite@latest",
    projectNamePlaceholder: "my-react-app",
    color: "text-cyan-400",
    category: "frontend",
  },
  {
    id: "vue",
    name: "Vue",
    description: "Vue 3 with Vite",
    icon: Triangle,
    command: "npm create vue@latest",
    projectNamePlaceholder: "my-vue-app",
    color: "text-emerald-500",
    category: "frontend",
  },
  {
    id: "nuxt",
    name: "Nuxt",
    description: "Vue meta-framework with SSR",
    icon: Triangle,
    command: "npx nuxi@latest init",
    projectNamePlaceholder: "my-nuxt-app",
    color: "text-green-400",
    category: "frontend",
  },
  {
    id: "sveltekit",
    name: "SvelteKit",
    description: "Svelte meta-framework",
    icon: Flame,
    command: "npx sv create",
    projectNamePlaceholder: "my-svelte-app",
    color: "text-orange-500",
    category: "frontend",
  },
  {
    id: "astro",
    name: "Astro",
    description: "Content-focused static sites",
    icon: Star,
    command: "npm create astro@latest",
    projectNamePlaceholder: "my-astro-site",
    color: "text-purple-400",
    category: "frontend",
  },
  {
    id: "remix",
    name: "Remix",
    description: "Full-stack React framework",
    icon: Disc,
    command: "npx create-remix@latest",
    projectNamePlaceholder: "my-remix-app",
    color: "text-yellow-400",
    category: "frontend",
  },
  {
    id: "solid",
    name: "Solid",
    description: "Solid.js with TypeScript",
    icon: Circle,
    command: "npx degit solidjs/templates/ts",
    projectNamePlaceholder: "my-solid-app",
    color: "text-blue-400",
    category: "frontend",
  },
  {
    id: "qwik",
    name: "Qwik",
    description: "Resumable framework for instant apps",
    icon: Zap,
    command: "npm create qwik@latest",
    projectNamePlaceholder: "my-qwik-app",
    color: "text-indigo-400",
    category: "frontend",
  },
  {
    id: "angular",
    name: "Angular",
    description: "Enterprise Angular framework",
    icon: Shield,
    command: "npx @angular/cli new",
    projectNamePlaceholder: "my-angular-app",
    color: "text-red-500",
    category: "frontend",
  },

  // Backend / Full-Stack
  {
    id: "rails",
    name: "Rails",
    description: "Ruby on Rails full-stack framework",
    icon: Train,
    command: "rails new",
    projectNamePlaceholder: "my-rails-app",
    color: "text-red-500",
    category: "backend",
  },
  {
    id: "express",
    name: "Express",
    description: "Minimal Node.js web framework",
    icon: Zap,
    command: "npx express-generator",
    projectNamePlaceholder: "my-express-app",
    color: "text-yellow-400",
    category: "backend",
  },
  {
    id: "nestjs",
    name: "Nest.js",
    description: "Node.js enterprise framework",
    icon: Server,
    command: "npx @nestjs/cli new",
    projectNamePlaceholder: "my-nest-app",
    color: "text-red-600",
    category: "backend",
  },
  {
    id: "fastify",
    name: "Fastify",
    description: "Fast Node.js web server",
    icon: Rocket,
    command: "npx fastify-cli generate",
    projectNamePlaceholder: "my-fastify-app",
    color: "text-white",
    category: "backend",
  },
  {
    id: "hono",
    name: "Hono",
    description: "Ultrafast edge web framework",
    icon: Flame,
    command: "npm create hono@latest",
    projectNamePlaceholder: "my-hono-app",
    color: "text-orange-400",
    category: "backend",
  },
  {
    id: "django",
    name: "Django",
    description: "Python web framework",
    icon: Database,
    command: "django-admin startproject",
    projectNamePlaceholder: "my_django_project",
    color: "text-green-600",
    category: "backend",
  },
  {
    id: "phoenix",
    name: "Phoenix",
    description: "Elixir web framework",
    icon: Flame,
    command: "mix phx.new",
    projectNamePlaceholder: "my_phoenix_app",
    color: "text-orange-500",
    category: "backend",
  },
  {
    id: "laravel",
    name: "Laravel",
    description: "PHP full-stack framework",
    icon: Code,
    command: "composer create-project laravel/laravel",
    projectNamePlaceholder: "my-laravel-app",
    color: "text-red-400",
    category: "backend",
  },

  // Desktop
  {
    id: "tauri",
    name: "Tauri",
    description: "Build desktop apps with web tech",
    icon: Box,
    command: "npm create tauri-app@latest",
    projectNamePlaceholder: "my-tauri-app",
    color: "text-orange-500",
    category: "desktop",
  },
  {
    id: "electron",
    name: "Electron",
    description: "Cross-platform desktop apps",
    icon: MonitorSmartphone,
    command: "npx create-electron-app@latest",
    projectNamePlaceholder: "my-electron-app",
    color: "text-sky-400",
    category: "desktop",
  },

  // Tooling & Libraries
  {
    id: "oclif",
    name: "CLI Tool",
    description: "oclif - Build powerful CLI apps",
    icon: TerminalIcon,
    command: "npx oclif generate",
    projectNamePlaceholder: "my-cli",
    color: "text-green-500",
    category: "tooling",
  },
  {
    id: "turborepo",
    name: "Turborepo",
    description: "Monorepo build system",
    icon: Boxes,
    command: "npx create-turbo@latest",
    projectNamePlaceholder: "my-turborepo",
    color: "text-pink-500",
    category: "tooling",
  },
  {
    id: "t3",
    name: "T3 Stack",
    description: "Next.js + tRPC + Prisma + Tailwind",
    icon: Layers,
    command: "npm create t3-app@latest",
    projectNamePlaceholder: "my-t3-app",
    color: "text-violet-500",
    category: "tooling",
  },
  {
    id: "payload",
    name: "Payload CMS",
    description: "Headless CMS for Next.js",
    icon: Database,
    command: "npx create-payload-app@latest",
    projectNamePlaceholder: "my-payload-app",
    color: "text-blue-500",
    category: "tooling",
  },
  {
    id: "docusaurus",
    name: "Docusaurus",
    description: "Documentation static site generator",
    icon: BookOpen,
    command: "npx create-docusaurus@latest",
    projectNamePlaceholder: "my-docs",
    color: "text-green-500",
    category: "tooling",
  },
  {
    id: "storybook",
    name: "Storybook",
    description: "Component development environment",
    icon: Book,
    command: "npx storybook@latest init",
    projectNamePlaceholder: "my-storybook",
    color: "text-pink-400",
    category: "tooling",
  },
];

type Phase = "select" | "configure" | "running" | "complete";

function loadFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    console.error("Failed to load favorites:", error);
  }
  return new Set();
}

function saveFavorites(favorites: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
  } catch (error) {
    console.error("Failed to save favorites:", error);
  }
}

export function ProjectTemplatesPopup({
  isOpen,
  onClose,
  onOpenProject,
}: ProjectTemplatesPopupProps) {
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateDefinition | null>(null);
  const [projectName, setProjectName] = useState("");
  const [destinationPath, setDestinationPath] = useState("");
  const [useCurrentProject, setUseCurrentProject] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [homeDir, setHomeDir] = useState("");
  const [ptyId, setPtyId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [createdProjectPath, setCreatedProjectPath] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(() =>
    loadFavorites(),
  );

  const activeProject = useProjectStore((s) => {
    if (!s.activeProjectId) return null;
    return s.projects.find((p) => p.id === s.activeProjectId) || null;
  });

  useEffect(() => {
    if (isOpen) {
      invoke<string>("get_home_dir").then(setHomeDir).catch(console.error);
      setPhase("select");
      setSelectedTemplate(null);
      setProjectName("");
      setDestinationPath("");
      setUseCurrentProject(false);
      setPtyId(null);
      setIsComplete(false);
      setCreatedProjectPath("");
      setSearchQuery("");
    }
  }, [isOpen]);

  const toggleFavorite = useCallback(
    (templateId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(templateId)) {
          next.delete(templateId);
        } else {
          next.add(templateId);
        }
        saveFavorites(next);
        return next;
      });
    },
    [],
  );

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return TEMPLATES;
    const query = searchQuery.toLowerCase();
    return TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const favoriteTemplates = useMemo(() => {
    return filteredTemplates.filter((t) => favorites.has(t.id));
  }, [filteredTemplates, favorites]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<TemplateCategory, TemplateDefinition[]> = {
      ai: [],
      extensions: [],
      mobile: [],
      frontend: [],
      backend: [],
      desktop: [],
      tooling: [],
    };
    filteredTemplates.forEach((t) => {
      groups[t.category].push(t);
    });
    return groups;
  }, [filteredTemplates]);

  const handleTemplateSelect = (template: TemplateDefinition) => {
    setSelectedTemplate(template);
    setProjectName(template.projectNamePlaceholder);
    setPhase("configure");
  };

  const handleBack = () => {
    if (phase === "configure") {
      setPhase("select");
      setSelectedTemplate(null);
    }
  };

  const handleDestinationSelect = (path: string) => {
    setDestinationPath(path);
    setShowFileBrowser(false);
  };

  const getFullCommand = () => {
    if (!selectedTemplate) return "";
    const name = projectName || selectedTemplate.projectNamePlaceholder;

    switch (selectedTemplate.id) {
      case "vite-react":
        return `${selectedTemplate.command} ${name} -- --template react-ts`;
      case "solid":
        return `${selectedTemplate.command} ${name}`;
      default:
        return `${selectedTemplate.command} ${name}`;
    }
  };

  const getWorkingDirectory = () => {
    if (useCurrentProject && activeProject) {
      return activeProject.path;
    }
    return destinationPath || homeDir;
  };

  const handleCreate = async () => {
    if (!selectedTemplate) return;

    const workingDir = getWorkingDirectory();
    const projectPath = `${workingDir}/${projectName || selectedTemplate.projectNamePlaceholder}`;
    setCreatedProjectPath(projectPath);
    setPhase("running");
  };

  const handlePtyCreated = async (id: string) => {
    setPtyId(id);

    const command = getFullCommand();
    if (command) {
      await invoke("write_pty", { ptyId: id, data: command + "\n" });
    }
  };

  const handleOpenCreatedProject = () => {
    if (createdProjectPath && onOpenProject) {
      onOpenProject(createdProjectPath);
      onClose();
    }
  };

  const renderTemplateCard = (template: TemplateDefinition) => {
    const Icon = template.icon;
    const isFavorite = favorites.has(template.id);
    return (
      <button
        key={template.id}
        onClick={() => handleTemplateSelect(template)}
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border border-border relative group",
          "bg-bg-primary hover:bg-bg-hover transition-colors text-left",
          "focus:outline-none focus:ring-2 focus:ring-accent/50",
        )}
      >
        <div className={cn("mt-0.5 shrink-0", template.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-text-primary text-sm">
            {template.name}
          </div>
          <div className="text-xs text-text-secondary mt-0.5 truncate">
            {template.description}
          </div>
        </div>
        <button
          onClick={(e) => toggleFavorite(template.id, e)}
          className={cn(
            "absolute top-2 right-2 p-1 rounded transition-all",
            isFavorite
              ? "text-yellow-400 opacity-100"
              : "text-text-secondary opacity-0 group-hover:opacity-100 hover:text-yellow-400",
          )}
        >
          <Star className={cn("w-4 h-4", isFavorite && "fill-yellow-400")} />
        </button>
      </button>
    );
  };

  const renderTemplateGrid = () => (
    <div className="flex flex-col h-[500px]">
      {/* Search Box */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            autoFocus
            className={cn(
              "w-full pl-9 pr-3 py-2 rounded-md border border-border",
              "bg-bg-primary text-text-primary text-sm",
              "focus:outline-none focus:ring-2 focus:ring-accent/50",
              "placeholder:text-text-secondary",
            )}
          />
        </div>
      </div>

      {/* Template Categories */}
      <ScrollArea className="flex-1" scrollbarVisibility="visible">
        <div className="p-3 space-y-4">
          {/* Favorites Section */}
          {favoriteTemplates.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-yellow-400" />
                Favorites
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {favoriteTemplates.map(renderTemplateCard)}
              </div>
            </div>
          )}

          {/* Category Sections */}
          {(Object.keys(CATEGORY_INFO) as TemplateCategory[])
            .sort((a, b) => CATEGORY_INFO[a].order - CATEGORY_INFO[b].order)
            .map((category) => {
              const templates = groupedTemplates[category];
              if (templates.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-1">
                    {CATEGORY_INFO[category].label}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {templates.map(renderTemplateCard)}
                  </div>
                </div>
              );
            })}

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-text-secondary">
              No templates found for "{searchQuery}"
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const renderConfigurePhase = () => {
    if (!selectedTemplate) return null;
    const Icon = selectedTemplate.icon;
    const workingDir = getWorkingDirectory();

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <IconButton size="sm" onClick={handleBack} aria-label="Go back to template selection">
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <div className={selectedTemplate.color}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium">{selectedTemplate.name}</div>
            <div className="text-xs text-text-secondary">
              {selectedTemplate.description}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="template-project-name" className="block text-sm font-medium text-text-secondary mb-1.5">
              Project Name
            </label>
            <input
              id="template-project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={selectedTemplate.projectNamePlaceholder}
              className={cn(
                "w-full px-3 py-2 rounded-md border border-border",
                "bg-bg-primary text-text-primary",
                "focus:outline-none focus:ring-2 focus:ring-accent/50",
              )}
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-text-secondary mb-1.5">
              Destination
            </span>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setUseCurrentProject(false)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-md border text-sm transition-colors",
                  !useCurrentProject
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-bg-primary text-text-secondary hover:bg-bg-hover",
                )}
              >
                New Folder
              </button>
              <button
                onClick={() => setUseCurrentProject(true)}
                disabled={!activeProject}
                className={cn(
                  "flex-1 px-3 py-2 rounded-md border text-sm transition-colors",
                  useCurrentProject
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-bg-primary text-text-secondary hover:bg-bg-hover",
                  !activeProject && "opacity-50 cursor-not-allowed",
                )}
              >
                Current Project
              </button>
            </div>
            {!useCurrentProject && (
              <button
                onClick={() => setShowFileBrowser(true)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md border border-border",
                  "bg-bg-primary text-text-secondary hover:bg-bg-hover transition-colors text-left",
                )}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="truncate flex-1">
                  {destinationPath || homeDir || "Select folder..."}
                </span>
              </button>
            )}
            {useCurrentProject && activeProject && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-bg-tertiary text-text-secondary text-sm">
                <FolderOpen className="w-4 h-4" />
                <span className="truncate">{activeProject.path}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border">
            <span className="block text-sm font-medium text-text-secondary mb-1.5">
              Command Preview
            </span>
            <code className="block px-3 py-2 rounded-md bg-bg-tertiary text-text-secondary text-sm font-mono">
              cd {workingDir} && {getFullCommand()}
            </code>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className={cn(
              "px-4 py-2 rounded-md border border-border",
              "bg-bg-primary text-text-secondary hover:bg-bg-hover transition-colors",
            )}
          >
            Cancel
          </button>
          <button onClick={handleCreate} className="btn-primary">
            <Play className="w-4 h-4" />
            Create Project
          </button>
        </div>
      </div>
    );
  };

  const renderRunningPhase = () => {
    const workingDir = getWorkingDirectory();

    return (
      <div className="flex flex-col h-[500px]">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            {selectedTemplate && (
              <>
                <selectedTemplate.icon
                  className={cn("w-4 h-4", selectedTemplate.color)}
                />
                <span className="font-medium">{selectedTemplate.name}</span>
              </>
            )}
            <span className="text-text-secondary">
              - Creating {projectName}
            </span>
          </div>
          {isComplete && (
            <div className="flex items-center gap-2 text-green-500">
              <Check className="w-4 h-4" />
              <span className="text-sm">Complete</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <Terminal
            projectPath={workingDir}
            ptyId={ptyId}
            onPtyCreated={handlePtyCreated}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-secondary">
          <button
            onClick={onClose}
            className={cn(
              "px-4 py-2 rounded-md border border-border",
              "bg-bg-primary text-text-secondary hover:bg-bg-hover transition-colors",
            )}
          >
            Close
          </button>
          {onOpenProject && (
            <button onClick={handleOpenCreatedProject} className="btn-primary">
              <FolderOpen className="w-4 h-4" />
              Open Project
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={phase === "select" ? `Starter Template Library (${TEMPLATES.length})` : undefined}
        size={phase === "running" ? "xl" : "lg"}
        showCloseButton={phase !== "running"}
      >
        {phase === "select" && renderTemplateGrid()}
        {phase === "configure" && renderConfigurePhase()}
        {(phase === "running" || phase === "complete") && renderRunningPhase()}
      </Modal>

      <FileBrowserPopup
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
        initialPath={destinationPath || homeDir}
        mode="selectProject"
        selectButtonLabel="Select Folder"
        onSelectProject={handleDestinationSelect}
      />
    </>
  );
}
