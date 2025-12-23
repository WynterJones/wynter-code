import { useState } from "react";
import { Copy, Check, Loader2, FileJson } from "lucide-react";
import { useApiTesterStore } from "@/stores/apiTesterStore";
import { cn } from "@/lib/utils";

type ResponseTab = "body" | "headers";

interface ResponseViewerProps {
  requestId: string;
  loading: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "text-green-400";
  if (status >= 300 && status < 400) return "text-blue-400";
  if (status >= 400 && status < 500) return "text-yellow-400";
  if (status >= 500) return "text-red-400";
  return "text-text-secondary";
}

export function ResponseViewer({ requestId, loading }: ResponseViewerProps) {
  const { getResponse } = useApiTesterStore();
  const response = getResponse(requestId);
  const [activeTab, setActiveTab] = useState<ResponseTab>("body");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBody = () => {
    if (!response?.body) return "";
    try {
      return JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      return response.body;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2 text-sm">Sending request...</span>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <FileJson className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Send a request to see the response</p>
        </div>
      </div>
    );
  }

  const isError = response.status === 0;

  return (
    <div className="h-full flex flex-col">
      {/* Response Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("body")}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                activeTab === "body"
                  ? "bg-bg-tertiary text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              Body
            </button>
            <button
              onClick={() => setActiveTab("headers")}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                activeTab === "headers"
                  ? "bg-bg-tertiary text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              Headers ({Object.keys(response.headers).length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {!isError && (
            <>
              <span className={cn("font-medium", getStatusColor(response.status))}>
                {response.status} {response.statusText}
              </span>
              <span className="text-text-secondary">
                {formatTime(response.responseTime)}
              </span>
              <span className="text-text-secondary">
                {formatBytes(response.bodySize)}
              </span>
            </>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-text-secondary hover:text-text-primary rounded-md hover:bg-bg-hover transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Response Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "body" && (
          <pre
            className={cn(
              "text-xs font-mono whitespace-pre-wrap break-all",
              isError ? "text-red-400" : "text-text-primary"
            )}
          >
            {formatBody()}
          </pre>
        )}

        {activeTab === "headers" && (
          <div className="space-y-1">
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs font-mono">
                <span className="text-accent font-medium">{key}:</span>
                <span className="text-text-secondary break-all">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
