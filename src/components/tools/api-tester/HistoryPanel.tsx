import { useState } from "react";
import { X, Search, Trash2, Clock } from "lucide-react";
import { useApiTesterStore } from "@/stores/apiTesterStore";
import { cn } from "@/lib/utils";

interface HistoryPanelProps {
  projectId: string;
  onClose: () => void;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString();
}

function getMethodColor(method: string): string {
  switch (method) {
    case "GET": return "text-green-400";
    case "POST": return "text-yellow-400";
    case "PUT": return "text-blue-400";
    case "PATCH": return "text-purple-400";
    case "DELETE": return "text-red-400";
    default: return "text-gray-400";
  }
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "text-green-400";
  if (status >= 300 && status < 400) return "text-blue-400";
  if (status >= 400 && status < 500) return "text-yellow-400";
  if (status >= 500) return "text-red-400";
  return "text-text-secondary";
}

export function HistoryPanel({ projectId, onClose }: HistoryPanelProps) {
  const { history, loadFromHistory, clearHistory } = useApiTesterStore();
  const [search, setSearch] = useState("");

  const filteredHistory = history.filter((entry) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      entry.request.url.toLowerCase().includes(searchLower) ||
      entry.request.method.toLowerCase().includes(searchLower) ||
      entry.request.name.toLowerCase().includes(searchLower)
    );
  });

  const getPathFromUrl = (url: string): string => {
    try {
      const u = new URL(url);
      return u.pathname + u.search;
    } catch {
      return url;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">History</span>
          <span className="text-[10px] text-text-secondary">({history.length})</span>
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-1 text-text-secondary hover:text-red-400 transition-colors"
              title="Clear history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-secondary text-xs">
            {history.length === 0 ? "No history yet" : "No results found"}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredHistory.map((entry) => (
              <button
                key={entry.id}
                onClick={() => loadFromHistory(projectId, entry.id)}
                className="w-full text-left p-2 rounded-md hover:bg-bg-hover transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-[10px] font-bold", getMethodColor(entry.request.method))}>
                    {entry.request.method}
                  </span>
                  {entry.response && (
                    <span className={cn("text-[10px]", getStatusColor(entry.response.status))}>
                      {entry.response.status}
                    </span>
                  )}
                  <span className="text-[10px] text-text-secondary ml-auto">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
                <div className="text-xs text-text-secondary truncate font-mono">
                  {getPathFromUrl(entry.request.url)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
