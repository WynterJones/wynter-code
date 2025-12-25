import { useState } from "react";
import { Lock, Key, Eye, EyeOff, Plug, Loader2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { Button, Input } from "@/components/ui";
import { IconButton } from "@/components/ui/IconButton";

interface TokenSetupProps {
  onSubmit: (token: string) => void;
  isConnecting: boolean;
  error: string | null;
}

export function TokenSetup({ onSubmit, isConnecting, error }: TokenSetupProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onSubmit(token.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <Lock className="w-12 h-12 text-text-secondary mb-4" />

      <h3 className="text-lg font-semibold text-text-primary mb-2">
        Netlify API Token Required
      </h3>

      <p className="text-sm text-text-secondary text-center mb-6 max-w-sm">
        Enter your Netlify Personal Access Token to connect.{" "}
        <button
          type="button"
          onClick={() => open("https://app.netlify.com/user/applications#personal-access-tokens")}
          className="text-accent hover:underline"
        >
          Get your token here
        </button>
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="relative">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <Input
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="nfp_xxxxxxxxxxxx"
            className="pl-10 pr-10 font-mono"
            disabled={isConnecting}
          />
          <IconButton
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setShowToken(!showToken)}
            type="button"
          >
            {showToken ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </IconButton>
        </div>

        {error && (
          <div className="p-3 text-sm bg-accent-red/10 border border-accent-red/20 text-accent-red rounded-md">
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={!token.trim() || isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Plug className="w-4 h-4 mr-2" />
              Connect to Netlify
            </>
          )}
        </Button>
      </form>

      <p className="mt-4 text-xs text-text-secondary text-center">
        Your token is stored locally and never sent anywhere except Netlify.
      </p>
    </div>
  );
}
