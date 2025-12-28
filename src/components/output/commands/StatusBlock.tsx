import { Bot, FolderOpen, Wrench, Server, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusResponse } from "@/types/slashCommandResponse";

interface StatusBlockProps {
  data: StatusResponse;
}

function getModelDisplayName(model: string): string {
  if (model.includes("opus")) return "Claude Opus";
  if (model.includes("sonnet")) return "Claude Sonnet";
  if (model.includes("haiku")) return "Claude Haiku";
  return model;
}

function getPermissionBadgeColor(mode?: string): string {
  switch (mode?.toLowerCase()) {
    case "bypasspermissions":
      return "bg-accent-red/10 text-accent-red";
    case "acceptedits":
      return "bg-yellow-500/10 text-yellow-400";
    case "plan":
      return "bg-blue-500/10 text-blue-400";
    case "default":
    default:
      return "bg-green-500/10 text-green-400";
  }
}

export function StatusBlock({ data }: StatusBlockProps) {
  const { model, cwd, permissionMode, tools, mcpServers, isActive } = data;

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            isActive ? "bg-green-500/10" : "bg-bg-hover"
          )}
        >
          {isActive ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <Bot className="w-5 h-5 text-text-secondary" />
          )}
        </div>
        <div>
          <div className="text-sm font-medium text-text-primary">
            {isActive ? "Session Active" : "Session Inactive"}
          </div>
          <div className="text-xs text-text-secondary">
            {getModelDisplayName(model)}
          </div>
        </div>
        {permissionMode && (
          <span
            className={cn(
              "ml-auto text-xs px-2 py-1 rounded",
              getPermissionBadgeColor(permissionMode)
            )}
          >
            {permissionMode}
          </span>
        )}
      </div>

      {/* Working directory */}
      {cwd && (
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-bg-hover/50">
          <FolderOpen className="w-4 h-4 text-text-secondary" />
          <span className="text-xs font-mono text-text-primary truncate">{cwd}</span>
        </div>
      )}

      {/* Tools */}
      {tools.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Wrench className="w-3.5 h-3.5" />
            <span>Available Tools ({tools.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tools.slice(0, 12).map((tool) => (
              <span
                key={tool}
                className="text-xs px-2 py-0.5 rounded bg-bg-hover text-text-secondary"
              >
                {tool}
              </span>
            ))}
            {tools.length > 12 && (
              <span className="text-xs px-2 py-0.5 rounded bg-bg-hover text-text-secondary">
                +{tools.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* MCP Servers */}
      {mcpServers && mcpServers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Server className="w-3.5 h-3.5" />
            <span>MCP Servers ({mcpServers.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mcpServers.map((server) => (
              <span
                key={server}
                className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400"
              >
                {server}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
