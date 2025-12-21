import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  children: string;
  language?: string;
}

export function CodeBlock({ children, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden bg-bg-tertiary border border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-hover border-b border-border">
        <span className="text-xs text-text-secondary font-mono">
          {language || "plaintext"}
        </span>
        <IconButton
          size="sm"
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-accent-green" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </IconButton>
      </div>

      <pre
        className={cn(
          "p-3 overflow-x-auto text-sm font-mono",
          "text-text-primary leading-relaxed"
        )}
      >
        <code>{children}</code>
      </pre>
    </div>
  );
}
