import { Send, Loader2 } from "lucide-react";
import { useApiTesterStore } from "@/stores/apiTesterStore";
import { cn } from "@/lib/utils";
import type { ApiRequest, HttpMethod } from "@/types";

const HTTP_METHODS: { method: HttpMethod; color: string }[] = [
  { method: "GET", color: "text-green-400" },
  { method: "POST", color: "text-yellow-400" },
  { method: "PUT", color: "text-blue-400" },
  { method: "PATCH", color: "text-purple-400" },
  { method: "DELETE", color: "text-red-400" },
  { method: "HEAD", color: "text-gray-400" },
  { method: "OPTIONS", color: "text-gray-400" },
];

interface RequestBuilderProps {
  request: ApiRequest;
  onSend: () => void;
  loading: boolean;
}

export function RequestBuilder({ request, onSend, loading }: RequestBuilderProps) {
  const { updateRequestMethod, updateRequestUrl } = useApiTesterStore();

  const methodColor = HTTP_METHODS.find((m) => m.method === request.method)?.color || "text-text-primary";

  return (
    <div className="flex items-center gap-2">
      {/* Method Selector */}
      <div className="relative">
        <select
          value={request.method}
          onChange={(e) => updateRequestMethod(request.id, e.target.value as HttpMethod)}
          className={cn(
            "appearance-none px-3 py-2 pr-8 text-sm font-bold bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent cursor-pointer",
            methodColor
          )}
        >
          {HTTP_METHODS.map(({ method }) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* URL Input */}
      <input
        type="text"
        value={request.url}
        onChange={(e) => updateRequestUrl(request.id, e.target.value)}
        placeholder="Enter request URL"
        className="flex-1 px-3 py-2 text-sm bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent font-mono"
      />

      {/* Send Button */}
      <button
        onClick={onSend}
        disabled={loading || !request.url}
        className="btn-primary"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send
          </>
        )}
      </button>
    </div>
  );
}
