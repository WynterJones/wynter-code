import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/types/netlifyFtp";
import type { NetlifySite } from "@/types/netlifyFtp";

interface StatusBarProps {
  status: ConnectionStatus;
  currentSite: NetlifySite | null;
  error: string | null;
}

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting...",
  connected: "Connected to api.netlify.com",
  error: "Connection Error",
};

export function StatusBar({ status, currentSite, error }: StatusBarProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-t border-border bg-bg-secondary text-xs">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            status === "connected" && "bg-accent-green",
            status === "disconnected" && "bg-text-secondary",
            status === "connecting" && "bg-accent-yellow animate-pulse",
            status === "error" && "bg-accent-red"
          )}
        />
        <span className="font-mono text-text-secondary">
          {error ? error.slice(0, 30) : STATUS_TEXT[status]}
        </span>
      </div>

      <div className="flex-1 truncate font-mono text-text-secondary">
        {currentSite ? currentSite.ssl_url || currentSite.url : "No site selected"}
      </div>
    </div>
  );
}
