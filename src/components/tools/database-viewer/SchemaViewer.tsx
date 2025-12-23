import { useState } from "react";
import { ChevronDown, ChevronRight, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TableSchema } from "@/types";

interface SchemaViewerProps {
  schema: TableSchema;
}

export function SchemaViewer({ schema }: SchemaViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-bg-secondary">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-hover text-sm"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="font-medium">{schema.tableName}</span>
        <span className="text-text-tertiary">
          ({schema.columns.length} columns)
        </span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-2">
          <div className="grid grid-cols-4 gap-2 text-xs text-text-tertiary mb-1 px-2">
            <span>Column</span>
            <span>Type</span>
            <span>Nullable</span>
            <span>Default</span>
          </div>
          <div className="space-y-0.5">
            {schema.columns.map((column) => (
              <div
                key={column.name}
                className={cn(
                  "grid grid-cols-4 gap-2 px-2 py-1 rounded text-sm",
                  column.primaryKey && "bg-accent/10"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {column.primaryKey && (
                    <Key className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                  )}
                  <span className={cn("truncate", column.primaryKey && "font-medium")}>
                    {column.name}
                  </span>
                </div>
                <span className="text-text-secondary font-mono text-xs truncate">
                  {column.dataType}
                </span>
                <span className={cn(
                  "text-xs",
                  column.nullable ? "text-text-tertiary" : "text-yellow-500"
                )}>
                  {column.nullable ? "Yes" : "No"}
                </span>
                <span className="text-text-tertiary text-xs truncate">
                  {column.defaultValue || "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
