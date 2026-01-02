import { Plus } from "lucide-react";
import { useApiTesterStore } from "@/stores/apiTesterStore";
import { KeyValueRow } from "./KeyValueRow";
import { createKeyValuePair } from "@/types";

interface QueryParamsEditorProps {
  requestId: string;
}

export function QueryParamsEditor({ requestId }: QueryParamsEditorProps) {
  const { getRequest, updateRequestQueryParams } = useApiTesterStore();
  const request = getRequest(requestId);

  if (!request) return null;

  const handleAdd = () => {
    updateRequestQueryParams(requestId, [...request.queryParams, createKeyValuePair()]);
  };

  const handleUpdate = (index: number, updates: Partial<typeof request.queryParams[0]>) => {
    const newParams = [...request.queryParams];
    newParams[index] = { ...newParams[index], ...updates };
    updateRequestQueryParams(requestId, newParams);
  };

  const handleDelete = (index: number) => {
    updateRequestQueryParams(requestId, request.queryParams.filter((_, i) => i !== index));
  };

  // Build preview URL with query params
  const previewUrl = (() => {
    if (!request.url) return "";
    try {
      const url = new URL(request.url);
      request.queryParams
        .filter((p) => p.enabled && p.key)
        .forEach((p) => url.searchParams.set(p.key, p.value));
      return url.toString();
    } catch (error) {
      return request.url;
    }
  })();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-primary">Query Parameters</h3>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:bg-bg-hover rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Param
        </button>
      </div>

      {request.queryParams.length === 0 ? (
        <div className="text-center py-8 text-text-secondary text-sm">
          <p>No query parameters added</p>
          <button onClick={handleAdd} className="mt-2 text-accent hover:underline">
            Add your first parameter
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {request.queryParams.map((param, index) => (
              <KeyValueRow
                key={param.id}
                pair={param}
                onChange={(updates) => handleUpdate(index, updates)}
                onDelete={() => handleDelete(index)}
                keyPlaceholder="Parameter name"
                valuePlaceholder="Parameter value"
              />
            ))}
          </div>

          {/* URL Preview */}
          {previewUrl && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[10px] text-text-secondary mb-1">URL Preview:</p>
              <code className="block text-xs bg-bg-tertiary p-2 rounded-md font-mono text-text-secondary break-all">
                {previewUrl}
              </code>
            </div>
          )}
        </>
      )}
    </div>
  );
}
