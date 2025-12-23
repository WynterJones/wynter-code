import { useState, useEffect } from "react";
import { X, Play, Square, Copy, Check, Radio, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useApiTesterStore } from "@/stores/apiTesterStore";
import { cn } from "@/lib/utils";
import type { WebhookRequest } from "@/types";

interface WebhookPanelProps {
  onClose: () => void;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

export function WebhookPanel({ onClose }: WebhookPanelProps) {
  const {
    webhookServers,
    addWebhookServer,
    removeWebhookServer,
    updateWebhookServer,
    addWebhookRequest,
    getWebhookRequests,
    clearWebhookRequests,
  } = useApiTesterStore();

  const [port, setPort] = useState("8080");
  const [path, setPath] = useState("/webhook");
  const [starting, setStarting] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeServer = webhookServers.find((s) => s.id === selectedServerId);
  const requests = selectedServerId ? getWebhookRequests(selectedServerId) : [];

  // Listen for webhook requests
  useEffect(() => {
    const unlisten = listen<{ serverId: string; request: WebhookRequest }>("webhook-request", (event) => {
      addWebhookRequest(event.payload.serverId, event.payload.request);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [addWebhookRequest]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const serverId = await invoke<string>("start_webhook_server", {
        port: parseInt(port),
        path: path,
      });

      addWebhookServer({
        id: serverId,
        port: parseInt(port),
        path: path,
        isRunning: true,
      });

      setSelectedServerId(serverId);
    } catch (error) {
      console.error("Failed to start webhook server:", error);
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async (serverId: string) => {
    try {
      await invoke("stop_webhook_server", { serverId });
      updateWebhookServer(serverId, { isRunning: false });
    } catch (error) {
      console.error("Failed to stop webhook server:", error);
    }
  };

  const handleRemove = async (serverId: string) => {
    const server = webhookServers.find((s) => s.id === serverId);
    if (server?.isRunning) {
      await handleStop(serverId);
    }
    removeWebhookServer(serverId);
    if (selectedServerId === serverId) {
      setSelectedServerId(webhookServers[0]?.id || null);
    }
  };

  const copyUrl = async () => {
    if (!activeServer) return;
    const url = `http://localhost:${activeServer.port}${activeServer.path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">Webhook</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-text-secondary hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Server Setup */}
      <div className="px-3 py-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="Port"
            className="w-16 px-2 py-1.5 text-xs bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent font-mono"
          />
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/webhook"
            className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent font-mono"
          />
        </div>
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          Start Server
        </button>
      </div>

      {/* Active Servers */}
      {webhookServers.length > 0 && (
        <div className="px-3 py-2 border-b border-border">
          <p className="text-[10px] text-text-secondary mb-1">Active Servers</p>
          <div className="space-y-1">
            {webhookServers.map((server) => (
              <div
                key={server.id}
                onClick={() => setSelectedServerId(server.id)}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors",
                  selectedServerId === server.id ? "bg-bg-tertiary" : "hover:bg-bg-hover"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      server.isRunning ? "bg-green-400" : "bg-gray-400"
                    )}
                  />
                  <span className="text-xs font-mono">:{server.port}{server.path}</span>
                </div>
                <div className="flex items-center gap-1">
                  {server.isRunning ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStop(server.id);
                      }}
                      className="p-1 text-text-secondary hover:text-red-400 transition-colors"
                    >
                      <Square className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(server.id);
                      }}
                      className="p-1 text-text-secondary hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Server URL */}
      {activeServer && (
        <div className="px-3 py-2 border-b border-border">
          <p className="text-[10px] text-text-secondary mb-1">Webhook URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-bg-tertiary p-1.5 rounded font-mono truncate">
              http://localhost:{activeServer.port}{activeServer.path}
            </code>
            <button
              onClick={copyUrl}
              className="p-1 text-text-secondary hover:text-text-primary transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Incoming Requests */}
      <div className="flex-1 overflow-y-auto">
        {requests.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4 text-text-secondary text-xs text-center">
            {activeServer ? "Waiting for requests..." : "Start a server to receive webhooks"}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-text-secondary">
                {requests.length} request{requests.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => selectedServerId && clearWebhookRequests(selectedServerId)}
                className="text-[10px] text-text-secondary hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            </div>
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-2 rounded-md bg-bg-tertiary text-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-accent">{req.method}</span>
                  <span className="text-text-secondary font-mono truncate">{req.path}</span>
                  <span className="text-[10px] text-text-secondary ml-auto">
                    {formatTimestamp(req.timestamp)}
                  </span>
                </div>
                {req.body && (
                  <pre className="text-[10px] text-text-secondary font-mono truncate">
                    {req.body.length > 100 ? req.body.slice(0, 100) + "..." : req.body}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
