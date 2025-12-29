import { useEffect } from "react";
import { Plus, RefreshCw, Loader2, AlertCircle, Blocks } from "lucide-react";
import { Modal, IconButton, Tooltip } from "@/components/ui";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useMcpStore } from "@/stores";
import { useProjectStore } from "@/stores/projectStore";
import { McpServerRow } from "./McpServerRow";
import { McpServerForm } from "./McpServerForm";
import type { McpScope, McpServer } from "@/types";
import { cn } from "@/lib/utils";

const scopeFilters: { value: McpScope | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "global", label: "Global" },
  { value: "project", label: "Project" },
  { value: "project-local", label: "Local" },
];

export function McpManagerPopup() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getProject = useProjectStore((s) => s.getProject);
  const activeProject = activeProjectId ? getProject(activeProjectId) : undefined;
  const {
    isPopupOpen,
    closePopup,
    servers,
    isLoading,
    error,
    activeScope,
    setActiveScope,
    isFormOpen,
    editingServer,
    openForm,
    closeForm,
    loadServers,
    deleteServer,
  } = useMcpStore();

  // Load servers when popup opens
  useEffect(() => {
    if (isPopupOpen) {
      loadServers(activeProject?.path);
    }
  }, [isPopupOpen, activeProject?.path, loadServers]);

  const handleRefresh = () => {
    loadServers(activeProject?.path);
  };

  const handleDelete = async (server: McpServer) => {
    try {
      await deleteServer(server.name, server.scope, server.projectPath);
    } catch (error) {
      console.error("Failed to delete MCP server:", error);
    }
  };

  // Filter servers by scope
  const filteredServers =
    activeScope === "all"
      ? servers
      : servers.filter((s) => s.scope === activeScope);

  // Group by enabled status
  const enabledServers = filteredServers.filter((s) => s.isEnabled);
  const disabledServers = filteredServers.filter((s) => !s.isEnabled);

  if (!isPopupOpen) return null;

  return (
    <>
      <Modal
        isOpen={isPopupOpen}
        onClose={closePopup}
        title="MCP Servers"
        size="lg"
      >
        <div className="flex flex-col h-[600px]">
          {/* Header with tabs and actions */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border">
            {/* Scope tabs */}
            <div className="flex items-center gap-1">
              {scopeFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setActiveScope(filter.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    activeScope === filter.value
                      ? "bg-accent text-primary-950"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <Tooltip content="Refresh">
              <IconButton size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw
                  className={cn("w-4 h-4", isLoading && "animate-spin")}
                />
              </IconButton>
            </Tooltip>

            <Tooltip content="Add MCP Server">
              <IconButton
                size="sm"
                onClick={() => openForm()}
                className="text-accent hover:bg-accent/10"
              >
                <Plus className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          {/* Content */}
          <OverlayScrollbarsComponent
            className="flex-1 -mx-1 px-1 os-theme-custom"
            options={{
              scrollbars: { theme: "os-theme-custom", autoHide: "scroll" },
            }}
          >
            <div className="p-4 space-y-4">
              {isLoading && servers.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-accent animate-spin" />
                </div>
              ) : filteredServers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Blocks className="w-12 h-12 text-text-secondary/30 mb-3" />
                  <p className="text-sm text-text-secondary">
                    No MCP servers found
                  </p>
                  <p className="text-xs text-text-secondary/70 mt-1">
                    Click + to add your first MCP server
                  </p>
                </div>
              ) : (
                <>
                  {/* Enabled servers */}
                  {enabledServers.length > 0 && (
                    <div>
                      <div className="text-[10px] text-text-secondary/70 uppercase tracking-wider mb-2 px-1">
                        Enabled ({enabledServers.length})
                      </div>
                      <div className="space-y-2">
                        {enabledServers.map((server) => (
                          <McpServerRow
                            key={`${server.scope}-${server.name}`}
                            server={server}
                            onEdit={openForm}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disabled servers */}
                  {disabledServers.length > 0 && (
                    <div>
                      <div className="text-[10px] text-text-secondary/70 uppercase tracking-wider mb-2 px-1">
                        Disabled ({disabledServers.length})
                      </div>
                      <div className="space-y-2">
                        {disabledServers.map((server) => (
                          <McpServerRow
                            key={`${server.scope}-${server.name}`}
                            server={server}
                            onEdit={openForm}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </OverlayScrollbarsComponent>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border">
            <p className="text-[11px] text-text-secondary/70">
              Toggle servers on/off to enable or disable them.
            </p>
          </div>
        </div>
      </Modal>

      {/* Form modal */}
      {isFormOpen && (
        <McpServerForm server={editingServer} onClose={closeForm} />
      )}
    </>
  );
}
