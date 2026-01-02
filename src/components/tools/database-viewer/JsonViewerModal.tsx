import { useState, useEffect } from "react";
import { Copy, Check, Edit2, X, Save } from "lucide-react";
import { Modal, Button, IconButton, Tooltip } from "@/components/ui";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

interface JsonViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: unknown;
  columnName: string;
  isEditable?: boolean;
  onSave?: (value: unknown) => void;
}

export function JsonViewerModal({
  isOpen,
  onClose,
  value,
  columnName,
  isEditable = false,
  onSave,
}: JsonViewerModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const formattedJson = JSON.stringify(value, null, 2);

  useEffect(() => {
    if (isOpen) {
      setEditValue(formattedJson);
      setIsEditing(false);
      setError(null);
    }
  }, [isOpen, formattedJson]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = formattedJson;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editValue);
      setError(null);
      onSave?.(parsed);
      setIsEditing(false);
      onClose();
    } catch (error) {
      setError("Invalid JSON: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleEdit = () => {
    setEditValue(formattedJson);
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setEditValue(formattedJson);
    setIsEditing(false);
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" showCloseButton={false}>
      <div className="flex flex-col h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{columnName}</h3>
            <span className="text-xs text-text-tertiary px-2 py-0.5 rounded bg-bg-tertiary">
              JSON
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content={copied ? "Copied!" : "Copy to clipboard"}>
              <IconButton size="sm" onClick={handleCopy} aria-label="Copy JSON to clipboard">
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </IconButton>
            </Tooltip>
            {isEditable && !isEditing && (
              <Tooltip content="Edit">
                <IconButton size="sm" onClick={handleEdit} aria-label="Edit JSON">
                  <Edit2 className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip content="Close">
              <IconButton size="sm" onClick={onClose} aria-label="Close JSON viewer">
                <X className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {isEditing ? (
            <div className="h-full flex flex-col">
              <textarea
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setError(null);
                }}
                className="flex-1 w-full p-4 font-mono text-sm bg-bg-tertiary resize-none focus:outline-none"
                spellCheck={false}
              />
              {error && (
                <div className="px-4 py-2 text-sm text-red-400 bg-red-500/10 border-t border-red-500/20">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <OverlayScrollbarsComponent
              className="h-full os-theme-custom"
              options={{
                scrollbars: { theme: "os-theme-custom", autoHide: "scroll" },
              }}
            >
              <pre className="p-4 font-mono text-sm text-text-primary whitespace-pre-wrap break-words">
                {formattedJson}
              </pre>
            </OverlayScrollbarsComponent>
          )}
        </div>

        {/* Footer (only when editing) */}
        {isEditing && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
