import { useApiTesterStore } from "@/stores/apiTesterStore";
import { cn } from "@/lib/utils";
import type { BodyType } from "@/types";

const BODY_TYPES: { type: BodyType; label: string }[] = [
  { type: "none", label: "None" },
  { type: "json", label: "JSON" },
  { type: "form-data", label: "Form Data" },
  { type: "x-www-form-urlencoded", label: "URL Encoded" },
  { type: "raw", label: "Raw" },
];

interface BodyEditorProps {
  requestId: string;
}

export function BodyEditor({ requestId }: BodyEditorProps) {
  const { getRequest, updateRequestBody } = useApiTesterStore();
  const request = getRequest(requestId);

  if (!request) return null;

  const handleTypeChange = (type: BodyType) => {
    updateRequestBody(requestId, { type, content: request.body.content });
  };

  const handleContentChange = (content: string) => {
    updateRequestBody(requestId, { type: request.body.type, content });
  };

  const formatJson = () => {
    if (request.body.type !== "json") return;
    try {
      const formatted = JSON.stringify(JSON.parse(request.body.content), null, 2);
      handleContentChange(formatted);
    } catch {
      // Invalid JSON, ignore
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Body Type Selector */}
      <div className="flex items-center gap-1 mb-3">
        {BODY_TYPES.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              request.body.type === type
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            )}
          >
            {label}
          </button>
        ))}

        {request.body.type === "json" && request.body.content && (
          <button
            onClick={formatJson}
            className="ml-auto px-2 py-1 text-[10px] text-accent hover:bg-bg-hover rounded-md transition-colors"
          >
            Format JSON
          </button>
        )}
      </div>

      {/* Body Content */}
      {request.body.type === "none" ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
          This request does not have a body
        </div>
      ) : (
        <div className="flex-1 relative">
          <textarea
            value={request.body.content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={
              request.body.type === "json"
                ? '{\n  "key": "value"\n}'
                : request.body.type === "x-www-form-urlencoded"
                ? "key=value&another=value"
                : "Enter request body..."
            }
            className="w-full h-full min-h-[150px] px-3 py-2 text-sm bg-bg-tertiary border border-border rounded-md focus:outline-none focus:border-accent font-mono resize-none"
            spellCheck={false}
          />

          {request.body.type === "json" && request.body.content && (
            <div className="absolute bottom-2 right-2">
              {(() => {
                try {
                  JSON.parse(request.body.content);
                  return (
                    <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                      Valid JSON
                    </span>
                  );
                } catch {
                  return (
                    <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                      Invalid JSON
                    </span>
                  );
                }
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
