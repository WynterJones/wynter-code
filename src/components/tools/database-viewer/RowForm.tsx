import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useDatabaseViewerStore } from "@/stores/databaseViewerStore";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { ColumnInfo } from "@/types";

const isJsonColumn = (dataType: string): boolean => {
  const type = dataType.toLowerCase();
  return type === "json" || type === "jsonb" || type.includes("json");
};

interface RowFormProps {
  mode: "insert" | "update";
  columns: ColumnInfo[];
  initialData?: Record<string, unknown>;
  primaryKeys?: string[];
  onClose: () => void;
}

export function RowForm({ mode, columns, initialData, primaryKeys = [], onClose }: RowFormProps) {
  const { insertRow, updateRow } = useDatabaseViewerStore();

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const data: Record<string, string> = {};
    for (const col of columns) {
      if (initialData && initialData[col.name] !== undefined) {
        const val = initialData[col.name];
        if (val === null) {
          data[col.name] = "";
        } else if (isJsonColumn(col.dataType) && typeof val === "object") {
          data[col.name] = JSON.stringify(val, null, 2);
        } else {
          data[col.name] = String(val);
        }
      } else {
        data[col.name] = "";
      }
    }
    return data;
  });

  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  const [isNull, setIsNull] = useState<Record<string, boolean>>(() => {
    const nulls: Record<string, boolean> = {};
    for (const col of columns) {
      nulls[col.name] = initialData ? initialData[col.name] === null : false;
    }
    return nulls;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (column: string, value: string, col?: ColumnInfo) => {
    setFormData((prev) => ({ ...prev, [column]: value }));
    if (value) {
      setIsNull((prev) => ({ ...prev, [column]: false }));
    }

    // Validate JSON on change
    if (col && isJsonColumn(col.dataType) && value.trim()) {
      try {
        JSON.parse(value);
        setJsonErrors((prev) => {
          const next = { ...prev };
          delete next[column];
          return next;
        });
      } catch (e) {
        setJsonErrors((prev) => ({
          ...prev,
          [column]: e instanceof Error ? e.message : "Invalid JSON",
        }));
      }
    } else if (col && isJsonColumn(col.dataType)) {
      setJsonErrors((prev) => {
        const next = { ...prev };
        delete next[column];
        return next;
      });
    }
  };

  const handleNullChange = (column: string, checked: boolean) => {
    setIsNull((prev) => ({ ...prev, [column]: checked }));
    if (checked) {
      setFormData((prev) => ({ ...prev, [column]: "" }));
    }
  };

  const parseValue = (value: string, dataType: string, nullable: boolean): unknown => {
    if (!value && nullable) return null;

    const type = dataType.toUpperCase();

    // Handle JSON/JSONB columns
    if (isJsonColumn(dataType)) {
      if (!value.trim()) return nullable ? null : {};
      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as string if invalid JSON
      }
    }

    if (type.includes("INT") || type.includes("SERIAL")) {
      return parseInt(value) || 0;
    }
    if (type.includes("FLOAT") || type.includes("DOUBLE") || type.includes("REAL") || type.includes("NUMERIC") || type.includes("DECIMAL")) {
      return parseFloat(value) || 0;
    }
    if (type.includes("BOOL")) {
      return value.toLowerCase() === "true" || value === "1";
    }
    return value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data: Record<string, unknown> = {};
      for (const col of columns) {
        if (mode === "update" && primaryKeys.includes(col.name)) {
          continue;
        }
        if (isNull[col.name]) {
          data[col.name] = null;
        } else {
          data[col.name] = parseValue(formData[col.name], col.dataType, col.nullable);
        }
      }

      if (mode === "insert") {
        await insertRow(data);
      } else {
        const pk: Record<string, unknown> = {};
        for (const key of primaryKeys) {
          pk[key] = initialData?.[key];
        }
        await updateRow(pk, data);
      }
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={mode === "insert" ? "Add Row" : "Edit Row"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-4">
        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
          {columns.map((col) => {
            const isPrimaryKey = primaryKeys.includes(col.name);
            const disabled = mode === "update" && isPrimaryKey;
            const isJson = isJsonColumn(col.dataType);
            const hasJsonError = jsonErrors[col.name];

            return (
              <div key={col.name} className={cn(disabled && "opacity-50", isJson && "col-span-2")}>
                <label className="block text-sm font-medium mb-1">
                  <span className={cn(col.primaryKey && "text-accent")}>
                    {col.name}
                  </span>
                  <span className="text-xs text-text-tertiary ml-2">
                    {col.dataType}
                  </span>
                  {!col.nullable && (
                    <span className="text-red-400 ml-1">*</span>
                  )}
                </label>
                <div className="flex items-start gap-2">
                  {isJson ? (
                    <div className="flex-1">
                      <textarea
                        value={isNull[col.name] ? "" : formData[col.name]}
                        onChange={(e) => handleChange(col.name, e.target.value, col)}
                        disabled={disabled || isNull[col.name]}
                        placeholder={isNull[col.name] ? "NULL" : '{"key": "value"}'}
                        rows={6}
                        spellCheck={false}
                        className={cn(
                          "w-full px-3 py-2 rounded-md bg-bg-tertiary border font-mono text-sm",
                          "focus:border-accent focus:outline-none disabled:opacity-50 resize-y",
                          isNull[col.name] && "italic text-text-tertiary",
                          hasJsonError ? "border-red-500" : "border-border"
                        )}
                      />
                      {hasJsonError && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          {hasJsonError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={isNull[col.name] ? "" : formData[col.name]}
                      onChange={(e) => handleChange(col.name, e.target.value)}
                      disabled={disabled || isNull[col.name]}
                      placeholder={isNull[col.name] ? "NULL" : col.defaultValue || ""}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-md bg-bg-tertiary border border-border",
                        "focus:border-accent focus:outline-none disabled:opacity-50",
                        isNull[col.name] && "italic text-text-tertiary"
                      )}
                    />
                  )}
                  {col.nullable && (
                    <label className="flex items-center gap-1 text-xs mt-2">
                      <input
                        type="checkbox"
                        checked={isNull[col.name]}
                        onChange={(e) => handleNullChange(col.name, e.target.checked)}
                        disabled={disabled}
                        className="rounded"
                      />
                      NULL
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium bg-bg-tertiary hover:bg-bg-hover"
          >
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "insert" ? "Insert" : "Update"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
