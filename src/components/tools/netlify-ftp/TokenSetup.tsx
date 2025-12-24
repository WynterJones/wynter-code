import { useState } from "react";
import { Key, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenSetupProps {
  onSubmit: (token: string) => void;
  isConnecting: boolean;
  error: string | null;
  theme?: "classic" | "terminal" | "amber";
}

const ASCII_LOCK = `
    ┌───────┐
    │ ░░░░░ │
    │ ░░░░░ │
    └───┬───┘
  ┌─────┴─────┐
  │  🔐 API   │
  │   TOKEN   │
  └───────────┘
`;

export function TokenSetup({
  onSubmit,
  isConnecting,
  error,
  theme = "classic",
}: TokenSetupProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  
  const isTerminalTheme = theme === "terminal" || theme === "amber";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onSubmit(token.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <pre className={cn(
        "ascii-box text-center mb-4",
        isTerminalTheme && "crt-glow"
      )}>
        {ASCII_LOCK}
      </pre>
      
      <h3 className={cn(
        "text-sm font-bold mb-2",
        isTerminalTheme && "crt-glow"
      )}>
        Netlify API Token Required
      </h3>
      
      <p className={cn(
        "text-xs text-center mb-4 max-w-[280px]",
        isTerminalTheme ? "opacity-70 crt-glow" : "text-gray-600"
      )}>
        Enter your Netlify Personal Access Token to connect.
        <br />
        <a
          href="https://app.netlify.com/user/applications#personal-access-tokens"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "underline",
            isTerminalTheme ? "crt-glow" : "text-blue-600"
          )}
        >
          Get your token here →
        </a>
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-[300px]">
        <div className="relative mb-3">
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            <Key className="w-3 h-3 opacity-50" />
          </div>
          <input
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="nfp_xxxxxxxxxxxx"
            className={cn(
              "retro-input w-full pl-7 pr-8 font-mono text-[11px]",
              isTerminalTheme && "crt-glow"
            )}
            disabled={isConnecting}
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
          >
            {showToken ? (
              <EyeOff className="w-3 h-3" />
            ) : (
              <Eye className="w-3 h-3" />
            )}
          </button>
        </div>

        {error && (
          <div className={cn(
            "text-xs mb-3 p-2 bg-red-100 border border-red-300 text-red-700",
            isTerminalTheme && "bg-red-900/30 border-red-500 text-red-400 crt-glow"
          )}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="retro-button w-full justify-center"
          disabled={!token.trim() || isConnecting}
        >
          {isConnecting ? (
            <>
              Connecting<span className="blink">...</span>
            </>
          ) : (
            "🔌 Connect to Netlify"
          )}
        </button>
      </form>

      <div className={cn(
        "mt-4 text-[9px] text-center",
        isTerminalTheme ? "opacity-50 crt-glow" : "text-gray-400"
      )}>
        Your token is stored locally and never sent to any server except Netlify.
      </div>
    </div>
  );
}
