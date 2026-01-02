import {
  X,
  Braces,
  Binary,
  Link,
  Hash,
  Key,
  Link2,
  Code2,
  GitCompare,
  QrCode,
  FileText,
  Type,
  Quote,
  Fingerprint,
  Tag,
  AlignLeft,
  Clock,
  FileJson,
  Table,
  Timer,
  Regex,
  Lock,
  KeyRound,
  Shield,
  Globe,
  Smartphone,
  Network,
  Calculator,
  HardDrive,
  ArrowUpDown,
  FileCode,
  Image,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { SearchableToolSidebar } from "../shared/SearchableToolSidebar";
import { JsonFormatter } from "./tools/JsonFormatter";
import { Base64Tool } from "./tools/Base64Tool";
import { UrlEncodeTool } from "./tools/UrlEncodeTool";
import { HashGenerator } from "./tools/HashGenerator";
import { JwtDebugger } from "./tools/JwtDebugger";
import { UrlParser } from "./tools/UrlParser";
import { HtmlEntityTool } from "./tools/HtmlEntityTool";
import { TextDiffTool } from "./tools/TextDiffTool";
import { QrCodeGenerator } from "./tools/QrCodeGenerator";
import { LoremIpsumGenerator } from "./tools/LoremIpsumGenerator";
import { CaseConverter } from "./tools/CaseConverter";
import { StringEscapeTool } from "./tools/StringEscapeTool";
import { UuidGenerator } from "./tools/UuidGenerator";
import { SlugGenerator } from "./tools/SlugGenerator";
import { WordCounter } from "./tools/WordCounter";
import { TimestampConverter } from "./tools/TimestampConverter";
import { JsonYamlConverter } from "./tools/JsonYamlConverter";
import { CsvJsonConverter } from "./tools/CsvJsonConverter";
import { CronParser } from "./tools/CronParser";
import { RegexTester } from "./tools/RegexTester";
import { PasswordGenerator } from "./tools/PasswordGenerator";
import { BcryptGenerator } from "./tools/BcryptGenerator";
import { HmacGenerator } from "./tools/HmacGenerator";
import { HttpStatusReference } from "./tools/HttpStatusReference";
import { UserAgentParser } from "./tools/UserAgentParser";
import { IpAddressTool } from "./tools/IpAddressTool";
import { NumberBaseConverter } from "./tools/NumberBaseConverter";
import { ByteSizeConverter } from "./tools/ByteSizeConverter";
import { ListSorterDeduplicator } from "./tools/ListSorterDeduplicator";
import { HtmlCssValidator } from "./tools/HtmlCssValidator";
import { ExifDataRemover } from "./tools/ExifDataRemover";
import { PlaceholderImageGenerator } from "./tools/PlaceholderImageGenerator";
import type { MiniTool } from "./types";

interface DevToolkitPopupProps {
  isOpen: boolean;
  onClose: () => void;
  initialTool?: string;
}

interface ToolCategory {
  name: string;
  tools: MiniTool[];
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    name: "Text Tools",
    tools: [
      { id: "json-formatter", name: "JSON Formatter", description: "Format, minify, and validate JSON", icon: Braces },
      { id: "base64", name: "Base64", description: "Encode and decode Base64 strings", icon: Binary },
      { id: "url-encode", name: "URL Encode", description: "Encode and decode URLs", icon: Link },
      { id: "html-entity", name: "HTML Entity", description: "Encode and decode HTML entities", icon: Code2 },
      { id: "string-escape", name: "String Escape", description: "Escape/unescape strings for JSON, SQL, etc", icon: Quote },
      { id: "text-diff", name: "Text Diff", description: "Compare two texts and see differences", icon: GitCompare },
      { id: "case-converter", name: "Case Converter", description: "Convert between camelCase, snake_case, etc", icon: Type },
      { id: "lorem-ipsum", name: "Lorem Ipsum", description: "Generate placeholder text", icon: FileText },
      { id: "slug-generator", name: "Slug Generator", description: "Create URL-friendly slugs", icon: Tag },
      { id: "word-counter", name: "Word Counter", description: "Count words, characters, reading time", icon: AlignLeft },
      { id: "list-sorter", name: "List Sorter", description: "Sort and deduplicate lists", icon: ArrowUpDown },
    ],
  },
  {
    name: "Data Formats",
    tools: [
      { id: "json-yaml", name: "JSON/YAML", description: "Convert between JSON and YAML", icon: FileJson },
      { id: "csv-json", name: "CSV/JSON", description: "Convert between CSV and JSON", icon: Table },
      { id: "timestamp", name: "Timestamp", description: "Convert Unix timestamps to dates", icon: Clock },
      { id: "cron-parser", name: "Cron Parser", description: "Explain cron expressions", icon: Timer },
      { id: "regex-tester", name: "Regex Tester", description: "Test regular expressions", icon: Regex },
    ],
  },
  {
    name: "Code",
    tools: [
      { id: "html-css-validator", name: "HTML/CSS Validator", description: "Validate HTML and CSS code", icon: FileCode },
    ],
  },
  {
    name: "Generators",
    tools: [
      { id: "uuid-generator", name: "UUID Generator", description: "Generate UUIDs (v4)", icon: Fingerprint },
      { id: "password-generator", name: "Password Generator", description: "Generate secure passwords", icon: Lock },
      { id: "qr-generator", name: "QR Generator", description: "Generate QR codes", icon: QrCode },
      { id: "placeholder-image", name: "Placeholder Image", description: "Generate placeholder images", icon: Image },
    ],
  },
  {
    name: "Image",
    tools: [
      { id: "exif-remover", name: "EXIF Remover", description: "Remove EXIF metadata from images", icon: Image },
    ],
  },
  {
    name: "Security",
    tools: [
      { id: "hash-generator", name: "Hash Generator", description: "Generate MD5, SHA hashes", icon: Hash },
      { id: "jwt-debugger", name: "JWT Debugger", description: "Decode and inspect JWT tokens", icon: Key },
      { id: "bcrypt-generator", name: "Bcrypt", description: "Hash and verify passwords", icon: KeyRound },
      { id: "hmac-generator", name: "HMAC Generator", description: "Generate HMAC signatures", icon: Shield },
    ],
  },
  {
    name: "Web & Network",
    tools: [
      { id: "url-parser", name: "URL Parser", description: "Parse URLs and extract components", icon: Link2 },
      { id: "http-status", name: "HTTP Status", description: "HTTP status code reference", icon: Globe },
      { id: "user-agent", name: "User Agent", description: "Parse user agent strings", icon: Smartphone },
      { id: "ip-address", name: "IP Address", description: "Analyze IP addresses", icon: Network },
    ],
  },
  {
    name: "Numbers",
    tools: [
      { id: "number-base", name: "Number Base", description: "Convert between binary, hex, decimal", icon: Calculator },
      { id: "byte-size", name: "Byte Size", description: "Convert KB, MB, GB, TB", icon: HardDrive },
    ],
  },
];

const ALL_TOOLS = TOOL_CATEGORIES.flatMap((cat) => cat.tools);

export function DevToolkitPopup({ isOpen, onClose, initialTool }: DevToolkitPopupProps) {
  const [activeTool, setActiveTool] = useState("json-formatter");

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
            <span className="font-medium text-text-primary">Dev Toolkit</span>
            {activeToolData && (
              <span className="text-sm text-text-tertiary">
                / {activeToolData.name}
              </span>
            )}
          </div>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onClose} aria-label="Close Dev Toolkit">
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
              {activeTool === "json-formatter" && <JsonFormatter />}
              {activeTool === "base64" && <Base64Tool />}
              {activeTool === "url-encode" && <UrlEncodeTool />}
              {activeTool === "html-entity" && <HtmlEntityTool />}
              {activeTool === "string-escape" && <StringEscapeTool />}
              {activeTool === "text-diff" && <TextDiffTool />}
              {activeTool === "case-converter" && <CaseConverter />}
              {activeTool === "lorem-ipsum" && <LoremIpsumGenerator />}
              {activeTool === "slug-generator" && <SlugGenerator />}
              {activeTool === "word-counter" && <WordCounter />}
              {activeTool === "list-sorter" && <ListSorterDeduplicator />}
              {activeTool === "json-yaml" && <JsonYamlConverter />}
              {activeTool === "csv-json" && <CsvJsonConverter />}
              {activeTool === "timestamp" && <TimestampConverter />}
              {activeTool === "cron-parser" && <CronParser />}
              {activeTool === "regex-tester" && <RegexTester />}
              {activeTool === "html-css-validator" && <HtmlCssValidator />}
              {activeTool === "uuid-generator" && <UuidGenerator />}
              {activeTool === "password-generator" && <PasswordGenerator />}
              {activeTool === "qr-generator" && <QrCodeGenerator />}
              {activeTool === "placeholder-image" && <PlaceholderImageGenerator />}
              {activeTool === "hash-generator" && <HashGenerator />}
              {activeTool === "jwt-debugger" && <JwtDebugger />}
              {activeTool === "bcrypt-generator" && <BcryptGenerator />}
              {activeTool === "hmac-generator" && <HmacGenerator />}
              {activeTool === "url-parser" && <UrlParser />}
              {activeTool === "http-status" && <HttpStatusReference />}
              {activeTool === "user-agent" && <UserAgentParser />}
              {activeTool === "ip-address" && <IpAddressTool />}
              {activeTool === "number-base" && <NumberBaseConverter />}
              {activeTool === "byte-size" && <ByteSizeConverter />}
              {activeTool === "exif-remover" && <ExifDataRemover />}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
