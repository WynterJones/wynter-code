import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Maximize2,
} from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useDatabaseViewerStore } from "@/stores/databaseViewerStore";
import { IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { RowForm } from "./RowForm";
import { JsonViewerModal } from "./JsonViewerModal";
import { CellInspector } from "./CellInspector";
import type { ColumnInfo } from "@/types";

interface JsonModalState {
  value: unknown;
  columnName: string;
  row: Record<string, unknown>;
  column: ColumnInfo;
}

const isJsonColumn = (dataType: string): boolean => {
  const type = dataType.toLowerCase();
  return type === "json" || type === "jsonb" || type.includes("json");
};

export function DataGrid() {
  const {
    tableData,
    tableDataLoading,
    tableSchema,
    pagination,
    setPagination,
    sort,
    setSort,
    deleteRow,
    updateRow,
    selectedTable,
  } = useDatabaseViewerStore();

  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingRow, setDeletingRow] = useState<Record<string, unknown> | null>(null);
  const [jsonModal, setJsonModal] = useState<JsonModalState | null>(null);

  const columns = tableSchema?.columns || [];
  const primaryKeys = tableSchema?.primaryKeys || [];

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  const handleSort = (column: string) => {
    if (sort?.column === column) {
      if (sort.direction === "asc") {
        setSort({ column, direction: "desc" });
      } else {
        setSort(null);
      }
    } else {
      setSort({ column, direction: "asc" });
    }
  };

  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * pagination.limit;
    setPagination({ offset: newOffset });
  };

  const getPrimaryKeyValue = (row: Record<string, unknown>): Record<string, unknown> => {
    const pk: Record<string, unknown> = {};
    for (const key of primaryKeys) {
      pk[key] = row[key];
    }
    return pk;
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    if (!confirm("Are you sure you want to delete this row?")) return;
    setDeletingRow(row);
    try {
      await deleteRow(getPrimaryKeyValue(row));
    } finally {
      setDeletingRow(null);
    }
  };

  const formatCellValue = (value: unknown, column?: ColumnInfo): { display: string; isJson: boolean } => {
    if (value === null || value === undefined) {
      return { display: "NULL", isJson: false };
    }
    if (typeof value === "boolean") {
      return { display: value ? "true" : "false", isJson: false };
    }

    const isJson = (column && isJsonColumn(column.dataType)) || typeof value === "object";

    if (isJson && typeof value === "object") {
      const jsonStr = JSON.stringify(value);
      const truncated = jsonStr.length > 50 ? jsonStr.substring(0, 47) + "..." : jsonStr;
      return { display: truncated, isJson: true };
    }

    return { display: String(value), isJson: false };
  };

  const handleJsonSave = async (newValue: unknown) => {
    if (!jsonModal) return;

    const pk = getPrimaryKeyValue(jsonModal.row);
    const updateData: Record<string, unknown> = {
      [jsonModal.columnName]: newValue,
    };

    await updateRow(pk, updateData);
    setJsonModal(null);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{selectedTable}</span>
          <span className="text-xs text-text-tertiary">
            {pagination.total} rows
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Add Row">
            <IconButton size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <OverlayScrollbarsComponent
          className="h-full os-theme-custom"
          options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
        >
          {tableDataLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
            </div>
          ) : tableData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-tertiary">
              <p className="text-sm">No data</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-bg-secondary">
                <tr>
                  <th className="w-20 px-3 py-2 text-left border-b border-border">
                    Actions
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.name}
                      className="px-3 py-2 text-left border-b border-border cursor-pointer hover:bg-bg-hover"
                      onClick={() => handleSort(col.name)}
                    >
                      <div className="flex items-center gap-1">
                        <span className={cn(col.primaryKey && "text-accent")}>
                          {col.name}
                        </span>
                        {sort?.column === col.name && (
                          sort.direction === "asc" ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, idx) => {
                  const isDeleting = deletingRow === row;
                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "hover:bg-bg-hover",
                        isDeleting && "opacity-50"
                      )}
                    >
                      <td className="px-3 py-1.5 border-b border-border">
                        <div className="flex items-center gap-1">
                          <Tooltip content="Edit">
                            <IconButton
                              size="sm"
                              className="p-1"
                              onClick={() => setEditingRow(row)}
                              disabled={primaryKeys.length === 0}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip content="Delete">
                            <IconButton
                              size="sm"
                              className="p-1"
                              onClick={() => handleDelete(row)}
                              disabled={primaryKeys.length === 0 || isDeleting}
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </div>
                      </td>
                      {columns.map((col) => {
                        const cellValue = row[col.name];
                        const formatted = formatCellValue(cellValue, col);

                        return (
                          <td
                            key={col.name}
                            className="px-3 py-1.5 border-b border-border font-mono text-xs"
                          >
                            <div className="flex items-center gap-1 max-w-xs">
                              <CellInspector value={cellValue} isJson={formatted.isJson}>
                                <span
                                  className={cn(
                                    "truncate block max-w-[200px]",
                                    cellValue === null && "text-text-tertiary italic"
                                  )}
                                >
                                  {formatted.display}
                                </span>
                              </CellInspector>
                              {formatted.isJson && cellValue !== null && (
                                <Tooltip content="Edit JSON">
                                  <IconButton
                                    size="sm"
                                    className="p-0.5 flex-shrink-0"
                                    onClick={() => setJsonModal({
                                      value: cellValue,
                                      columnName: col.name,
                                      row,
                                      column: col,
                                    })}
                                  >
                                    <Maximize2 className="w-3 h-3" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </OverlayScrollbarsComponent>
      </div>

      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-t border-border bg-bg-secondary">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">Rows per page:</span>
          <select
            value={pagination.limit}
            onChange={(e) => setPagination({ limit: parseInt(e.target.value), offset: 0 })}
            className="px-2 py-1 text-xs rounded bg-bg-tertiary border border-border"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">
            Page {currentPage} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <IconButton
              size="sm"
              className="p-1"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </IconButton>
            <IconButton
              size="sm"
              className="p-1"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </IconButton>
            <IconButton
              size="sm"
              className="p-1"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </IconButton>
            <IconButton
              size="sm"
              className="p-1"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages}
            >
              <ChevronsRight className="w-4 h-4" />
            </IconButton>
          </div>
        </div>
      </div>

      {showAddForm && (
        <RowForm
          mode="insert"
          columns={columns}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {editingRow && (
        <RowForm
          mode="update"
          columns={columns}
          initialData={editingRow}
          primaryKeys={primaryKeys}
          onClose={() => setEditingRow(null)}
        />
      )}

      {jsonModal && (
        <JsonViewerModal
          isOpen={true}
          onClose={() => setJsonModal(null)}
          value={jsonModal.value}
          columnName={jsonModal.columnName}
          isEditable={primaryKeys.length > 0}
          onSave={handleJsonSave}
        />
      )}
    </div>
  );
}
