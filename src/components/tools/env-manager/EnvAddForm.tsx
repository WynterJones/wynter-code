import { useState } from "react";
import { X, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui";
import { detectSensitive } from "@/stores/envStore";
import { cn } from "@/lib/utils";

interface EnvAddFormProps {
  onAdd: (key: string, value: string) => void;
  onCancel: () => void;
  existingKeys: string[];
}

export function EnvAddForm({ onAdd, onCancel, existingKeys }: EnvAddFormProps) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSensitive = detectSensitive(key);
  const keyExists = existingKeys.includes(key);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!key.trim()) {
      setError("Variable name is required");
      return;
    }

    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      setError("Use SCREAMING_SNAKE_CASE (e.g., API_KEY)");
      return;
    }

    if (keyExists) {
      setError("Variable already exists");
      return;
    }

    onAdd(key, value);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-lg border border-border shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">Add Variable</h3>
          <button
            onClick={onCancel}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              Variable Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value.toUpperCase());
                  setError(null);
                }}
                className={cn(
                  "w-full px-3 py-2 rounded-md bg-bg-tertiary border text-sm font-mono focus:outline-none focus:border-accent",
                  error ? "border-red-500" : "border-border"
                )}
                placeholder="VARIABLE_NAME"
                autoFocus
              />
              {isSensitive && key && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Shield className="w-4 h-4 text-yellow-500" />
                </div>
              )}
            </div>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
            {isSensitive && !error && (
              <p className="text-xs text-yellow-500 mt-1">
                This will be marked as sensitive
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              Value
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border text-sm font-mono focus:outline-none focus:border-accent"
              placeholder="value"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Variable
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
