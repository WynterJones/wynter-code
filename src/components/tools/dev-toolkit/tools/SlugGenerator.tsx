import { useState, useMemo } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface SlugOption {
  id: string;
  name: string;
  generate: (text: string) => string;
}

function removeAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toSlug(text: string, separator: string = "-", lowercase: boolean = true): string {
  const slug = removeAccents(text)
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, separator)
    .replace(new RegExp(`${separator}+`, "g"), separator);

  return lowercase ? slug.toLowerCase() : slug;
}

const SLUG_OPTIONS: SlugOption[] = [
  {
    id: "kebab",
    name: "kebab-case (URL slug)",
    generate: (text) => toSlug(text, "-"),
  },
  {
    id: "snake",
    name: "snake_case",
    generate: (text) => toSlug(text, "_"),
  },
  {
    id: "filename",
    name: "Filename safe",
    generate: (text) => toSlug(text, "-").replace(/^-+|-+$/g, ""),
  },
  {
    id: "wordpress",
    name: "WordPress style",
    generate: (text) => toSlug(text, "-").slice(0, 200),
  },
  {
    id: "github",
    name: "GitHub anchor",
    generate: (text) => toSlug(text, "-").replace(/[^a-z0-9-]/g, ""),
  },
];

export function SlugGenerator() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [maxLength, setMaxLength] = useState(0);

  const slugs = useMemo(() => {
    if (!input.trim()) return [];
    return SLUG_OPTIONS.map((option) => {
      let slug = option.generate(input);
      if (maxLength > 0) {
        slug = slug.slice(0, maxLength);
        if (slug.endsWith("-") || slug.endsWith("_")) {
          slug = slug.slice(0, -1);
        }
      }
      return { ...option, slug };
    });
  }, [input, maxLength]);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClear = () => {
    setInput("");
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">Input Text</label>
          {input && (
            <Tooltip content="Clear">
              <IconButton size="sm" onClick={handleClear} aria-label="Clear input">
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          )}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to convert to slug (e.g., My Blog Post Title!)"
          className={cn(
            "min-h-[80px] resize-y text-sm",
            "bg-bg-primary border border-border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50"
          )}
        />
      </div>

      <div className="flex items-center gap-4 p-3 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Max length:</label>
          <input
            type="number"
            min={0}
            max={500}
            value={maxLength}
            onChange={(e) => setMaxLength(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="0 = unlimited"
            className="w-20 px-2 py-1 text-sm bg-bg-primary border border-border rounded"
          />
          <span className="text-xs text-text-tertiary">(0 = unlimited)</span>
        </div>
      </div>

      {slugs.length > 0 && (
        <div className="flex flex-col gap-2">
          {slugs.map((option) => (
            <div
              key={option.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border group hover:border-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-tertiary mb-1">{option.name}</div>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm text-text-primary truncate">{option.slug}</code>
                  <span className="text-xs text-text-tertiary">({option.slug.length} chars)</span>
                </div>
              </div>
              <Tooltip content={copied === option.id ? "Copied!" : "Copy"}>
                <IconButton
                  size="sm"
                  onClick={() => handleCopy(option.slug, option.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Copy ${option.name} slug`}
                >
                  {copied === option.id ? (
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

      {!input.trim() && (
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          Enter text above to generate URL-safe slugs
        </div>
      )}
    </div>
  );
}
