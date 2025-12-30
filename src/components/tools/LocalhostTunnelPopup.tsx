import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  RefreshCw,
  Copy,
  Check,
  Square,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  QrCode,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { IconButton, Tooltip, Modal } from "@/components/ui";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { cn } from "@/lib/utils";

interface PortInfo {
  port: number;
  pid: number;
  processName: string;
  user: string;
  protocol: string;
}

interface TunnelInfo {
  tunnelId: string;
  port: number;
  url: string | null;
  status: "starting" | "connected" | "reconnecting" | "failed" | "stopped";
  error: string | null;
  createdAt: number;
}

interface TunnelEvent {
  tunnelId: string;
  eventType: "url_ready" | "status_change" | "error" | "output";
  url?: string;
  status?: TunnelInfo["status"];
  message?: string;
}

interface LocalhostTunnelPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocalhostTunnelPopup({ isOpen, onClose }: LocalhostTunnelPopupProps) {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [tunnels, setTunnels] = useState<TunnelInfo[]>([]);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const [cloudflaredInstalled, setCloudflaredInstalled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [expandedQR, setExpandedQR] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [portsResult, tunnelsResult, installed] = await Promise.all([
        invoke<PortInfo[]>("list_listening_ports"),
        invoke<TunnelInfo[]>("list_tunnels"),
        invoke<boolean>("check_cloudflared_installed"),
      ]);
      setPorts(portsResult);
      setTunnels(tunnelsResult);
      setCloudflaredInstalled(installed);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  useEffect(() => {
    if (!isOpen) return;

    let unlisten: UnlistenFn | null = null;

    listen<TunnelEvent>("tunnel-event", (event) => {
      const { tunnelId, eventType, url, status } = event.payload;

      if (eventType === "url_ready" || eventType === "status_change") {
        setTunnels((prev) =>
          prev.map((t) =>
            t.tunnelId === tunnelId
              ? { ...t, url: url ?? t.url, status: status ?? t.status }
              : t
          )
        );
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [isOpen]);

  const handleStartTunnel = async () => {
    if (!selectedPort) return;

    setStarting(true);
    setError(null);
    try {
      const tunnelId = await invoke<string>("start_tunnel", { port: selectedPort });
      setTunnels((prev) => [
        ...prev,
        {
          tunnelId,
          port: selectedPort,
          url: null,
          status: "starting",
          error: null,
          createdAt: Date.now(),
        },
      ]);
      setSelectedPort(null);
    } catch (err) {
      setError(`Failed to start tunnel: ${err}`);
    } finally {
      setStarting(false);
    }
  };

  const handleStopTunnel = async (tunnelId: string) => {
    try {
      await invoke("stop_tunnel", { tunnelId });
      setTunnels((prev) => prev.filter((t) => t.tunnelId !== tunnelId));
    } catch (err) {
      setError(`Failed to stop tunnel: ${err}`);
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

  const availablePorts = ports.filter(
    (p) => !tunnels.some((t) => t.port === p.port && t.status !== "stopped")
  );

  const getStatusColor = (status: TunnelInfo["status"]) => {
    switch (status) {
      case "connected":
        return "bg-green-500";
      case "starting":
      case "reconnecting":
        return "bg-yellow-500 animate-pulse";
      case "failed":
      case "stopped":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: TunnelInfo["status"]) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "starting":
        return "Starting...";
      case "reconnecting":
        return "Reconnecting...";
      case "failed":
        return "Failed";
      case "stopped":
        return "Stopped";
      default:
        return status;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Localhost Tunnel" size="lg">
      <div className="flex flex-col h-[500px] p-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent" />
            <span className="text-sm text-text-secondary">
              {tunnels.filter((t) => t.status === "connected").length} active{" "}
              {tunnels.filter((t) => t.status === "connected").length === 1
                ? "tunnel"
                : "tunnels"}
            </span>
          </div>
          <Tooltip content="Refresh">
            <IconButton size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </IconButton>
          </Tooltip>
        </div>

        {/* Cloudflared Not Installed Warning */}
        {cloudflaredInstalled === false && (
          <div className="flex items-start gap-3 p-3 mb-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">cloudflared not installed</p>
              <p className="text-xs text-yellow-400/80 mt-1">
                Install via Homebrew:{" "}
                <code className="px-1 py-0.5 bg-bg-tertiary rounded">
                  brew install cloudflared
                </code>
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

        {/* Port Selector */}
        {cloudflaredInstalled && (
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <select
                value={selectedPort ?? ""}
                onChange={(e) => setSelectedPort(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-9 pl-3 pr-8 text-sm bg-bg-tertiary border border-border rounded-lg appearance-none cursor-pointer hover:border-border-hover focus:outline-none focus:border-accent text-text-primary"
                disabled={availablePorts.length === 0}
              >
                <option value="">
                  {availablePorts.length === 0
                    ? "No available ports"
                    : "Select a port to tunnel..."}
                </option>
                {availablePorts.map((p) => (
                  <option key={p.port} value={p.port}>
                    :{p.port} - {p.processName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            </div>
            <button
              onClick={handleStartTunnel}
              disabled={!selectedPort || starting}
              className="btn-primary !h-9"
            >
              {starting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "Create Tunnel"
              )}
            </button>
          </div>
        )}

        {/* Active Tunnels */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading && tunnels.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-secondary">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : tunnels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
              <Globe className="w-8 h-8 mb-2 opacity-50" />
              <p>No active tunnels</p>
              <p className="text-xs mt-1">Select a port above to create one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tunnels.map((tunnel) => (
                <div
                  key={tunnel.tunnelId}
                  className="p-3 rounded-lg bg-bg-tertiary/50 border border-border"
                >
                  {/* Tunnel Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("w-2 h-2 rounded-full", getStatusColor(tunnel.status))}
                      />
                      <span className="font-mono text-sm font-semibold text-accent">
                        :{tunnel.port}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {getStatusText(tunnel.status)}
                      </span>
                    </div>
                    <Tooltip content="Stop Tunnel" side="left">
                      <IconButton
                        size="sm"
                        onClick={() => handleStopTunnel(tunnel.tunnelId)}
                        className="hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </IconButton>
                    </Tooltip>
                  </div>

                  {/* URL & Actions */}
                  {tunnel.url && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-2 py-1.5 text-xs bg-bg-primary rounded border border-border truncate">
                          {tunnel.url}
                        </code>
                        <Tooltip content={copiedUrl === tunnel.url ? "Copied!" : "Copy URL"}>
                          <IconButton size="sm" onClick={() => handleCopyUrl(tunnel.url!)}>
                            {copiedUrl === tunnel.url ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip content="Open in Browser">
                          <IconButton
                            size="sm"
                            onClick={() => open(tunnel.url!)}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip content="QR Code" side="left">
                          <IconButton
                            size="sm"
                            onClick={() =>
                              setExpandedQR(
                                expandedQR === tunnel.tunnelId ? null : tunnel.tunnelId
                              )
                            }
                            className={cn(expandedQR === tunnel.tunnelId && "bg-bg-tertiary")}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </IconButton>
                        </Tooltip>
                      </div>

                      {/* QR Code */}
                      {expandedQR === tunnel.tunnelId && (
                        <div className="flex justify-center pt-2">
                          <QRCodeDisplay value={tunnel.url} size={160} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Starting State */}
                  {tunnel.status === "starting" && !tunnel.url && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Waiting for tunnel URL...
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
            Tunnels are powered by Cloudflare (free, no signup). URLs are temporary and
            change each session.
          </p>
        </div>
      </div>
    </Modal>
  );
}
