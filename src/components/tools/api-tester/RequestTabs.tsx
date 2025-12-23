import { Plus, X } from "lucide-react";
import { useApiTesterStore } from "@/stores/apiTesterStore";
import { cn } from "@/lib/utils";

interface RequestTabsProps {
  projectId: string;
}

export function RequestTabs({ projectId }: RequestTabsProps) {
  const {
    getTabsForProject,
    getActiveTab,
    createTab,
    closeTab,
    setActiveTab,
    getRequest,
  } = useApiTesterStore();

  const tabs = getTabsForProject(projectId);
  const activeTab = getActiveTab(projectId);

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(projectId, tabId);
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-bg-primary overflow-x-auto">
      {tabs.map((tab) => {
        const request = getRequest(tab.requestId);
        const isActive = activeTab?.id === tab.id;

        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(projectId, tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors group min-w-0",
              isActive
                ? "bg-bg-tertiary text-text-primary"
                : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            )}
          >
            {/* Method indicator */}
            <span
              className={cn(
                "font-bold text-[10px] flex-shrink-0",
                request?.method === "GET" && "text-green-400",
                request?.method === "POST" && "text-yellow-400",
                request?.method === "PUT" && "text-blue-400",
                request?.method === "PATCH" && "text-purple-400",
                request?.method === "DELETE" && "text-red-400",
                !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(request?.method || "") && "text-gray-400"
              )}
            >
              {request?.method || "GET"}
            </span>

            {/* Tab name */}
            <span className="truncate max-w-[120px]">
              {tab.name || "Untitled"}
            </span>

            {/* Dirty indicator */}
            {tab.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
            )}

            {/* Close button */}
            {tabs.length > 1 && (
              <button
                onClick={(e) => handleCloseTab(e, tab.id)}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-bg-secondary transition-opacity flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      {/* New Tab Button */}
      <button
        onClick={() => createTab(projectId)}
        className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors flex-shrink-0"
        title="New Request (Ctrl+N)"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
