import { useState } from "react";
import {
  Pencil,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  Globe,
  FolderOpen,
  FileCode,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { McpServer, McpScope } from "@/types";
import { useMcpStore, isSensitiveEnvKey } from "@/stores";

interface McpServerRowProps {
  server: McpServer;
  onEdit: (server: McpServer) => void;
  onDelete: (server: McpServer) => void;
}

const scopeIcons: Record<McpScope, typeof Globe> = {
  global: Globe,
  project: FolderOpen,
  "project-local": FileCode,
};

const scopeLabels: Record<McpScope, string> = {
  global: "Global",
  project: "Project",
  "project-local": "Local",
};

export function McpServerRow({ server, onEdit, onDelete }: McpServerRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { toggleServer, revealedEnvKeys, revealEnvKey, hideEnvKey } =
    useMcpStore();

  const ScopeIcon = scopeIcons[server.scope];
  const hasEnvVars = Object.keys(server.env).length > 0;

  const handleToggle = async () => {
    try {
      await toggleServer(server.name, !server.isEnabled);
    } catch (error) {
      console.error("Failed to toggle MCP server:", error);
    }
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(server);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const handleCopyEnvValue = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isEnvKeyRevealed = (key: string) =>
    revealedEnvKeys.has(`${server.name}:${key}`);

  const commandPreview = [server.command, ...server.args.slice(0, 2)].join(" ");
  const truncatedCommand =
    commandPreview.length > 50
      ? commandPreview.slice(0, 47) + "..."
      : commandPreview;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-bg-tertiary/30">
      {/* Main row */}
      <div className="group flex items-center gap-3 p-3 hover:bg-bg-tertiary/50 transition-colors">
        {/* Toggle switch */}
        <button
          onClick={handleToggle}
          className={cn(
            "relative w-9 h-5 rounded-full transition-colors flex-shrink-0",
            server.isEnabled ? "bg-accent" : "bg-gray-500"
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
              server.isEnabled ? "left-[18px]" : "left-0.5"
            )}
          />
        </button>

        {/* Expand button for env vars */}
        {hasEnvVars && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-bg-hover rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-secondary" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            )}
          </button>
        )}

        {/* Server info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Tooltip content={scopeLabels[server.scope]}>
              <ScopeIcon className="w-4 h-4 text-text-secondary flex-shrink-0" />
            </Tooltip>
            <span className="font-medium text-sm truncate">{server.name}</span>
            {!server.isEnabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary">
                disabled
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <code className="text-xs text-text-secondary font-mono truncate">
              {truncatedCommand}
            </code>
            {hasEnvVars && (
              <span className="text-[10px] text-text-secondary/70">
                {Object.keys(server.env).length} env var
                {Object.keys(server.env).length !== 1 && "s"}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content="Edit">
            <IconButton size="sm" onClick={() => onEdit(server)} aria-label="Edit MCP server">
              <Pencil className="w-3.5 h-3.5" />
            </IconButton>
          </Tooltip>

          <Tooltip content="View on npm">
            <IconButton
              size="sm"
              onClick={() => {
                // Try to extract package name from args
                const pkgArg = server.args.find(
                  (a) => !a.startsWith("-") && a !== "-y"
                );
                if (pkgArg) {
                  open(`https://www.npmjs.com/package/${pkgArg}`);
                }
              }}
              aria-label="View on npm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </IconButton>
          </Tooltip>

          <Tooltip content={confirmDelete ? "Click to confirm" : "Delete"}>
            <IconButton
              size="sm"
              onClick={handleDelete}
              aria-label={confirmDelete ? "Confirm delete" : "Delete MCP server"}
              className={cn(
                "hover:text-red-400 hover:bg-red-500/10",
                confirmDelete && "text-red-400 bg-red-500/10"
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Expanded env vars */}
      {isExpanded && hasEnvVars && (
        <div className="border-t border-border bg-bg-secondary/50 px-3 py-2">
          <div className="text-[10px] text-text-secondary/70 uppercase tracking-wider mb-2">
            Environment Variables
          </div>
          <div className="space-y-1.5">
            {Object.entries(server.env).map(([key, value]) => {
              const isSensitive = isSensitiveEnvKey(key);
              const isRevealed = isEnvKeyRevealed(key);
              const isCopied = copiedKey === key;

              return (
                <div
                  key={key}
                  className="flex items-center gap-2 group/env"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {isSensitive && (
                      <Shield className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                    )}
                    <span className="font-mono text-xs text-accent font-medium">
                      {key}
                    </span>
                    <span className="text-text-secondary text-xs">=</span>
                    <span
                      className={cn(
                        "font-mono text-xs truncate max-w-[200px]",
                        isSensitive && !isRevealed
                          ? "blur-sm select-none"
                          : "text-text-primary"
                      )}
                    >
                      {value || "(empty)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover/env:opacity-100 transition-opacity">
                    {isSensitive && (
                      <IconButton
                        size="sm"
                        onClick={() =>
                          isRevealed
                            ? hideEnvKey(server.name, key)
                            : revealEnvKey(server.name, key)
                        }
                        aria-label={isRevealed ? "Hide environment variable" : "Show environment variable"}
                      >
                        {isRevealed ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </IconButton>
                    )}
                    <IconButton
                      size="sm"
                      onClick={() => handleCopyEnvValue(key, value)}
                      aria-label="Copy environment variable value"
                    >
                      {isCopied ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
