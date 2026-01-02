import { useState, useMemo } from "react";
import { Copy, Check, Trash2, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

type SortType = "alphabetical" | "numerical" | "length" | "natural";
type SortDirection = "asc" | "desc";

function naturalSort(a: string, b: string): number {
  const chunkRegex = /(\d+|\D+)/g;
  const aChunks = a.match(chunkRegex) || [];
  const bChunks = b.match(chunkRegex) || [];

  for (let i = 0; i < Math.max(aChunks.length, bChunks.length); i++) {
    const aChunk = aChunks[i] || "";
    const bChunk = bChunks[i] || "";

    const aNum = parseInt(aChunk, 10);
    const bNum = parseInt(bChunk, 10);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
    } else {
      const comparison = aChunk.localeCompare(bChunk, undefined, { numeric: true, sensitivity: "base" });
      if (comparison !== 0) return comparison;
    }
  }

  return 0;
}

function sortList(items: string[], sortType: SortType, direction: SortDirection, caseSensitive: boolean): string[] {
  const sorted = [...items];

  if (sortType === "alphabetical") {
    sorted.sort((a, b) => {
      const aVal = caseSensitive ? a : a.toLowerCase();
      const bVal = caseSensitive ? b : b.toLowerCase();
      return aVal.localeCompare(bVal);
    });
  } else if (sortType === "numerical") {
    sorted.sort((a, b) => {
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      if (isNaN(aNum) && isNaN(bNum)) return a.localeCompare(b);
      if (isNaN(aNum)) return 1;
      if (isNaN(bNum)) return -1;
      return aNum - bNum;
    });
  } else if (sortType === "length") {
    sorted.sort((a, b) => a.length - b.length);
  } else if (sortType === "natural") {
    sorted.sort(naturalSort);
  }

  if (direction === "desc") {
    sorted.reverse();
  }

  return sorted;
}

function removeDuplicates(items: string[], caseSensitive: boolean): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const key = caseSensitive ? item : item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

export function ListSorterDeduplicator() {
  const [input, setInput] = useState("");
  const [sortType, setSortType] = useState<SortType>("alphabetical");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [removeDups, setRemoveDups] = useState(false);
  const [copied, setCopied] = useState(false);

  const processed = useMemo(() => {
    if (!input.trim()) return [];

    const lines = input.split("\n").map((line) => line.trim()).filter(Boolean);

    let result = lines;

    if (removeDups) {
      result = removeDuplicates(result, caseSensitive);
    }

    result = sortList(result, sortType, sortDirection, caseSensitive);

    return result;
  }, [input, sortType, sortDirection, caseSensitive, removeDups]);

  const handleCopy = async () => {
    const text = processed.join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput("");
  };

  const handleReset = () => {
    setSortType("alphabetical");
    setSortDirection("asc");
    setCaseSensitive(false);
    setRemoveDups(false);
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">Input List</label>
          <div className="flex items-center gap-2">
            {input && (
              <>
                <Tooltip content="Reset Options">
                  <IconButton size="sm" onClick={handleReset} aria-label="Reset options to defaults">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Clear">
                  <IconButton size="sm" onClick={handleClear} aria-label="Clear input">
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter items, one per line..."
          className={cn(
            "flex-1 min-h-[150px] resize-y text-sm font-mono",
            "bg-bg-primary border border-border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50"
          )}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-tertiary">Sort Type</label>
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as SortType)}
              className={cn(
                "text-sm px-2 py-1.5 rounded",
                "bg-bg-secondary border border-border",
                "focus:outline-none focus:ring-2 focus:ring-accent/50"
              )}
            >
              <option value="alphabetical">Alphabetical</option>
              <option value="numerical">Numerical</option>
              <option value="length">Length</option>
              <option value="natural">Natural</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-tertiary">Direction</label>
            <div className="flex gap-1">
              <Tooltip content="Ascending">
                <IconButton
                  size="sm"
                  onClick={() => setSortDirection("asc")}
                  className={cn(
                    sortDirection === "asc" && "bg-bg-hover"
                  )}
                  aria-label="Sort ascending"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </IconButton>
              </Tooltip>
              <Tooltip content="Descending">
                <IconButton
                  size="sm"
                  onClick={() => setSortDirection("desc")}
                  className={cn(
                    sortDirection === "desc" && "bg-bg-hover"
                  )}
                  aria-label="Sort descending"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </IconButton>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="case-sensitive"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="case-sensitive" className="text-xs text-text-secondary cursor-pointer">
              Case Sensitive
            </label>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="remove-dups"
              checked={removeDups}
              onChange={(e) => setRemoveDups(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="remove-dups" className="text-xs text-text-secondary cursor-pointer">
              Remove Duplicates
            </label>
          </div>
        </div>

        {input && (
          <div className="flex items-center justify-between p-2 bg-bg-secondary rounded text-xs text-text-tertiary">
            <span>
              {processed.length} {processed.length === 1 ? "item" : "items"}
              {removeDups && input.split("\n").filter(Boolean).length !== processed.length && (
                <span className="ml-1">
                  ({input.split("\n").filter(Boolean).length - processed.length} duplicates removed)
                </span>
              )}
            </span>
            <Tooltip content={copied ? "Copied!" : "Copy Result"}>
              <IconButton size="sm" onClick={handleCopy} aria-label="Copy result">
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </IconButton>
            </Tooltip>
          </div>
        )}
      </div>

      {processed.length > 0 && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <label className="text-sm font-medium text-text-secondary">Result</label>
          <div className={cn(
            "flex-1 min-h-[150px] resize-y text-sm font-mono overflow-auto",
            "bg-bg-primary border border-border rounded-lg p-3"
          )}>
            {processed.map((item, index) => (
              <div key={index} className="py-0.5 text-text-primary">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {!input && (
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          Enter a list above to sort and deduplicate
        </div>
      )}
    </div>
  );
}

