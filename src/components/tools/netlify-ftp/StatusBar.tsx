import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/types/netlifyFtp";
import type { NetlifySite } from "@/types/netlifyFtp";

interface StatusBarProps {
  status: ConnectionStatus;
  currentSite: NetlifySite | null;
  error: string | null;
  theme?: "classic" | "terminal" | "amber";
}

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting...",
  connected: "Connected to api.netlify.com",
  error: "Connection Error",
};

export function StatusBar({
  status,
  currentSite,
  error,
  theme = "classic",
}: StatusBarProps) {
  const isTerminalTheme = theme === "terminal" || theme === "amber";

  return (
    <div className={cn(
      "retro-statusbar",
      isTerminalTheme && "crt-glow"
    )}>
      <div className="retro-statusbar-section flex items-center gap-2">
        <div className={cn(
          "connection-dot",
          status === "connected" && "connected",
          status === "disconnected" && "disconnected",
          status === "connecting" && "connecting",
          status === "error" && "error"
        )} />
        <span className="font-mono text-[10px]">
          {error ? error.slice(0, 30) : STATUS_TEXT[status]}
        </span>
      </div>
      
      <div className="retro-statusbar-section flex-1 truncate font-mono text-[10px]">
        {currentSite ? (
          <>
            {currentSite.ssl_url || currentSite.url}
          </>
        ) : (
          <span className="opacity-50">No site selected</span>
        )}
      </div>
      
      <div className="retro-statusbar-section text-[10px] font-mono">
        {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
