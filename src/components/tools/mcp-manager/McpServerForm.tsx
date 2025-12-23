import { useState, useEffect } from "react";
import { X, AlertCircle, Check, Loader2 } from "lucide-react";
import { IconButton, Button } from "@/components/ui";
import { McpEnvEditor } from "./McpEnvEditor";
import { useMcpStore } from "@/stores";
import { useProjectStore } from "@/stores/projectStore";
import type { McpServer, McpServerInput, McpScope } from "@/types";
import { cn } from "@/lib/utils";

interface McpServerFormProps {
  server?: McpServer | null;
  onClose: () => void;
}

export function McpServerForm({ server, onClose }: McpServerFormProps) {
  const { saveServer, validateCommand, isLoading } = useMcpStore();
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getProject = useProjectStore((s) => s.getProject);
  const activeProject = activeProjectId ? getProject(activeProjectId) : undefined;

  const isEditing = !!server;

  const [name, setName] = useState(server?.name || "");
  const [command, setCommand] = useState(server?.command || "npx");
  const [argsText, setArgsText] = useState(
    server?.args.join("\n") || "-y\n"
  );
  const [env, setEnv] = useState<Record<string, string>>(server?.env || {});
  const [scope, setScope] = useState<McpScope>(server?.scope || "global");

  const [nameError, setNameError] = useState("");
  const [commandValid, setCommandValid] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Validate command on change
  useEffect(() => {
    if (!command.trim()) {
      setCommandValid(null);
      return;
    }

    setIsValidating(true);
    const timer = setTimeout(async () => {
      const valid = await validateCommand(command.trim());
      setCommandValid(valid);
      setIsValidating(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [command, validateCommand]);

  const validateName = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      setNameError("Name is required");
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      setNameError("Use lowercase letters, numbers, and hyphens only");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleSubmit = async () => {
    if (!validateName(name)) return;

    const args = argsText
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean);

    const serverInput: McpServerInput = {
      name: name.trim().toLowerCase(),
      command: command.trim(),
      args,
      env,
      scope,
      projectPath: scope !== "global" ? activeProject?.path : undefined,
    };

    try {
      await saveServer(serverInput);
      onClose();
    } catch (error) {
      console.error("Failed to save MCP server:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-bg-secondary rounded-lg border border-border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-medium">
            {isEditing ? "Edit MCP Server" : "Add MCP Server"}
          </span>
          <IconButton size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              Server Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                validateName(e.target.value);
              }}
              disabled={isEditing}
              className={cn(
                "w-full px-3 py-2 rounded-md bg-bg-primary border text-sm font-mono focus:outline-none focus:border-accent",
                nameError ? "border-red-500" : "border-border",
                isEditing && "opacity-50 cursor-not-allowed"
              )}
              placeholder="my-mcp-server"
            />
            {nameError && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {nameError}
              </p>
            )}
          </div>

          {/* Command */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              Command
            </label>
            <div className="relative">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 pr-8 rounded-md bg-bg-primary border text-sm font-mono focus:outline-none focus:border-accent",
                  commandValid === false ? "border-yellow-500" : "border-border"
                )}
                placeholder="npx"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {isValidating ? (
                  <Loader2 className="w-4 h-4 text-text-secondary animate-spin" />
                ) : commandValid === true ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : commandValid === false ? (
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                ) : null}
              </div>
            </div>
            {commandValid === false && (
              <p className="text-xs text-yellow-500 mt-1">
                Command not found in PATH (may still work)
              </p>
            )}
          </div>

          {/* Args */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              Arguments (one per line)
            </label>
            <textarea
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-md bg-bg-primary border border-border text-sm font-mono focus:outline-none focus:border-accent resize-none"
              placeholder="-y&#10;package-name"
            />
            <p className="text-[10px] text-text-secondary/70 mt-1">
              e.g., -y, package-name, --flag=value
            </p>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              Scope
            </label>
            <div className="flex gap-2">
              {(["global", "project", "project-local"] as McpScope[]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    disabled={s !== "global" && !activeProject}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                      scope === s
                        ? "bg-accent text-white"
                        : "bg-bg-tertiary text-text-secondary hover:text-text-primary",
                      s !== "global" &&
                        !activeProject &&
                        "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {s === "global"
                      ? "Global"
                      : s === "project"
                      ? "Project"
                      : "Local (.mcp.json)"}
                  </button>
                )
              )}
            </div>
            {scope !== "global" && activeProject && (
              <p className="text-[10px] text-text-secondary/70 mt-1">
                Will be saved to: {activeProject.path}
              </p>
            )}
          </div>

          {/* Environment Variables */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              Environment Variables
            </label>
            <McpEnvEditor value={env} onChange={setEnv} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isLoading || !name.trim() || !command.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Add Server"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
