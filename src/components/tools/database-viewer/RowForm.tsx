import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useDatabaseViewerStore } from "@/stores/databaseViewerStore";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { ColumnInfo } from "@/types";

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
        data[col.name] = val === null ? "" : String(val);
      } else {
        data[col.name] = "";
      }
    }
    return data;
  });

  const [isNull, setIsNull] = useState<Record<string, boolean>>(() => {
    const nulls: Record<string, boolean> = {};
    for (const col of columns) {
      nulls[col.name] = initialData ? initialData[col.name] === null : false;
    }
    return nulls;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (column: string, value: string) => {
    setFormData((prev) => ({ ...prev, [column]: value }));
    if (value) {
      setIsNull((prev) => ({ ...prev, [column]: false }));
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

            return (
              <div key={col.name} className={cn(disabled && "opacity-50")}>
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
                <div className="flex items-center gap-2">
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
                  {col.nullable && (
                    <label className="flex items-center gap-1 text-xs">
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
