import { useState } from "react";
import { Table2, Eye, RefreshCw, Search, Loader2 } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useDatabaseViewerStore } from "@/stores/databaseViewerStore";
import { IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";

export function TableBrowser() {
  const {
    tables,
    selectedTable,
    selectTable,
    loadTables,
    isLoading,
    activeConnectionId,
    isConnected,
  } = useDatabaseViewerStore();

  const [search, setSearch] = useState("");

  const connected = activeConnectionId ? isConnected.get(activeConnectionId) : false;

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(search.toLowerCase())
  );

  const tablesByType = {
    tables: filteredTables.filter((t) => t.type === "table"),
    views: filteredTables.filter((t) => t.type === "view"),
  };

  if (!connected) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-tertiary p-4">
        <div className="text-center">
          <Table2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Connect to a database to browse tables</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium">Tables</h3>
        <Tooltip content="Refresh">
          <IconButton size="sm" onClick={loadTables} disabled={isLoading} aria-label="Refresh table list">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </IconButton>
        </Tooltip>
      </div>

      <div className="flex-shrink-0 px-2 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tables..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md bg-bg-tertiary border border-border focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <OverlayScrollbarsComponent className="flex-1 overflow-auto os-theme-custom" options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}>
        <div className="p-2">
          {isLoading && tables.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
            </div>
          ) : filteredTables.length === 0 ? (
            <p className="text-sm text-text-tertiary p-2">
              {search ? "No matching tables" : "No tables found"}
            </p>
          ) : (
            <>
              {tablesByType.tables.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-text-tertiary px-2 mb-1 uppercase tracking-wider">
                    Tables ({tablesByType.tables.length})
                  </p>
                  {tablesByType.tables.map((table) => (
                    <TableItem
                      key={table.name}
                      name={table.name}
                      type="table"
                      isSelected={selectedTable === table.name}
                      onClick={() => selectTable(table.name)}
                    />
                  ))}
                </div>
              )}

              {tablesByType.views.length > 0 && (
                <div>
                  <p className="text-xs text-text-tertiary px-2 mb-1 uppercase tracking-wider">
                    Views ({tablesByType.views.length})
                  </p>
                  {tablesByType.views.map((view) => (
                    <TableItem
                      key={view.name}
                      name={view.name}
                      type="view"
                      isSelected={selectedTable === view.name}
                      onClick={() => selectTable(view.name)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );
}

interface TableItemProps {
  name: string;
  type: "table" | "view";
  isSelected: boolean;
  onClick: () => void;
}

function TableItem({ name, type, isSelected, onClick }: TableItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
        isSelected
          ? "bg-accent text-[#3d2066]"
          : "hover:bg-bg-hover text-text-primary"
      )}
    >
      {type === "view" ? (
        <Eye className="w-4 h-4 flex-shrink-0" />
      ) : (
        <Table2 className="w-4 h-4 flex-shrink-0" />
      )}
      <span className="truncate">{name}</span>
    </button>
  );
}
