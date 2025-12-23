import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useApiTesterStore } from "@/stores/apiTesterStore";
import { cn } from "@/lib/utils";
import type { AuthType } from "@/types";

const AUTH_TYPES: { type: AuthType; label: string }[] = [
  { type: "none", label: "No Auth" },
  { type: "bearer", label: "Bearer Token" },
  { type: "basic", label: "Basic Auth" },
  { type: "api-key", label: "API Key" },
];

interface AuthEditorProps {
  requestId: string;
}

export function AuthEditor({ requestId }: AuthEditorProps) {
  const { getRequest, updateRequestAuth } = useApiTesterStore();
  const request = getRequest(requestId);
  const [showToken, setShowToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  if (!request) return null;

  const { auth } = request;

  const handleTypeChange = (type: AuthType) => {
    updateRequestAuth(requestId, { ...auth, type });
  };

  return (
    <div className="space-y-4">
      {/* Auth Type Selector */}
      <div className="flex items-center gap-1">
        {AUTH_TYPES.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              auth.type === type
                ? "bg-accent text-[#3d2066]"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Auth Content */}
      {auth.type === "none" && (
        <div className="text-center py-8 text-text-secondary text-sm">
          This request does not use authentication
        </div>
      )}

      {auth.type === "bearer" && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-secondary">Token</label>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={auth.bearerToken || ""}
              onChange={(e) => updateRequestAuth(requestId, { ...auth, bearerToken: e.target.value })}
              placeholder="Enter bearer token"
              className="w-full px-3 py-2 pr-10 text-sm bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent font-mono"
            />
            <button
              onClick={() => setShowToken(!showToken)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-primary"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-text-secondary">
            The token will be sent as: <code className="bg-bg-tertiary px-1 rounded">Authorization: Bearer &lt;token&gt;</code>
          </p>
        </div>
      )}

      {auth.type === "basic" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-secondary">Username</label>
            <input
              type="text"
              value={auth.basicUsername || ""}
              onChange={(e) => updateRequestAuth(requestId, { ...auth, basicUsername: e.target.value })}
              placeholder="Enter username"
              className="w-full px-3 py-2 text-sm bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-secondary">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={auth.basicPassword || ""}
                onChange={(e) => updateRequestAuth(requestId, { ...auth, basicPassword: e.target.value })}
                placeholder="Enter password"
                className="w-full px-3 py-2 pr-10 text-sm bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent font-mono"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-primary"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-text-secondary">
            The credentials will be Base64 encoded and sent as: <code className="bg-bg-tertiary px-1 rounded">Authorization: Basic &lt;encoded&gt;</code>
          </p>
        </div>
      )}

      {auth.type === "api-key" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-secondary">Key Name</label>
            <input
              type="text"
              value={auth.apiKeyName || ""}
              onChange={(e) => updateRequestAuth(requestId, { ...auth, apiKeyName: e.target.value })}
              placeholder="e.g., X-API-Key"
              className="w-full px-3 py-2 text-sm bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-secondary">Key Value</label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={auth.apiKeyValue || ""}
                onChange={(e) => updateRequestAuth(requestId, { ...auth, apiKeyValue: e.target.value })}
                placeholder="Enter API key"
                className="w-full px-3 py-2 pr-10 text-sm bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent font-mono"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-primary"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-secondary">Add to</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateRequestAuth(requestId, { ...auth, apiKeyLocation: "header" })}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  auth.apiKeyLocation === "header" || !auth.apiKeyLocation
                    ? "bg-bg-tertiary text-text-primary border border-accent"
                    : "bg-bg-tertiary text-text-secondary border border-border hover:border-accent/50"
                )}
              >
                Header
              </button>
              <button
                onClick={() => updateRequestAuth(requestId, { ...auth, apiKeyLocation: "query" })}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  auth.apiKeyLocation === "query"
                    ? "bg-bg-tertiary text-text-primary border border-accent"
                    : "bg-bg-tertiary text-text-secondary border border-border hover:border-accent/50"
                )}
              >
                Query Param
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
