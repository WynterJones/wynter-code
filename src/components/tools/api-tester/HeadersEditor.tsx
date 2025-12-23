import { Plus } from "lucide-react";
import { useApiTesterStore } from "@/stores/apiTesterStore";
import { KeyValueRow } from "./KeyValueRow";
import { createKeyValuePair } from "@/types";

interface HeadersEditorProps {
  requestId: string;
}

export function HeadersEditor({ requestId }: HeadersEditorProps) {
  const { getRequest, updateRequestHeaders } = useApiTesterStore();
  const request = getRequest(requestId);

  if (!request) return null;

  const handleAdd = () => {
    updateRequestHeaders(requestId, [...request.headers, createKeyValuePair()]);
  };

  const handleUpdate = (index: number, updates: Partial<typeof request.headers[0]>) => {
    const newHeaders = [...request.headers];
    newHeaders[index] = { ...newHeaders[index], ...updates };
    updateRequestHeaders(requestId, newHeaders);
  };

  const handleDelete = (index: number) => {
    updateRequestHeaders(requestId, request.headers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-primary">Request Headers</h3>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:bg-bg-hover rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Header
        </button>
      </div>

      {request.headers.length === 0 ? (
        <div className="text-center py-8 text-text-secondary text-sm">
          <p>No headers added</p>
          <button onClick={handleAdd} className="mt-2 text-accent hover:underline">
            Add your first header
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {request.headers.map((header, index) => (
            <KeyValueRow
              key={header.id}
              pair={header}
              onChange={(updates) => handleUpdate(index, updates)}
              onDelete={() => handleDelete(index)}
              keyPlaceholder="Header name"
              valuePlaceholder="Header value"
            />
          ))}
        </div>
      )}

      {/* Common headers suggestion */}
      {request.headers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-[10px] text-text-secondary mb-2">Quick add:</p>
          <div className="flex flex-wrap gap-1">
            {["Content-Type", "Authorization", "Accept", "User-Agent", "X-API-Key"].map((header) => (
              <button
                key={header}
                onClick={() => updateRequestHeaders(requestId, [...request.headers, createKeyValuePair(header, "")])}
                className="px-2 py-0.5 text-[10px] bg-bg-tertiary hover:bg-bg-hover rounded border border-border transition-colors"
              >
                {header}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
