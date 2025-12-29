import {
  Check,
  X,
  Hexagon,
  GitBranch,
  Package,
  Terminal,
  Gem,
  Train,
  Boxes,
  Beer,
  Container,
  Flame,
  Cog,
} from "lucide-react";
import type { SystemCheckResults } from "./types";

interface DevToolsSectionProps {
  devTools: SystemCheckResults | null;
}

interface ToolGroup {
  title: string;
  tools: {
    name: string;
    version: string | null;
    icon: React.ReactNode;
  }[];
}

export function DevToolsSection({ devTools }: DevToolsSectionProps) {
  if (!devTools) return null;

  const toolGroups: ToolGroup[] = [
    {
      title: "JavaScript",
      tools: [
        {
          name: "Node.js",
          version: devTools.node,
          icon: <Hexagon className="w-4 h-4 text-green-500" />,
        },
        {
          name: "npm",
          version: devTools.npm,
          icon: <Package className="w-4 h-4 text-red-500" />,
        },
        {
          name: "pnpm",
          version: devTools.pnpm,
          icon: <Package className="w-4 h-4 text-yellow-500" />,
        },
        {
          name: "yarn",
          version: devTools.yarn,
          icon: <Package className="w-4 h-4 text-blue-400" />,
        },
        {
          name: "Bun",
          version: devTools.bun,
          icon: <Flame className="w-4 h-4 text-pink-400" />,
        },
      ],
    },
    {
      title: "Ruby",
      tools: [
        {
          name: "Ruby",
          version: devTools.ruby,
          icon: <Gem className="w-4 h-4 text-red-400" />,
        },
        {
          name: "Rails",
          version: devTools.rails,
          icon: <Train className="w-4 h-4 text-red-500" />,
        },
        {
          name: "Bundler",
          version: devTools.bundler,
          icon: <Boxes className="w-4 h-4 text-blue-400" />,
        },
      ],
    },
    {
      title: "Python",
      tools: [
        {
          name: "Python",
          version: devTools.python,
          icon: <span className="w-4 h-4 text-yellow-400 font-bold text-xs">Py</span>,
        },
        {
          name: "pip",
          version: devTools.pip,
          icon: <Package className="w-4 h-4 text-blue-500" />,
        },
      ],
    },
    {
      title: "Systems",
      tools: [
        {
          name: "Go",
          version: devTools.go,
          icon: <span className="w-4 h-4 text-cyan-400 font-bold text-xs">Go</span>,
        },
        {
          name: "Rust",
          version: devTools.rust,
          icon: <Cog className="w-4 h-4 text-orange-400" />,
        },
        {
          name: "Cargo",
          version: devTools.cargo,
          icon: <Package className="w-4 h-4 text-orange-500" />,
        },
      ],
    },
    {
      title: "Tools",
      tools: [
        {
          name: "Git",
          version: devTools.git,
          icon: <GitBranch className="w-4 h-4 text-orange-500" />,
        },
        {
          name: "Docker",
          version: devTools.docker,
          icon: <Container className="w-4 h-4 text-blue-400" />,
        },
        {
          name: "Homebrew",
          version: devTools.homebrew,
          icon: <Beer className="w-4 h-4 text-yellow-500" />,
        },
      ],
    },
    {
      title: "AI",
      tools: [
        {
          name: "Claude CLI",
          version: devTools.claude,
          icon: <Terminal className="w-4 h-4 text-purple-500" />,
        },
        {
          name: "Codex",
          version: devTools.codex,
          icon: <Terminal className="w-4 h-4 text-green-400" />,
        },
        {
          name: "Gemini",
          version: devTools.gemini,
          icon: <Terminal className="w-4 h-4 text-blue-400" />,
        },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {toolGroups.map((group) => (
        <div
          key={group.title}
          className="rounded-lg bg-bg-tertiary/50 border border-border p-4"
        >
          <h3 className="text-sm font-medium text-text-primary mb-3">
            {group.title}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {group.tools.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center gap-2 p-2 rounded-md bg-bg-primary/50"
              >
                <div className="flex-shrink-0">{tool.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-text-primary truncate">
                    {tool.name}
                  </div>
                  <div className="flex items-center gap-1">
                    {tool.version ? (
                      <>
                        <Check className="w-2.5 h-2.5 text-green-400" />
                        <span className="text-[10px] text-text-secondary font-mono truncate">
                          {tool.version}
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="w-2.5 h-2.5 text-red-400" />
                        <span className="text-[10px] text-red-400">N/A</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
