import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Square,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  AlertCircle,
  Smartphone,
  Globe,
  Zap,
  Triangle,
  Hexagon,
  Box,
  Disc,
  Rocket,
  Flame,
  Atom,
  FileCode,
  HelpCircle,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { IconButton, Tooltip, Modal } from "@/components/ui";
import { QRCodeDisplay } from "@/components/tools/QRCodeDisplay";
import { useLivePreviewStore } from "@/stores/livePreviewStore";
import { useProjectStore } from "@/stores";
import { cn } from "@/lib/utils";
import type {
  PreviewServerInfo,
  ProjectDetectionResult,
  PreviewEvent,
  PreviewStatus,
} from "@/types/livepreview";

interface LivePreviewPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const getFrameworkIcon = (name: string) => {
  const iconClass = "w-5 h-5";
  switch (name) {
    case "Vite":
      return <Zap className={`${iconClass} text-yellow-400`} />;
    case "Next.js":
      return <Triangle className={`${iconClass} text-white`} />;
    case "Nuxt":
      return <Hexagon className={`${iconClass} text-green-400`} />;
    case "Angular":
      return <Box className={`${iconClass} text-red-400`} />;
    case "Remix":
      return <Disc className={`${iconClass} text-blue-400`} />;
    case "Astro":
      return <Rocket className={`${iconClass} text-purple-400`} />;
    case "SvelteKit":
      return <Flame className={`${iconClass} text-orange-400`} />;
    case "Create React App":
    case "Vue CLI":
      return <Atom className={`${iconClass} text-cyan-400`} />;
    case "Static Site":
      return <FileCode className={`${iconClass} text-text-secondary`} />;
    default:
      return <HelpCircle className={`${iconClass} text-text-secondary`} />;
  }
};

export function LivePreviewPopup({ isOpen, onClose }: LivePreviewPopupProps) {
  const {
    servers,
    detectionResult,
    preferredPort,
    autoOpenBrowser,
    expandedServerId,
    setServers,
    updateServer,
    removeServer,
    setDetectionResult,
    setPreferredPort,
    setAutoOpenBrowser,
    setExpandedServerId,
  } = useLivePreviewStore();

  const { activeProjectId, projects } = useProjectStore();
  const activeProject = projects.find((p) => p.id === activeProjectId);

  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [portInput, setPortInput] = useState(preferredPort.toString());

  const detectProject = useCallback(async () => {
    if (!activeProject?.path) return;

    setDetecting(true);
    setError(null);
    try {
      const result = await invoke<ProjectDetectionResult>("detect_project_type", {
        projectPath: activeProject.path,
      });
      setDetectionResult(result);
      setPortInput(result.suggestedPort.toString());
    } catch (err) {
      setError(`Detection failed: ${err}`);
      setDetectionResult(null);
    } finally {
      setDetecting(false);
    }
  }, [activeProject?.path, setDetectionResult]);

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<PreviewServerInfo[]>("list_preview_servers");
      setServers(result);
    } catch (err) {
      console.error("Failed to fetch servers:", err);
    } finally {
      setLoading(false);
    }
  }, [setServers]);

  useEffect(() => {
    if (isOpen) {
      detectProject();
      fetchServers();
    }
  }, [isOpen, detectProject, fetchServers]);

  useEffect(() => {
    if (!isOpen) return;

    let unlisten: UnlistenFn | null = null;

    listen<PreviewEvent>("preview-event", (event) => {
      const { serverId, eventType, url, status, message } = event.payload;

      if (eventType === "ready" || eventType === "status_change") {
        updateServer(serverId, {
          url: url ?? undefined,
          status: status ?? undefined,
        });

        if (eventType === "ready" && autoOpenBrowser && url) {
          open(url);
        }
      }

      if (eventType === "stopped") {
        updateServer(serverId, { status: "idle" as PreviewStatus });
      }

      if (eventType === "error") {
        updateServer(serverId, {
          status: "error" as PreviewStatus,
          error: message ?? "Unknown error",
        });
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [isOpen, autoOpenBrowser, updateServer]);

  const handleStartServer = async () => {
    if (!activeProject?.path || !detectionResult) return;

    const port = parseInt(portInput, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      setError("Invalid port number");
      return;
    }

    setStarting(true);
    setError(null);
    try {
      await invoke<string>("start_preview_server", {
        projectPath: activeProject.path,
        port,
        useFrameworkServer: detectionResult.hasDevScript,
      });

      // Fetch fresh server list to get correct state
      await fetchServers();
      setPreferredPort(port);

      if (autoOpenBrowser) {
        open(`http://localhost:${port}`);
      }
    } catch (err) {
      setError(`Failed to start server: ${err}`);
    } finally {
      setStarting(false);
    }
  };

  const handleStopServer = async (serverId: string) => {
    try {
      await invoke("stop_preview_server", { serverId });
      removeServer(serverId);
    } catch (err) {
      setError(`Failed to stop server: ${err}`);
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      setError("Failed to copy URL");
    }
  };

  const getStatusColor = (status: PreviewStatus) => {
    switch (status) {
      case "running":
        return "bg-green-500";
      case "starting":
        return "bg-yellow-500 animate-pulse";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: PreviewStatus) => {
    switch (status) {
      case "running":
        return "Running";
      case "starting":
        return "Starting...";
      case "stopping":
        return "Stopping...";
      case "error":
        return "Error";
      case "idle":
        return "Stopped";
      default:
        return status;
    }
  };

  const activeServers = servers.filter(
    (s) => s.status === "running" || s.status === "starting"
  );

  const projectHasActiveServer = servers.some(
    (s) =>
      s.projectPath === activeProject?.path &&
      (s.status === "running" || s.status === "starting")
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Live Preview" size="lg">
      <div className="flex flex-col h-[500px] p-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-accent" />
            <span className="text-sm text-text-secondary">
              {activeServers.length} active{" "}
              {activeServers.length === 1 ? "server" : "servers"}
            </span>
          </div>
          <Tooltip content="Refresh">
            <IconButton
              size="sm"
              onClick={() => {
                detectProject();
                fetchServers();
              }}
              disabled={loading || detecting}
            >
              <RefreshCw
                className={cn(
                  "w-4 h-4",
                  (loading || detecting) && "animate-spin"
                )}
              />
            </IconButton>
          </Tooltip>
        </div>

        {/* No Project Warning */}
        {!activeProject && (
          <div className="flex items-start gap-3 p-3 mb-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">No project selected</p>
              <p className="text-xs text-yellow-400/80 mt-1">
                Open a project to start a preview server
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Project Detection */}
        {activeProject && (
          <div className="mb-4 p-3 rounded-lg bg-bg-tertiary/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">
                {getFrameworkIcon(detectionResult?.frameworkName ?? "Unknown")}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {detecting
                    ? "Detecting project..."
                    : detectionResult?.frameworkName ?? "Unknown Project"}
                </p>
                {detectionResult?.devCommand && (
                  <p className="text-xs text-text-secondary font-mono">
                    {detectionResult.devCommand}
                  </p>
                )}
                {!detectionResult?.hasDevScript &&
                  detectionResult?.hasIndexHtml && (
                    <p className="text-xs text-text-secondary">
                      Static file server
                    </p>
                  )}
              </div>
            </div>

            {/* Port Input & Start Button */}
            {!projectHasActiveServer && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs text-text-secondary">Port:</label>
                  <input
                    type="number"
                    value={portInput}
                    onChange={(e) => setPortInput(e.target.value)}
                    className="w-20 h-8 px-2 text-sm bg-bg-primary border border-border rounded-lg focus:outline-none focus:border-accent text-text-primary"
                    min="1"
                    max="65535"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoOpenBrowser}
                    onChange={(e) => setAutoOpenBrowser(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border accent-accent"
                  />
                  Auto-open browser
                </label>
              </div>
            )}

            {/* Start Button */}
            {!projectHasActiveServer && (
              <button
                onClick={handleStartServer}
                disabled={
                  starting ||
                  detecting ||
                  !detectionResult ||
                  (detectionResult.projectType === "unknown" &&
                    !detectionResult.hasIndexHtml)
                }
                className="btn-primary w-full mt-3 !h-10"
              >
                {starting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Preview Server
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Active Servers */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading && servers.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-secondary">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : servers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
              <Globe className="w-8 h-8 mb-2 opacity-50" />
              <p>No preview servers</p>
              <p className="text-xs mt-1">Start a server above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {servers.map((server) => (
                <div
                  key={server.serverId}
                  className="p-3 rounded-lg bg-bg-tertiary/50 border border-border"
                >
                  {/* Server Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          getStatusColor(server.status)
                        )}
                      />
                      <span className="font-mono text-sm font-semibold text-accent">
                        :{server.port}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {getStatusText(server.status)}
                      </span>
                    </div>
                    <Tooltip content="Stop Server" side="left">
                      <IconButton
                        size="sm"
                        onClick={() => handleStopServer(server.serverId)}
                        className="hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </IconButton>
                    </Tooltip>
                  </div>

                  {/* URL & Actions */}
                  {server.url && server.status === "running" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-2 py-1.5 text-xs bg-bg-primary rounded border border-border truncate">
                          {server.url}
                        </code>
                        <Tooltip
                          content={
                            copiedUrl === server.url ? "Copied!" : "Copy URL"
                          }
                        >
                          <IconButton
                            size="sm"
                            onClick={() => handleCopyUrl(server.url)}
                          >
                            {copiedUrl === server.url ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip content="Open in Browser">
                          <IconButton
                            size="sm"
                            onClick={() => open(server.url)}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip content="QR Code" side="left">
                          <IconButton
                            size="sm"
                            onClick={() =>
                              setExpandedServerId(
                                expandedServerId === server.serverId
                                  ? null
                                  : server.serverId
                              )
                            }
                            className={cn(
                              expandedServerId === server.serverId &&
                                "bg-bg-tertiary"
                            )}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </IconButton>
                        </Tooltip>
                      </div>

                      {/* Mobile URL */}
                      {server.localUrl && (
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-3.5 h-3.5 text-text-secondary" />
                          <code className="flex-1 px-2 py-1.5 text-xs bg-bg-primary rounded border border-border truncate text-text-secondary">
                            {server.localUrl}
                          </code>
                          <Tooltip content="Copy Mobile URL">
                            <IconButton
                              size="sm"
                              onClick={() => handleCopyUrl(server.localUrl!)}
                            >
                              {copiedUrl === server.localUrl ? (
                                <Check className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </div>
                      )}

                      {/* QR Code */}
                      {expandedServerId === server.serverId && (
                        <div className="flex justify-center pt-2">
                          <QRCodeDisplay
                            value={server.localUrl ?? server.url}
                            size={160}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Starting State */}
                  {server.status === "starting" && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Starting server...
                    </div>
                  )}

                  {/* Error State */}
                  {server.status === "error" && server.error && (
                    <div className="text-xs text-red-400 mt-1">
                      {server.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-border">
          <p className="text-[11px] text-text-secondary/70">
            {detectionResult?.hasDevScript
              ? "Uses your project's dev server with hot reload."
              : "Static file server with auto-refresh on changes."}
          </p>
        </div>
      </div>
    </Modal>
  );
}
