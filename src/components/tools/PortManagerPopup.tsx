import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  ExternalLink,
  Trash2,
  Network,
  AlertCircle,
  Circle,
  Coffee,
  Gem,
  Globe,
  Database,
  Container,
  Zap,
  Cog,
  Server,
  HardDrive
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { IconButton, Tooltip, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

interface PortInfo {
  port: number;
  pid: number;
  processName: string;
  user: string;
  protocol: string;
}

interface PortManagerPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PortManagerPopup({ isOpen, onClose }: PortManagerPopupProps) {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [killingPid, setKillingPid] = useState<number | null>(null);

  const fetchPorts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<PortInfo[]>("list_listening_ports");
      setPorts(result);
    } catch (err) {
      setError(err as string);
      setPorts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchPorts();
    }
  }, [isOpen, fetchPorts]);

  const handleKillProcess = async (pid: number) => {
    setKillingPid(pid);
    try {
      await invoke("kill_process", { pid });
      await fetchPorts();
    } catch (err) {
      setError(`Failed to kill process: ${err}`);
    } finally {
      setKillingPid(null);
    }
  };

  const handleOpenInBrowser = (port: number) => {
    window.open(`http://localhost:${port}`, "_blank");
  };

  const getProcessIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    const iconClass = "w-4 h-4";

    if (lowerName.includes("node")) return <Circle className={cn(iconClass, "text-green-500 fill-green-500")} />;
    if (lowerName.includes("python")) return <Circle className={cn(iconClass, "text-yellow-500 fill-yellow-500")} />;
    if (lowerName.includes("ruby")) return <Gem className={cn(iconClass, "text-red-500")} />;
    if (lowerName.includes("java")) return <Coffee className={cn(iconClass, "text-amber-600")} />;
    if (lowerName.includes("go") || lowerName.includes("dlv")) return <Circle className={cn(iconClass, "text-cyan-500 fill-cyan-500")} />;
    if (lowerName.includes("rust") || lowerName.includes("cargo")) return <Cog className={cn(iconClass, "text-orange-500")} />;
    if (lowerName.includes("php")) return <Server className={cn(iconClass, "text-indigo-500")} />;
    if (lowerName.includes("nginx")) return <Globe className={cn(iconClass, "text-green-600")} />;
    if (lowerName.includes("postgres") || lowerName.includes("mysql") || lowerName.includes("mongo")) return <Database className={cn(iconClass, "text-blue-500")} />;
    if (lowerName.includes("redis")) return <HardDrive className={cn(iconClass, "text-red-600")} />;
    if (lowerName.includes("docker")) return <Container className={cn(iconClass, "text-sky-500")} />;
    return <Zap className={cn(iconClass, "text-yellow-400")} />;
  };

  const commonPorts: Record<number, string> = {
    80: "HTTP",
    443: "HTTPS",
    3000: "Dev Server",
    3001: "Dev Server",
    4000: "Dev Server",
    5000: "Dev Server",
    5173: "Vite",
    5174: "Vite",
    8000: "Dev Server",
    8080: "Dev Server",
    8888: "Jupyter",
    9000: "Dev Server",
    5432: "PostgreSQL",
    3306: "MySQL",
    27017: "MongoDB",
    6379: "Redis",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Port Manager" size="lg">
      <div className="flex flex-col h-[500px] p-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-accent" />
            <span className="text-sm text-text-secondary">
              {ports.length} active {ports.length === 1 ? "port" : "ports"}
            </span>
          </div>
          <Tooltip content="Refresh">
            <IconButton size="sm" onClick={fetchPorts} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </IconButton>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {loading && ports.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-secondary">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Scanning ports...
            </div>
          ) : ports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
              <Network className="w-8 h-8 mb-2 opacity-50" />
              <p>No listening ports found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ports.map((port) => (
                <div
                  key={`${port.port}-${port.pid}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary/50 border border-border hover:border-border-hover transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0" title={port.processName}>
                      {getProcessIcon(port.processName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-semibold text-accent">
                          :{port.port}
                        </span>
                        {commonPorts[port.port] && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary">
                            {commonPorts[port.port]}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary">
                          {port.protocol}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-text-secondary truncate">
                          {port.processName}
                        </span>
                        <span className="text-[10px] text-text-secondary/50">
                          PID: {port.pid}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip content="Open in Browser">
                      <IconButton
                        size="sm"
                        onClick={() => handleOpenInBrowser(port.port)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content="Kill Process">
                      <IconButton
                        size="sm"
                        onClick={() => handleKillProcess(port.pid)}
                        disabled={killingPid === port.pid}
                        className="hover:text-red-400 hover:bg-red-500/10"
                      >
                        {killingPid === port.pid ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-border">
          <p className="text-[11px] text-text-secondary/70">
            Shows all TCP/UDP ports in LISTEN state. Kill processes with caution.
          </p>
        </div>
      </div>
    </Modal>
  );
}
