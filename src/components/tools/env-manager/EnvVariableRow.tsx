import { useState } from "react";
import {
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Check,
  Shield,
  Pencil,
  X,
  Save,
} from "lucide-react";
import { IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { EnvVariable } from "@/types";

interface EnvVariableRowProps {
  variable: EnvVariable;
  isRevealed: boolean;
  onReveal: () => void;
  onHide: () => void;
  onSave: (variable: EnvVariable) => void;
  onDelete: () => void;
}

export function EnvVariableRow({
  variable,
  isRevealed,
  onReveal,
  onHide,
  onSave,
  onDelete,
}: EnvVariableRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editKey, setEditKey] = useState(variable.key);
  const [editValue, setEditValue] = useState(variable.value);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(variable.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave({
      ...variable,
      key: editKey,
      value: editValue,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditKey(variable.key);
    setEditValue(variable.value);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  if (isEditing) {
    return (
      <div className="p-3 rounded-lg bg-bg-tertiary/50 border border-accent/50">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={editKey}
            onChange={(e) => setEditKey(e.target.value.toUpperCase())}
            className="flex-1 px-3 py-2 rounded-md bg-bg-secondary border border-border text-sm font-mono focus:outline-none focus:border-accent"
            placeholder="VARIABLE_NAME"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-3 py-2 rounded-md bg-bg-secondary border border-border text-sm font-mono focus:outline-none focus:border-accent"
            placeholder="value"
          />
          <IconButton size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 text-green-400" />
          </IconButton>
          <IconButton size="sm" onClick={handleCancel}>
            <X className="w-4 h-4 text-red-400" />
          </IconButton>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-between p-3 rounded-lg bg-bg-tertiary/50 border border-border hover:border-border-hover transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {variable.isSensitive && (
          <Tooltip content="Sensitive variable">
            <Shield className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          </Tooltip>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-accent">
              {variable.key}
            </span>
            {variable.comment && (
              <span className="text-[10px] text-text-secondary/50 truncate">
                # {variable.comment}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={isRevealed ? onHide : onReveal}
              className={cn(
                "font-mono text-xs max-w-[300px] truncate transition-all",
                isRevealed
                  ? "text-text-primary"
                  : "text-text-secondary blur-sm hover:blur-[3px] cursor-pointer select-none"
              )}
            >
              {variable.value || "(empty)"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip content={isRevealed ? "Hide" : "Reveal"}>
          <IconButton size="sm" onClick={isRevealed ? onHide : onReveal}>
            {isRevealed ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip content={copied ? "Copied!" : "Copy value"}>
          <IconButton size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip content="Edit">
          <IconButton size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="w-3.5 h-3.5" />
          </IconButton>
        </Tooltip>

        <Tooltip content={confirmDelete ? "Click to confirm" : "Delete"}>
          <IconButton
            size="sm"
            onClick={handleDelete}
            className={cn(
              "hover:text-red-400 hover:bg-red-500/10",
              confirmDelete && "text-red-400 bg-red-500/10"
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
