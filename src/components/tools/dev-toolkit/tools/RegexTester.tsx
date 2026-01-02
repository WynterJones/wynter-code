import { useState, useMemo } from "react";
import { AlertCircle, Copy, Check } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface Match {
  index: number;
  match: string;
  groups: string[];
}

interface RegexResult {
  matches: Match[];
  error: string | null;
}

function testRegex(pattern: string, flags: string, text: string): RegexResult {
  if (!pattern) return { matches: [], error: null };

  try {
    const regex = new RegExp(pattern, flags);
    const matches: Match[] = [];

    if (flags.includes("g")) {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          match: match[0],
          groups: match.slice(1),
        });
        if (!match[0]) break;
      }
    } else {
      const match = regex.exec(text);
      if (match) {
        matches.push({
          index: match.index,
          match: match[0],
          groups: match.slice(1),
        });
      }
    }

    return { matches, error: null };
  } catch (error) {
    return { matches: [], error: (error as Error).message };
  }
}

function highlightMatches(text: string, matches: Match[]): React.ReactNode[] {
  if (matches.length === 0) return [text];

  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, i) => {
    if (match.index > lastIndex) {
      result.push(
        <span key={`text-${i}`}>{text.slice(lastIndex, match.index)}</span>
      );
    }
    result.push(
      <mark key={`match-${i}`} className="bg-accent/40 text-text-primary rounded px-0.5">
        {match.match}
      </mark>
    );
    lastIndex = match.index + match.match.length;
  });

  if (lastIndex < text.length) {
    result.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return result;
}

const FLAG_OPTIONS = [
  { flag: "g", name: "Global", desc: "Find all matches" },
  { flag: "i", name: "Case Insensitive", desc: "Ignore case" },
  { flag: "m", name: "Multiline", desc: "^ and $ match line boundaries" },
  { flag: "s", name: "Dotall", desc: ". matches newlines" },
];

export function RegexTester() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => testRegex(pattern, flags, text), [pattern, flags, text]);

  const handleCopy = async () => {
    const regex = `/${pattern}/${flags}`;
    await navigator.clipboard.writeText(regex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFlag = (flag: string) => {
    if (flags.includes(flag)) {
      setFlags(flags.replace(flag, ""));
    } else {
      setFlags(flags + flag);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">Regular Expression</label>
          <Tooltip content={copied ? "Copied!" : "Copy regex"}>
            <IconButton size="sm" onClick={handleCopy} aria-label="Copy regular expression">
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </IconButton>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary font-mono">/</span>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Enter regex pattern..."
            className={cn(
              "flex-1 px-3 py-2 font-mono text-sm",
              "bg-bg-primary border rounded-lg",
              "placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50",
              result.error ? "border-red-500/50" : "border-border"
            )}
          />
          <span className="text-text-tertiary font-mono">/</span>
          <input
            type="text"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            className="w-16 px-2 py-2 font-mono text-sm bg-bg-primary border border-border rounded-lg text-center"
          />
        </div>
        {result.error && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{result.error}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {FLAG_OPTIONS.map((opt) => (
          <Tooltip key={opt.flag} content={opt.desc}>
            <button
              onClick={() => toggleFlag(opt.flag)}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors",
                flags.includes(opt.flag)
                  ? "bg-accent text-primary-950"
                  : "bg-bg-secondary text-text-secondary hover:bg-bg-hover"
              )}
            >
              {opt.name} ({opt.flag})
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <label className="text-sm font-medium text-text-secondary">Test String</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to test against..."
          className={cn(
            "flex-1 min-h-[100px] resize-y font-mono text-sm",
            "bg-bg-primary border border-border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50"
          )}
        />
      </div>

      {text && pattern && !result.error && (
        <>
          <div className="p-3 rounded-lg bg-bg-secondary border border-border">
            <div className="text-xs text-text-tertiary mb-2">
              {result.matches.length} match{result.matches.length !== 1 ? "es" : ""} found
            </div>
            <div className="font-mono text-sm whitespace-pre-wrap break-all text-text-primary">
              {highlightMatches(text, result.matches)}
            </div>
          </div>

          {result.matches.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-text-tertiary uppercase tracking-wider">Match Details</div>
              <div className="max-h-40 overflow-auto flex flex-col gap-1">
                {result.matches.map((match, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded bg-bg-secondary text-sm">
                    <span className="text-text-tertiary w-4">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="font-mono text-accent">{`"${match.match}"`}</div>
                      <div className="text-xs text-text-tertiary">Index: {match.index}</div>
                      {match.groups.length > 0 && (
                        <div className="text-xs text-text-secondary mt-1">
                          Groups: {match.groups.map((g, j) => `$${j + 1}="${g}"`).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
