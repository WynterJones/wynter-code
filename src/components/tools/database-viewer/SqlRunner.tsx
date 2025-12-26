import { useEffect, useRef } from "react";
import { Play, Loader2, Clock, CheckCircle, Table2 } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useDatabaseViewerStore } from "@/stores/databaseViewerStore";
import { cn } from "@/lib/utils";

export function SqlRunner() {
  const {
    currentQuery,
    setQuery,
    executeQuery,
    queryResults,
    queryLoading,
    activeConnectionId,
    isConnected,
  } = useDatabaseViewerStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const connected = activeConnectionId ? isConnected.get(activeConnectionId) : false;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (connected && currentQuery.trim()) {
          executeQuery();
        }
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("keydown", handleKeyDown);
      return () => textarea.removeEventListener("keydown", handleKeyDown);
    }
  }, [connected, currentQuery, executeQuery]);

  if (!connected) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-tertiary">
        <div className="text-center">
          <Table2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Connect to a database to run queries</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="h-[40%] flex flex-col overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-bg-secondary">
          <span className="text-sm font-medium">Query</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary">
              {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to run
            </span>
            <button
              onClick={executeQuery}
              disabled={queryLoading || !currentQuery.trim()}
              className="btn-primary !px-3 !py-1.5"
            >
              {queryLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={currentQuery}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SELECT * FROM table_name LIMIT 100;"
            className={cn(
              "w-full h-full px-4 py-3 resize-none",
              "bg-bg-primary font-mono text-sm",
              "focus:outline-none",
              "placeholder:text-text-tertiary"
            )}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden border-t border-border">
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-bg-secondary">
          <span className="text-sm font-medium">Results</span>
          {queryResults && (
            <div className="flex items-center gap-4 text-xs text-text-tertiary">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span>{queryResults.rowsAffected} rows</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{queryResults.executionTime}ms</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          {queryLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
            </div>
          ) : queryResults ? (
            queryResults.columns.length > 0 ? (
              <OverlayScrollbarsComponent
                className="h-full os-theme-custom"
                options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-bg-secondary">
                    <tr>
                      {queryResults.columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left border-b border-border font-medium"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResults.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-bg-hover">
                        {queryResults.columns.map((col) => (
                          <td
                            key={col}
                            className="px-3 py-1.5 border-b border-border font-mono text-xs max-w-xs truncate"
                            title={formatValue(row[col])}
                          >
                            <span
                              className={cn(
                                row[col] === null && "text-text-tertiary italic"
                              )}
                            >
                              {formatValue(row[col])}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </OverlayScrollbarsComponent>
            ) : (
              <div className="flex items-center justify-center h-32 text-text-tertiary">
                <div className="text-center">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">
                    Query executed successfully
                  </p>
                  <p className="text-xs mt-1">
                    {queryResults.rowsAffected} row(s) affected
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-32 text-text-tertiary">
              <p className="text-sm">Run a query to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
