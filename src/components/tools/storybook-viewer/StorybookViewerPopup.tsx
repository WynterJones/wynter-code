import { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen,
  Play,
  Square,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { Modal, IconButton, Tooltip } from "@/components/ui";
import { useStorybookDetection } from "@/hooks/useStorybookDetection";
import {
  useStorybookStore,
  StorybookStatus,
  StorybookServer,
} from "@/stores/storybookStore";
import { useProjectStore } from "@/stores/projectStore";

interface StorybookViewerPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StorybookEvent {
  serverId: string;
  eventType: "status_change" | "ready" | "output" | "stopped" | "error";
  url?: string;
  status?: StorybookStatus;
  message?: string;
}

export function StorybookViewerPopup({
  isOpen,
  onClose,
}: StorybookViewerPopupProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [portInput, setPortInput] = useState("6006");

  const {
    hasStorybook,
    startCommand,
    port: defaultPort,
    framework,
    isDetecting,
    refresh: refreshDetection,
  } = useStorybookDetection();

  const {
    servers,
    addServer,
    updateServer,
    removeServer,
    preferredPort,
    setPreferredPort,
  } = useStorybookStore();

  const activeProject = useProjectStore((s) => {
    if (!s.activeProjectId) return null;
    return s.projects.find((p) => p.id === s.activeProjectId) || null;
  });

  const currentServer = activeProject
    ? servers.find((s) => s.projectPath === activeProject.path)
    : undefined;

  const isRunning = currentServer?.status === "running";
  const isStarting = currentServer?.status === "starting";

  useEffect(() => {
    if (isOpen) {
      setPortInput(preferredPort.toString() || defaultPort.toString());
      refreshDetection();
    }
  }, [isOpen, preferredPort, defaultPort, refreshDetection]);

  useEffect(() => {
    if (!isOpen) return;

    let unlisten: UnlistenFn | null = null;

    listen<StorybookEvent>("storybook-event", (event) => {
      const { serverId, eventType, url, status, message } = event.payload;

      console.log("[Storybook Event]", eventType, message, status);

      if (eventType === "ready" || eventType === "status_change") {
        updateServer(serverId, {
          url: url ?? undefined,
          status: status ?? undefined,
        });
        if (eventType === "ready") {
          setStarting(false);
        }
      }

      if (eventType === "stopped") {
        updateServer(serverId, { status: "idle" });
        setStarting(false);
        // Show error if process exited with an error
        if (message) {
          setError(`Storybook stopped: ${message}`);
        }
        // Remove the server from the store since it stopped
        removeServer(serverId);
      }

      if (eventType === "error") {
        updateServer(serverId, {
          status: "error",
          error: message ?? "Unknown error",
        });
        setError(message ?? "Failed to start Storybook");
        setStarting(false);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [isOpen, updateServer, removeServer]);

  const handleStartStorybook = useCallback(async () => {
    if (!activeProject?.path || !startCommand) {
      console.log("[Storybook] Cannot start - path:", activeProject?.path, "command:", startCommand);
      return;
    }

    console.log("[Storybook] Starting with command:", startCommand, "in", activeProject.path);

    const port = parseInt(portInput, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      setError("Invalid port number");
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const serverId = await invoke<string>("start_storybook_server", {
        projectPath: activeProject.path,
        port,
        command: startCommand,
      });

      const newServer: StorybookServer = {
        serverId,
        projectPath: activeProject.path,
        port,
        url: `http://localhost:${port}`,
        status: "starting",
        error: null,
        startedAt: Date.now(),
      };
      addServer(newServer);
      setPreferredPort(port);
    } catch (err) {
      setError(`Failed to start Storybook: ${err}`);
      setStarting(false);
    }
  }, [
    activeProject?.path,
    startCommand,
    portInput,
    addServer,
    setPreferredPort,
  ]);

  const handleStopStorybook = useCallback(async () => {
    if (!currentServer) return;

    try {
      await invoke("stop_storybook_server", {
        serverId: currentServer.serverId,
      });
      removeServer(currentServer.serverId);
    } catch (err) {
      setError(`Failed to stop Storybook: ${err}`);
    }
  }, [currentServer, removeServer]);

  const handleCopyUrl = useCallback(async () => {
    if (!currentServer?.url) return;
    try {
      await navigator.clipboard.writeText(currentServer.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setError("Failed to copy URL");
    }
  }, [currentServer?.url]);

  const handleRefreshIframe = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

  const handleOpenExternal = useCallback(() => {
    if (currentServer?.url) {
      open(currentServer.url);
    }
  }, [currentServer?.url]);

  const renderNotDetected = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-text-secondary p-8">
      <AlertCircle className="w-16 h-16 opacity-20 mb-4" />
      <h3 className="text-lg font-medium text-text-primary mb-2">
        Storybook Not Detected
      </h3>
      <p className="text-sm text-center max-w-md mb-6">
        This project doesn&apos;t have Storybook installed. Add it with:
      </p>
      <code className="px-4 py-2 rounded-lg bg-bg-tertiary text-sm font-mono">
        npx storybook@latest init
      </code>
    </div>
  );

  const renderIdle = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <BookOpen className="w-16 h-16 text-accent/20 mb-4" />
      <h3 className="text-lg font-medium text-text-primary mb-2">
        Storybook Ready
      </h3>
      {framework && (
        <p className="text-sm text-text-secondary mb-4">Framework: {framework}</p>
      )}

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm text-text-secondary">Port:</label>
        <input
          type="number"
          value={portInput}
          onChange={(e) => setPortInput(e.target.value)}
          className="w-24 h-8 px-2 text-sm bg-bg-primary border border-border rounded-lg focus:outline-none focus:border-accent text-text-primary"
          min="1"
          max="65535"
        />
      </div>

      <button
        onClick={handleStartStorybook}
        disabled={starting}
        className="btn-primary !px-6 !py-3"
      >
        {starting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            Start Storybook
          </>
        )}
      </button>
    </div>
  );

  const renderRunning = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-tertiary/50">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-text-primary">
            Storybook Running
          </span>
          <span className="text-xs text-text-secondary">
            Port {currentServer?.port}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip content="Refresh">
            <IconButton size="sm" onClick={handleRefreshIframe}>
              <RefreshCw className="w-4 h-4" />
            </IconButton>
          </Tooltip>
          <Tooltip content={copiedUrl ? "Copied!" : "Copy URL"}>
            <IconButton size="sm" onClick={handleCopyUrl}>
              {copiedUrl ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip content="Open in Browser">
            <IconButton size="sm" onClick={handleOpenExternal}>
              <ExternalLink className="w-4 h-4" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Stop Storybook">
            <IconButton
              size="sm"
              onClick={handleStopStorybook}
              className="hover:text-red-400 hover:bg-red-500/10"
            >
              <Square className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 bg-white">
        <iframe
          ref={iframeRef}
          src={currentServer?.url}
          className="w-full h-full border-0"
          title="Storybook"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  );

  const renderStarting = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-text-secondary p-8">
      <Loader2 className="w-12 h-12 animate-spin opacity-50 mb-4" />
      <p className="text-sm">Starting Storybook...</p>
      <p className="text-xs mt-2 opacity-60">This may take a moment</p>
    </div>
  );

  const renderContent = () => {
    if (isDetecting) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
        </div>
      );
    }

    if (!hasStorybook) {
      return renderNotDetected();
    }

    if (isStarting || starting) {
      return renderStarting();
    }

    if (isRunning) {
      return renderRunning();
    }

    return renderIdle();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Storybook Viewer" size="full">
      <div className="flex flex-col h-[85vh]">
        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {!activeProject && (
          <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">No project selected</span>
          </div>
        )}

        {renderContent()}
      </div>
    </Modal>
  );
}
