import { Copy, Check, RefreshCw, Trash2 } from "lucide-react";
import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useCopyWithFeedback } from "@/hooks/useCopyWithFeedback";

type UuidFormat = "default" | "uppercase" | "no-dashes" | "braces";

function formatUuid(uuid: string, format: UuidFormat): string {
  switch (format) {
    case "uppercase":
      return uuid.toUpperCase();
    case "no-dashes":
      return uuid.replace(/-/g, "");
    case "braces":
      return `{${uuid}}`;
    default:
      return uuid;
  }
}

export function UuidGenerator() {
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [format, setFormat] = useState<UuidFormat>("default");
  const { copy, isCopied } = useCopyWithFeedback();

  const handleGenerate = useCallback(() => {
    const newUuids: string[] = [];
    for (let i = 0; i < count; i++) {
      newUuids.push(formatUuid(uuidv4(), format));
    }
    setUuids(newUuids);
  }, [count, format]);

  const handleCopyAll = () => {
    copy(uuids.join("\n"), "all");
  };

  const handleClear = () => {
    setUuids([]);
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Count:</label>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            className="w-16 px-2 py-1 text-sm bg-bg-primary border border-border rounded"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Format:</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as UuidFormat)}
            className="px-2 py-1 text-sm bg-bg-primary border border-border rounded"
          >
            <option value="default">Default (lowercase)</option>
            <option value="uppercase">UPPERCASE</option>
            <option value="no-dashes">No dashes</option>
            <option value="braces">{"{braces}"}</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleGenerate} variant="primary" size="sm">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Generate
        </Button>
        {uuids.length > 0 && (
          <>
            <Button onClick={handleCopyAll} variant="default" size="sm">
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy All
            </Button>
            <Tooltip content="Clear">
              <IconButton size="sm" onClick={handleClear} aria-label="Clear all UUIDs">
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </div>

      {uuids.length > 0 && (
        <div className="flex flex-col gap-1 flex-1 overflow-auto">
          {uuids.map((uuid, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-lg bg-bg-secondary border border-border group hover:border-accent/50 transition-colors"
            >
              <span className="text-xs text-text-tertiary w-6">{i + 1}.</span>
              <code className="flex-1 font-mono text-sm text-text-primary select-all">
                {uuid}
              </code>
              <Tooltip content={isCopied(String(i)) ? "Copied!" : "Copy"}>
                <IconButton
                  size="sm"
                  onClick={() => copy(uuid, String(i))}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Copy UUID"
                >
                  {isCopied(String(i)) ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </IconButton>
              </Tooltip>
            </div>
          ))}
        </div>
      )}

      {uuids.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          Click Generate to create UUIDs
        </div>
      )}
    </div>
  );
}
