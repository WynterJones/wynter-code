import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, AlertCircle, Copy, Check, Trash2, Code2, FileCode } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

type ValidationMode = "html" | "css";

interface ValidationError {
  line: number;
  column?: number;
  message: string;
  type: "error" | "warning";
}

function validateHTML(html: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = html.split("\n");

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    const errorText = parserError.textContent || "";
    const lineMatch = errorText.match(/line (\d+)/i);
    const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
    errors.push({
      line,
      message: errorText.replace(/^[^:]+:\s*/i, "").trim() || "HTML parsing error",
      type: "error",
    });
  }

  const deprecatedTags = ["center", "font", "marquee", "frame", "frameset", "noframes", "applet", "basefont", "bgsound", "blink", "isindex", "keygen", "spacer", "tt"];
  const deprecatedAttrs = ["align", "bgcolor", "border", "color", "face", "size", "width", "height"];

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const lowerLine = line.toLowerCase();

    deprecatedTags.forEach((tag) => {
      if (lowerLine.includes(`<${tag}`) || lowerLine.includes(`</${tag}>`)) {
        errors.push({
          line: lineNum,
          message: `Deprecated tag: <${tag}>`,
          type: "warning",
        });
      }
    });

    deprecatedAttrs.forEach((attr) => {
      if (lowerLine.includes(`${attr}=`)) {
        errors.push({
          line: lineNum,
          message: `Deprecated attribute: ${attr}`,
          type: "warning",
        });
      }
    });

    if (lowerLine.includes("<img") && !lowerLine.includes("alt=")) {
      errors.push({
        line: lineNum,
        message: "Missing alt attribute on image",
        type: "warning",
      });
    }

    if (lowerLine.includes("<a") && !lowerLine.includes("href=") && !lowerLine.includes("name=")) {
      errors.push({
        line: lineNum,
        message: "Anchor tag missing href or name attribute",
        type: "warning",
      });
    }
  });

  if (!html.includes("<html") && !html.includes("<!doctype")) {
    errors.push({
      line: 1,
      message: "Missing DOCTYPE declaration",
      type: "warning",
    });
  }

  const htmlTag = html.match(/<html[^>]*>/i);
  if (htmlTag && !htmlTag[0].includes("lang=")) {
    errors.push({
      line: html.split("\n").findIndex((l) => l.includes("<html")) + 1,
      message: "Missing lang attribute on <html> tag",
      type: "warning",
    });
  }

  return errors;
}

function validateCSS(css: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = css.split("\n");

  let braceCount = 0;
  let parenCount = 0;
  let bracketCount = 0;
  let inString = false;
  let stringChar = "";
  let inComment = false;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (trimmed.startsWith("/*")) {
      inComment = true;
    }
    if (trimmed.includes("*/")) {
      inComment = false;
    }
    if (inComment) return;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : "";

      if ((char === '"' || char === "'") && prevChar !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = "";
        }
        continue;
      }

      if (inString) continue;

      if (char === "{") braceCount++;
      if (char === "}") braceCount--;
      if (char === "(") parenCount++;
      if (char === ")") parenCount--;
      if (char === "[") bracketCount++;
      if (char === "]") bracketCount--;
    }

    if (braceCount < 0) {
      errors.push({
        line: lineNum,
        message: "Unexpected closing brace }",
        type: "error",
      });
      braceCount = 0;
    }
    if (parenCount < 0) {
      errors.push({
        line: lineNum,
        message: "Unexpected closing parenthesis )",
        type: "error",
      });
      parenCount = 0;
    }
    if (bracketCount < 0) {
      errors.push({
        line: lineNum,
        message: "Unexpected closing bracket ]",
        type: "error",
      });
      bracketCount = 0;
    }

    if (trimmed && !trimmed.startsWith("/*") && !trimmed.includes("*/") && trimmed.includes(":")) {
      const parts = trimmed.split(":");
      if (parts.length > 0 && parts[0].trim() && !parts[0].includes("{") && !parts[0].includes("}")) {
        const property = parts[0].trim();
        const deprecatedProps = ["zoom", "filter", "behavior", "scrollbar-arrow-color", "scrollbar-base-color", "scrollbar-darkshadow-color", "scrollbar-face-color", "scrollbar-highlight-color", "scrollbar-shadow-color", "scrollbar-track-color", "scrollbar-3dlight-color"];

        if (deprecatedProps.includes(property.toLowerCase())) {
          errors.push({
            line: lineNum,
            message: `Deprecated property: ${property}`,
            type: "warning",
          });
        }
      }
    }
  });

  if (braceCount > 0) {
    errors.push({
      line: lines.length,
      message: `Unclosed brace: ${braceCount} opening brace(s) not closed`,
      type: "error",
    });
  }
  if (parenCount > 0) {
    errors.push({
      line: lines.length,
      message: `Unclosed parenthesis: ${parenCount} opening parenthesis(es) not closed`,
      type: "error",
    });
  }
  if (bracketCount > 0) {
    errors.push({
      line: lines.length,
      message: `Unclosed bracket: ${bracketCount} opening bracket(s) not closed`,
      type: "error",
    });
  }

  return errors;
}

function formatCode(code: string, mode: ValidationMode): string {
  if (mode === "html") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, "text/html");
    const serializer = new XMLSerializer();
    let formatted = serializer.serializeToString(doc.documentElement);

    formatted = formatted
      .replace(/></g, ">\n<")
      .split("\n")
      .map((line, index, arr) => {
        const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
        const isClosing = line.includes("</");
        const nextLine = arr[index + 1];
        const nextIsClosing = nextLine?.includes("</");

        if (isClosing && nextLine && !nextIsClosing) {
          return "  ".repeat(Math.max(0, indent - 1)) + line.trim();
        }
        return "  ".repeat(indent) + line.trim();
      })
      .join("\n");

    return formatted;
  } else {
    let formatted = code;
    let indent = 0;
    const lines = code.split("\n");

    formatted = lines
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed.includes("}")) indent = Math.max(0, indent - 1);
        const result = "  ".repeat(indent) + trimmed;
        if (trimmed.includes("{")) indent++;
        return result;
      })
      .join("\n");

    return formatted;
  }
}

export function HtmlCssValidator() {
  const [mode, setMode] = useState<ValidationMode>("html");
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const errors = useMemo(() => {
    if (!input.trim()) return [];
    return mode === "html" ? validateHTML(input) : validateCSS(input);
  }, [input, mode]);

  const handleCopy = async () => {
    const formatted = formatCode(input, mode);
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput("");
  };

  const errorCount = errors.filter((e) => e.type === "error").length;
  const warningCount = errors.filter((e) => e.type === "warning").length;

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("html")}
            className={cn(
              "px-3 py-1.5 rounded text-sm font-medium transition-colors",
              mode === "html"
                ? "bg-accent text-accent-foreground"
                : "bg-bg-secondary text-text-secondary hover:text-text-primary"
            )}
          >
            <Code2 className="w-4 h-4 inline mr-1.5" />
            HTML
          </button>
          <button
            onClick={() => setMode("css")}
            className={cn(
              "px-3 py-1.5 rounded text-sm font-medium transition-colors",
              mode === "css"
                ? "bg-accent text-accent-foreground"
                : "bg-bg-secondary text-text-secondary hover:text-text-primary"
            )}
          >
            <FileCode className="w-4 h-4 inline mr-1.5" />
            CSS
          </button>
        </div>
        <div className="flex items-center gap-2">
          {input && (
            <>
              <Tooltip content="Format & Copy">
                <IconButton size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip content="Clear">
                <IconButton size="sm" onClick={handleClear}>
                  <Trash2 className="w-3.5 h-3.5" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <label className="text-sm font-medium text-text-secondary">
          {mode === "html" ? "HTML Code" : "CSS Code"}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === "html" ? "Paste HTML code here..." : "Paste CSS code here..."}
          className={cn(
            "flex-1 min-h-[200px] resize-y text-sm font-mono",
            "bg-bg-primary border border-border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50"
          )}
        />
      </div>

      {input && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 p-3 bg-bg-secondary rounded-lg">
            {errorCount === 0 && warningCount === 0 ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Valid {mode.toUpperCase()}</span>
              </div>
            ) : (
              <>
                {errorCount > 0 && (
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{errorCount} error{errorCount !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {warningCount > 0 && (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{warningCount} warning{warningCount !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {errors.length > 0 && (
            <div className="flex flex-col gap-2 max-h-[200px] overflow-auto">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    error.type === "error"
                      ? "bg-red-500/10 border-red-500/20"
                      : "bg-yellow-500/10 border-yellow-500/20"
                  )}
                >
                  {error.type === "error" ? (
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary">
                      Line {error.line}
                      {error.column && `, Column ${error.column}`}
                    </div>
                    <div className={cn(
                      "text-xs mt-0.5",
                      error.type === "error" ? "text-red-300" : "text-yellow-300"
                    )}>
                      {error.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!input && (
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          Paste {mode.toUpperCase()} code above to validate
        </div>
      )}
    </div>
  );
}

