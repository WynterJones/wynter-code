import { useEffect } from "react";
import {
  Database,
  X,
  Table2,
  Code,
  History,
  Plug,
  AlertCircle,
} from "lucide-react";
import { createPortal } from "react-dom";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useDatabaseViewerStore } from "@/stores/databaseViewerStore";
import { IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ConnectionManager } from "./ConnectionManager";
import { TableBrowser } from "./TableBrowser";
import { SchemaViewer } from "./SchemaViewer";
import { DataGrid } from "./DataGrid";
import { SqlRunner } from "./SqlRunner";

interface DatabaseViewerPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DatabaseViewerPopup({ isOpen, onClose }: DatabaseViewerPopupProps) {
  const {
    activeTab,
    setActiveTab,
    sidePanel,
    setSidePanel,
    error,
    clearError,
    activeConnectionId,
    isConnected,
    connections,
  } = useDatabaseViewerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const connected = activeConnectionId ? isConnected.get(activeConnectionId) : false;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-[95vw] h-[90vh] bg-bg-primary rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">Database Viewer</h2>
            </div>

            <div className="flex items-center gap-1 ml-4">
              <button
                onClick={() => setActiveTab("browser")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === "browser"
                    ? "bg-accent text-[#3d2066]"
                    : "hover:bg-bg-hover text-text-secondary"
                )}
              >
                <Table2 className="w-4 h-4" />
                Browser
              </button>
              <button
                onClick={() => setActiveTab("sql")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === "sql"
                    ? "bg-accent text-[#3d2066]"
                    : "hover:bg-bg-hover text-text-secondary"
                )}
              >
                <Code className="w-4 h-4" />
                SQL Runner
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeConnection && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-bg-tertiary text-sm">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    connected ? "bg-green-500" : "bg-gray-400"
                  )}
                />
                <span className="text-text-secondary">{activeConnection.name}</span>
              </div>
            )}

            <Tooltip content="Connections">
              <IconButton
                size="sm"
                onClick={() => setSidePanel(sidePanel === "connections" ? null : "connections")}
                className={cn(sidePanel === "connections" && "bg-accent/20 text-accent")}
              >
                <Plug className="w-4 h-4" />
              </IconButton>
            </Tooltip>

            <Tooltip content="Query History">
              <IconButton
                size="sm"
                onClick={() => setSidePanel(sidePanel === "history" ? null : "history")}
                className={cn(sidePanel === "history" && "bg-accent/20 text-accent")}
              >
                <History className="w-4 h-4" />
              </IconButton>
            </Tooltip>

            <Tooltip content="Close">
              <IconButton size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span className="flex-1">{error}</span>
            <button onClick={clearError} className="hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 flex min-h-0">
          {sidePanel && (
            <div className="w-72 border-r border-border bg-bg-secondary flex flex-col">
              <ConnectionManager isVisible={sidePanel === "connections"} />
              {sidePanel === "history" && <QueryHistory />}
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0">
            {activeTab === "browser" ? (
              <BrowserTab />
            ) : (
              <SqlRunner />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function BrowserTab() {
  const { selectedTable, tableSchema } = useDatabaseViewerStore();

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-64 border-r border-border flex flex-col">
        <TableBrowser />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selectedTable ? (
          <>
            {tableSchema && (
              <div className="border-b border-border">
                <SchemaViewer schema={tableSchema} />
              </div>
            )}
            <div className="flex-1 min-h-0">
              <DataGrid />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-tertiary">
            <div className="text-center">
              <Table2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Select a table to view data</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QueryHistory() {
  const { queryHistory, setQuery, setActiveTab } = useDatabaseViewerStore();

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-sm font-medium">Query History</h3>
      </div>
      <OverlayScrollbarsComponent className="flex-1 os-theme-custom" options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}>
        <div className="p-2 space-y-1">
          {queryHistory.length === 0 ? (
            <p className="text-sm text-text-tertiary p-2">No queries yet</p>
          ) : (
            queryHistory.map((entry) => (
              <button
                key={entry.id}
                onClick={() => {
                  setQuery(entry.query);
                  setActiveTab("sql");
                }}
                className="w-full text-left p-2 rounded hover:bg-bg-hover group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      entry.success ? "bg-green-500" : "bg-red-500"
                    )}
                  />
                  <span className="text-xs text-text-tertiary">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  {entry.executionTime && (
                    <span className="text-xs text-text-tertiary">
                      {entry.executionTime}ms
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary truncate font-mono">
                  {entry.query}
                </p>
                {entry.error && (
                  <p className="text-xs text-red-400 truncate mt-1">{entry.error}</p>
                )}
              </button>
            ))
          )}
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );
}
