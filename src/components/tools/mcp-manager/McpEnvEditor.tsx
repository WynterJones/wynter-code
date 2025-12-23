import { useState } from "react";
import { Plus, Trash2, Shield } from "lucide-react";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { isSensitiveEnvKey } from "@/stores";

interface McpEnvEditorProps {
  value: Record<string, string>;
  onChange: (env: Record<string, string>) => void;
}

export function McpEnvEditor({ value, onChange }: McpEnvEditorProps) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const entries = Object.entries(value);

  const handleAdd = () => {
    if (newKey.trim()) {
      onChange({ ...value, [newKey.trim().toUpperCase()]: newValue });
      setNewKey("");
      setNewValue("");
    }
  };

  const handleRemove = (key: string) => {
    const newEnv = { ...value };
    delete newEnv[key];
    onChange(newEnv);
  };

  const handleUpdate = (oldKey: string, newKeyName: string, newVal: string) => {
    const newEnv = { ...value };
    if (oldKey !== newKeyName) {
      delete newEnv[oldKey];
    }
    newEnv[newKeyName] = newVal;
    onChange(newEnv);
  };

  return (
    <div className="space-y-2">
      {/* Existing entries */}
      {entries.map(([key, val]) => {
        const isSensitive = isSensitiveEnvKey(key);

        return (
          <div key={key} className="flex items-center gap-2">
            <div className="relative flex-1">
              {isSensitive && (
                <Shield className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-yellow-500" />
              )}
              <input
                type="text"
                value={key}
                onChange={(e) =>
                  handleUpdate(key, e.target.value.toUpperCase(), val)
                }
                className={cn(
                  "w-full px-3 py-1.5 rounded-md bg-bg-secondary border border-border text-xs font-mono focus:outline-none focus:border-accent",
                  isSensitive && "pl-7"
                )}
                placeholder="KEY"
              />
            </div>
            <span className="text-text-secondary">=</span>
            <input
              type="text"
              value={val}
              onChange={(e) => handleUpdate(key, key, e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-md bg-bg-secondary border border-border text-xs font-mono focus:outline-none focus:border-accent"
              placeholder="value"
            />
            <IconButton
              size="sm"
              onClick={() => handleRemove(key)}
              className="hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </IconButton>
          </div>
        );
      })}

      {/* Add new entry */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 px-3 py-1.5 rounded-md bg-bg-secondary border border-dashed border-border text-xs font-mono focus:outline-none focus:border-accent"
          placeholder="NEW_KEY"
        />
        <span className="text-text-secondary">=</span>
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 px-3 py-1.5 rounded-md bg-bg-secondary border border-dashed border-border text-xs font-mono focus:outline-none focus:border-accent"
          placeholder="value"
        />
        <IconButton
          size="sm"
          onClick={handleAdd}
          disabled={!newKey.trim()}
          className="text-accent hover:bg-accent/10"
        >
          <Plus className="w-3.5 h-3.5" />
        </IconButton>
      </div>

      {entries.length === 0 && !newKey && (
        <p className="text-[11px] text-text-secondary/70 text-center py-2">
          No environment variables. Add one above.
        </p>
      )}
    </div>
  );
}
