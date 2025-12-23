import { X, Braces, Binary, Link, Hash } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { JsonFormatter } from "./tools/JsonFormatter";
import { Base64Tool } from "./tools/Base64Tool";
import { UrlEncodeTool } from "./tools/UrlEncodeTool";
import { HashGenerator } from "./tools/HashGenerator";
import type { MiniTool } from "./types";

interface DevToolkitPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const MINI_TOOLS: MiniTool[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Format, minify, and validate JSON",
    icon: Braces,
  },
  {
    id: "base64",
    name: "Base64",
    description: "Encode and decode Base64 strings",
    icon: Binary,
  },
  {
    id: "url-encode",
    name: "URL Encode",
    description: "Encode and decode URLs",
    icon: Link,
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    description: "Generate MD5, SHA1, SHA256, SHA512 hashes",
    icon: Hash,
  },
];

export function DevToolkitPopup({ isOpen, onClose }: DevToolkitPopupProps) {
  const [activeTool, setActiveTool] = useState("json-formatter");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const activeToolData = MINI_TOOLS.find((t) => t.id === activeTool);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div className="w-[95vw] h-[90vh] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium text-text-primary">Dev Toolkit</span>
            {activeToolData && (
              <span className="text-sm text-text-tertiary">
                / {activeToolData.name}
              </span>
            )}
          </div>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-56 border-r border-border bg-bg-secondary p-2 flex flex-col">
            <div className="text-[10px] text-text-secondary/70 uppercase tracking-wider px-3 py-2">
              Text Tools
            </div>
            {MINI_TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                  activeTool === tool.id
                    ? "bg-bg-hover text-text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50"
                )}
              >
                <tool.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{tool.name}</span>
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1" scrollbarVisibility="visible">
            <div className="h-full">
              {activeTool === "json-formatter" && <JsonFormatter />}
              {activeTool === "base64" && <Base64Tool />}
              {activeTool === "url-encode" && <UrlEncodeTool />}
              {activeTool === "hash-generator" && <HashGenerator />}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
