import { Check, X, Hexagon, GitBranch, Package, Terminal } from "lucide-react";
import type { SystemCheckResults } from "./types";

interface DevToolsSectionProps {
  devTools: SystemCheckResults | null;
}

export function DevToolsSection({ devTools }: DevToolsSectionProps) {
  if (!devTools) return null;

  const tools = [
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
      name: "Git",
      version: devTools.git,
      icon: <GitBranch className="w-4 h-4 text-orange-500" />,
    },
    {
      name: "Claude CLI",
      version: devTools.claude,
      icon: <Terminal className="w-4 h-4 text-purple-500" />,
    },
  ];

  return (
    <div className="rounded-lg bg-bg-tertiary/50 border border-border p-4">
      <h3 className="text-sm font-medium text-text-primary mb-3">
        Development Tools
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="flex items-center gap-3 p-2 rounded-md bg-bg-primary/50"
          >
            <div className="flex-shrink-0">{tool.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary">
                {tool.name}
              </div>
              <div className="flex items-center gap-1.5">
                {tool.version ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-text-secondary font-mono">
                      v{tool.version}
                    </span>
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 text-red-400" />
                    <span className="text-xs text-red-400">Not installed</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
