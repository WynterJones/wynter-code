import { Copy, Trash2, Check, ArrowLeftRight } from "lucide-react";
import { useState, useMemo } from "react";
import { diffLines, diffWords, diffChars, Change } from "diff";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/ScrollArea";

type DiffMode = "lines" | "words" | "chars";

interface DiffStats {
  additions: number;
  deletions: number;
  unchanged: number;
}

function calculateStats(changes: Change[]): DiffStats {
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  changes.forEach((change) => {
    const count = change.value.length;
    if (change.added) {
      additions += count;
    } else if (change.removed) {
      deletions += count;
    } else {
      unchanged += count;
    }
  });

  return { additions, deletions, unchanged };
}

export function TextDiffTool() {
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [mode, setMode] = useState<DiffMode>("lines");
  const [copied, setCopied] = useState(false);

  const { diff, stats } = useMemo(() => {
    if (!original && !modified) {
      return { diff: [], stats: { additions: 0, deletions: 0, unchanged: 0 } };
    }

    let changes: Change[];
    switch (mode) {
      case "words":
        changes = diffWords(original, modified);
        break;
      case "chars":
        changes = diffChars(original, modified);
        break;
      case "lines":
      default:
        changes = diffLines(original, modified);
    }

    return { diff: changes, stats: calculateStats(changes) };
  }, [original, modified, mode]);

  const handleCopy = async () => {
    const result = diff
      .map((change) => {
        if (change.added) return `+ ${change.value}`;
        if (change.removed) return `- ${change.value}`;
        return `  ${change.value}`;
      })
      .join("");

    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setOriginal("");
    setModified("");
  };

  const handleSwap = () => {
    const temp = original;
    setOriginal(modified);
    setModified(temp);
  };

  const hasDiff = original || modified;
  const hasChanges = stats.additions > 0 || stats.deletions > 0;

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">
            Original Text
          </label>
          <textarea
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder="Enter original text..."
            className={cn(
              "min-h-[150px] resize-y font-mono text-sm",
              "bg-bg-primary border border-border rounded-lg p-3",
              "placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">
            Modified Text
          </label>
          <textarea
            value={modified}
            onChange={(e) => setModified(e.target.value)}
            placeholder="Enter modified text..."
            className={cn(
              "min-h-[150px] resize-y font-mono text-sm",
              "bg-bg-primary border border-border rounded-lg p-3",
              "placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">Compare by:</span>
          {(["lines", "words", "chars"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md transition-colors capitalize",
                mode === m
                  ? "bg-accent text-primary-950"
                  : "bg-bg-secondary text-text-secondary hover:bg-bg-hover"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Swap texts">
            <IconButton size="sm" onClick={handleSwap} disabled={!hasDiff}>
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Clear all">
            <IconButton size="sm" onClick={handleClear} disabled={!hasDiff}>
              <Trash2 className="w-3.5 h-3.5" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {hasDiff && (
        <>
          <div className="flex items-center gap-4 p-3 rounded-lg bg-bg-secondary border border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-green-500/30 border border-green-500" />
              <span className="text-xs text-text-secondary">
                +{stats.additions} added
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500" />
              <span className="text-xs text-text-secondary">
                -{stats.deletions} removed
              </span>
            </div>
            <div className="flex-1" />
            <Tooltip content={copied ? "Copied!" : "Copy diff"}>
              <IconButton size="sm" onClick={handleCopy} disabled={!hasChanges}>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </IconButton>
            </Tooltip>
          </div>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full" scrollbarVisibility="visible">
              <div className="bg-bg-tertiary/30 rounded-lg border border-border p-4 font-mono text-sm whitespace-pre-wrap">
                {diff.map((change, i) => (
                  <span
                    key={i}
                    className={cn(
                      change.added && "bg-green-500/20 text-green-300",
                      change.removed && "bg-red-500/20 text-red-300 line-through",
                      !change.added && !change.removed && "text-text-primary"
                    )}
                  >
                    {change.value}
                  </span>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {!hasDiff && (
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          Enter text in both fields to see the diff
        </div>
      )}
    </div>
  );
}
