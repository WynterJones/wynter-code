import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface CaseOption {
  id: string;
  name: string;
  example: string;
  convert: (text: string) => string;
}

function toWords(text: string): string[] {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const CASE_OPTIONS: CaseOption[] = [
  {
    id: "camel",
    name: "camelCase",
    example: "myVariableName",
    convert: (text) => {
      const words = toWords(text);
      return words
        .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join("");
    },
  },
  {
    id: "pascal",
    name: "PascalCase",
    example: "MyVariableName",
    convert: (text) => {
      const words = toWords(text);
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
    },
  },
  {
    id: "snake",
    name: "snake_case",
    example: "my_variable_name",
    convert: (text) => toWords(text).map((w) => w.toLowerCase()).join("_"),
  },
  {
    id: "screaming_snake",
    name: "SCREAMING_SNAKE_CASE",
    example: "MY_VARIABLE_NAME",
    convert: (text) => toWords(text).map((w) => w.toUpperCase()).join("_"),
  },
  {
    id: "kebab",
    name: "kebab-case",
    example: "my-variable-name",
    convert: (text) => toWords(text).map((w) => w.toLowerCase()).join("-"),
  },
  {
    id: "train",
    name: "Train-Case",
    example: "My-Variable-Name",
    convert: (text) => toWords(text).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("-"),
  },
  {
    id: "upper",
    name: "UPPERCASE",
    example: "MY VARIABLE NAME",
    convert: (text) => text.toUpperCase(),
  },
  {
    id: "lower",
    name: "lowercase",
    example: "my variable name",
    convert: (text) => text.toLowerCase(),
  },
  {
    id: "title",
    name: "Title Case",
    example: "My Variable Name",
    convert: (text) => toWords(text).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "),
  },
  {
    id: "sentence",
    name: "Sentence case",
    example: "My variable name",
    convert: (text) => {
      const lower = text.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    },
  },
  {
    id: "dot",
    name: "dot.case",
    example: "my.variable.name",
    convert: (text) => toWords(text).map((w) => w.toLowerCase()).join("."),
  },
  {
    id: "path",
    name: "path/case",
    example: "my/variable/name",
    convert: (text) => toWords(text).map((w) => w.toLowerCase()).join("/"),
  },
];

export function CaseConverter() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary">Input Text</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to convert (e.g., my variable name, myVariableName, my-variable-name)"
          className={cn(
            "min-h-[80px] resize-y text-sm",
            "bg-bg-primary border border-border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50"
          )}
        />
      </div>

      {input && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {CASE_OPTIONS.map((option) => {
            const converted = option.convert(input);
            return (
              <div
                key={option.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border group hover:border-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-tertiary mb-1">{option.name}</div>
                  <div className="text-sm font-mono text-text-primary truncate">{converted}</div>
                </div>
                <Tooltip content={copied === option.id ? "Copied!" : "Copy"}>
                  <IconButton
                    size="sm"
                    onClick={() => handleCopy(converted, option.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copied === option.id ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </IconButton>
                </Tooltip>
              </div>
            );
          })}
        </div>
      )}

      {!input && (
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          Enter text above to see all case conversions
        </div>
      )}
    </div>
  );
}
