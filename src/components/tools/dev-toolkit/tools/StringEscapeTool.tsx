import { useState } from "react";
import { MiniToolLayout } from "../MiniToolLayout";

type EscapeMode = "json" | "html" | "url" | "regex" | "sql" | "shell" | "csv";

const ESCAPE_MODES: Array<{ id: EscapeMode; name: string }> = [
  { id: "json", name: "JSON" },
  { id: "html", name: "HTML" },
  { id: "url", name: "URL" },
  { id: "regex", name: "Regex" },
  { id: "sql", name: "SQL" },
  { id: "shell", name: "Shell" },
  { id: "csv", name: "CSV" },
];

function escapeJson(text: string): string {
  return JSON.stringify(text).slice(1, -1);
}

function unescapeJson(text: string): string {
  try {
    return JSON.parse(`"${text}"`);
  } catch {
    return text;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unescapeHtml(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unescapeRegex(text: string): string {
  return text.replace(/\\([.*+?^${}()|[\]\\])/g, "$1");
}

function escapeSql(text: string): string {
  return text.replace(/'/g, "''").replace(/\\/g, "\\\\");
}

function unescapeSql(text: string): string {
  return text.replace(/''/g, "'").replace(/\\\\/g, "\\");
}

function escapeShell(text: string): string {
  return `'${text.replace(/'/g, "'\\''")}'`;
}

function unescapeShell(text: string): string {
  if (text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/'\\''|\\'/g, "'");
  }
  return text.replace(/\\(.)/g, "$1");
}

function escapeCsv(text: string): string {
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function unescapeCsv(text: string): string {
  if (text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1).replace(/""/g, '"');
  }
  return text;
}

function escape(text: string, mode: EscapeMode): string {
  switch (mode) {
    case "json": return escapeJson(text);
    case "html": return escapeHtml(text);
    case "url": return encodeURIComponent(text);
    case "regex": return escapeRegex(text);
    case "sql": return escapeSql(text);
    case "shell": return escapeShell(text);
    case "csv": return escapeCsv(text);
  }
}

function unescape(text: string, mode: EscapeMode): string {
  switch (mode) {
    case "json": return unescapeJson(text);
    case "html": return unescapeHtml(text);
    case "url": return decodeURIComponent(text);
    case "regex": return unescapeRegex(text);
    case "sql": return unescapeSql(text);
    case "shell": return unescapeShell(text);
    case "csv": return unescapeCsv(text);
  }
}

export function StringEscapeTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<EscapeMode>("json");

  const handleEscape = () => {
    try {
      setOutput(escape(input, mode));
      setError(null);
    } catch (e) {
      setError(`Escape error: ${(e as Error).message}`);
      setOutput("");
    }
  };

  const handleUnescape = () => {
    try {
      setOutput(unescape(input, mode));
      setError(null);
    } catch (e) {
      setError(`Unescape error: ${(e as Error).message}`);
      setOutput("");
    }
  };

  const handleClear = () => {
    setOutput("");
    setError(null);
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-bg-secondary border border-border">
        <span className="text-xs text-text-secondary">Escape mode:</span>
        <div className="flex gap-1 flex-wrap">
          {ESCAPE_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                mode === m.id
                  ? "bg-accent text-primary-950"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <MiniToolLayout
        inputLabel="Input String"
        inputPlaceholder='Enter text to escape/unescape...'
        outputLabel="Result"
        value={input}
        onChange={setInput}
        output={output}
        error={error}
        onClear={handleClear}
        actions={[
          { label: "Escape", onClick: handleEscape, variant: "primary" },
          { label: "Unescape", onClick: handleUnescape },
        ]}
      />
    </div>
  );
}
