import {
  X,
  FileCode,
  Share2,
  Twitter,
  Code2,
  Bot,
  FileText,
  Map,
  Languages,
  Link,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { SearchableToolSidebar } from "../shared/SearchableToolSidebar";
import { MetaTagsGenerator } from "./tools/MetaTagsGenerator";
import { OpenGraphGenerator } from "./tools/OpenGraphGenerator";
import { TwitterCardGenerator } from "./tools/TwitterCardGenerator";
import { StructuredDataGenerator } from "./tools/StructuredDataGenerator";
import { RobotsTxtGenerator } from "./tools/RobotsTxtGenerator";
import { LlmsTxtGenerator } from "./tools/LlmsTxtGenerator";
import { SitemapGenerator } from "./tools/SitemapGenerator";
import { HreflangGenerator } from "./tools/HreflangGenerator";
import { CanonicalUrlHelper } from "./tools/CanonicalUrlHelper";
import type { SeoTool } from "./types";

interface SeoToolsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  initialTool?: string;
}

interface ToolCategory {
  name: string;
  tools: SeoTool[];
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    name: "Meta Tags",
    tools: [
      { id: "meta-tags", name: "Meta Tags Generator", description: "Generate HTML meta tags with preview", icon: FileCode },
      { id: "open-graph", name: "Open Graph", description: "Generate Facebook/LinkedIn preview tags", icon: Share2 },
      { id: "twitter-card", name: "Twitter Card", description: "Generate Twitter card meta tags", icon: Twitter },
    ],
  },
  {
    name: "Structured Data",
    tools: [
      { id: "structured-data", name: "JSON-LD Generator", description: "Generate Schema.org structured data", icon: Code2 },
      { id: "canonical", name: "Canonical URL", description: "Generate canonical link tags", icon: Link },
    ],
  },
  {
    name: "Crawl Config",
    tools: [
      { id: "robots-txt", name: "Robots.txt", description: "Generate robots.txt file", icon: Bot },
      { id: "llms-txt", name: "LLMs.txt", description: "Generate AI-friendly site summary", icon: FileText },
      { id: "sitemap", name: "Sitemap", description: "Generate XML sitemap", icon: Map },
    ],
  },
  {
    name: "International",
    tools: [
      { id: "hreflang", name: "Hreflang Tags", description: "Generate multi-language tags", icon: Languages },
    ],
  },
];

const ALL_TOOLS = TOOL_CATEGORIES.flatMap((cat) => cat.tools);

export function SeoToolsPopup({ isOpen, onClose, initialTool }: SeoToolsPopupProps) {
  const [activeTool, setActiveTool] = useState("meta-tags");

  // Set initial tool when provided
  useEffect(() => {
    if (initialTool && ALL_TOOLS.some(t => t.id === initialTool)) {
      setActiveTool(initialTool);
    }
  }, [initialTool]);

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

  const activeToolData = ALL_TOOLS.find((t) => t.id === activeTool);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div className="w-[95vw] h-[90vh] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium text-text-primary">SEO Tools</span>
            {activeToolData && (
              <span className="text-sm text-text-tertiary">
                / {activeToolData.name}
              </span>
            )}
          </div>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onClose} aria-label="Close SEO tools">
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        <div className="flex flex-1 min-h-0">
          <SearchableToolSidebar
            categories={TOOL_CATEGORIES}
            activeToolId={activeTool}
            onToolSelect={setActiveTool}
            searchPlaceholder="Search..."
          />

          <ScrollArea className="flex-1" scrollbarVisibility="visible">
            <div className="h-full">
              {activeTool === "meta-tags" && <MetaTagsGenerator />}
              {activeTool === "open-graph" && <OpenGraphGenerator />}
              {activeTool === "twitter-card" && <TwitterCardGenerator />}
              {activeTool === "structured-data" && <StructuredDataGenerator />}
              {activeTool === "canonical" && <CanonicalUrlHelper />}
              {activeTool === "robots-txt" && <RobotsTxtGenerator />}
              {activeTool === "llms-txt" && <LlmsTxtGenerator />}
              {activeTool === "sitemap" && <SitemapGenerator />}
              {activeTool === "hreflang" && <HreflangGenerator />}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
