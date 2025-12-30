import { useEffect } from "react";
import {
  Database,
  Table2,
  Code,
  History,
  AlertCircle,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Key,
  Network,
} from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useDatabaseViewerStore } from "@/stores/databaseViewerStore";
import { Popup, IconButton, Tooltip, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ConnectionManager } from "./ConnectionManager";
import { TableBrowser } from "./TableBrowser";
import { SchemaViewer } from "./SchemaViewer";
import { DataGrid } from "./DataGrid";
import { SqlRunner } from "./SqlRunner";
import { GraphChecker } from "./graph-checker";

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
    connectionsSidebarCollapsed,
    toggleConnectionsSidebar,
    error,
    clearError,
    activeConnectionId,
    isConnected,
    connections,
    detectServices,
  } = useDatabaseViewerStore();

  // Auto-detect local databases when popup opens
  useEffect(() => {
    if (isOpen) {
      detectServices();
    }
  }, [isOpen, detectServices]);

  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const connected = activeConnectionId ? isConnected.get(activeConnectionId) : false;

  return (
    <Popup isOpen={isOpen} onClose={onClose} size="full">
      <Popup.Header
        icon={Database}
        title="Database Viewer"
        actions={
          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center gap-1 mr-2">
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
                onClick={() => setActiveTab("graph")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === "graph"
                    ? "bg-accent text-[#3d2066]"
                    : "hover:bg-bg-hover text-text-secondary"
                )}
              >
                <Network className="w-4 h-4" />
                Graph
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

            {/* Active Connection Badge */}
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

            {/* Sidebar Toggle */}
            <Tooltip content={connectionsSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}>
              <IconButton
                size="sm"
                onClick={toggleConnectionsSidebar}
                className={cn(!connectionsSidebarCollapsed && "bg-accent/20 text-accent")}
              >
                {connectionsSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </IconButton>
            </Tooltip>

            {/* Query History */}
            <Tooltip content="Query History">
              <IconButton
                size="sm"
                onClick={() => setSidePanel(sidePanel === "history" ? null : "history")}
                className={cn(sidePanel === "history" && "bg-accent/20 text-accent")}
              >
                <History className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>
        }
      />

      <Popup.Content scrollable={false} padding="none" className="!overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Error Banner */}
          {error && (
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span className="flex-1">{error}</span>
              <button onClick={clearError} className="hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Content - takes remaining height */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Connections */}
            <div
              className={cn(
                "h-full border-r border-border bg-bg-secondary flex flex-col transition-[width] duration-200 ease-in-out",
                connectionsSidebarCollapsed ? "w-0 border-r-0 overflow-hidden" : "w-72"
              )}
            >
              {!connectionsSidebarCollapsed && (
                <>
                  <ConnectionManager isVisible={true} />
                  {sidePanel === "history" && <QueryHistory />}
                </>
              )}
            </div>

            {/* Main Area */}
            <div className="flex-1 h-full overflow-hidden">
              {activeTab === "browser" ? (
                <BrowserTab />
              ) : activeTab === "graph" ? (
                <GraphChecker />
              ) : (
                <SqlRunner />
              )}
            </div>
          </div>
        </div>
      </Popup.Content>
    </Popup>
  );
}

function BrowserTab() {
  const { selectedTable, tableSchema } = useDatabaseViewerStore();

  return (
    <div className="h-full flex overflow-hidden">
      {/* Table List Sidebar */}
      <div className="w-64 h-full border-r border-border flex flex-col overflow-hidden">
        <TableBrowser />
      </div>

      {/* Content Area with Tabs */}
      <div className="flex-1 h-full flex flex-col overflow-hidden">
        {selectedTable ? (
          <Tabs defaultValue="data" className="h-full flex flex-col">
            <div className="flex-shrink-0 border-b border-border bg-bg-secondary">
              <TabsList className="px-3">
                <TabsTrigger value="data">
                  <Table2 className="w-4 h-4 mr-2" />
                  Data
                </TabsTrigger>
                <TabsTrigger value="schema">
                  <Key className="w-4 h-4 mr-2" />
                  Schema
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="data" className="flex-1 overflow-hidden m-0">
              <DataGrid />
            </TabsContent>
            <TabsContent value="schema" className="flex-1 overflow-auto m-0">
              {tableSchema && <SchemaViewer schema={tableSchema} />}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="h-full flex items-center justify-center text-text-tertiary">
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
    <div className="flex-1 flex flex-col overflow-hidden border-t border-border">
      <div className="flex-shrink-0 px-3 py-2 border-b border-border">
        <h3 className="text-sm font-medium">Query History</h3>
      </div>
      <OverlayScrollbarsComponent
        className="flex-1 os-theme-custom"
        options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
      >
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
