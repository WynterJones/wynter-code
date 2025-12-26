import { useState, useRef, useEffect, useMemo } from "react";
import {
  Wrench,
  Network,
  Package,
  Globe,
  Activity,
  Play,
  Key,
  Send,
  Search,
  FlaskConical,
  BookOpen,
  Server,
  Eye,
  CircleDot,
  Blocks,
  Image,
  Hammer,
  Tractor,
  BarChart3,
  Video,
  AtSign,
  MonitorPlay,
  FileCode,
  Upload,
  Bookmark,
  Bot,
  Music,
  Database,
  FolderPlus,
  FileSearch,
  CreditCard,
  Wheat,
  ChevronsUpDown,
  ChevronRight,
  // Mini-tool icons
  Braces,
  Binary,
  Link,
  Hash,
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
  Smartphone,
  Calculator,
  HardDrive,
  ArrowUpDown,
  ArrowRightLeft,
  MapPin,
  Radio,
  TrendingUp,
  Share2,
  Twitter,
  Map,
  Languages,
  type LucideIcon,
} from "lucide-react";
import { createPortal } from "react-dom";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  actionKey: string;
  category:
    | "code"
    | "testing"
    | "project"
    | "local-system"
    | "production"
    | "design"
    | "recording"
    | "web-tools"
    | "productivity"
    | "utilities";
  disabled?: boolean;
  /** Hide from dropdown (tool has dedicated icon in toolbar) but keep in command palette */
  hiddenInDropdown?: boolean;
  /** For sub-tools: parent tool action key (e.g., "openDevToolkit") */
  parentActionKey?: string;
  /** For sub-tools: the specific sub-tool ID to activate */
  subToolId?: string;
  /** Display group for command palette (e.g., "Developer Tools", "Domain Tools") */
  group?: string;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // === HIDDEN TOOLS (have dedicated icons in toolbars) ===
  // These still appear in command palette but are hidden from dropdown
  {
    id: "meditation",
    name: "Music / Meditation",
    description: "Ambient music & meditation",
    icon: Music,
    actionKey: "openMeditation",
    category: "productivity",
    hiddenInDropdown: true,
  },
  {
    id: "database-viewer",
    name: "Database Viewer",
    description: "Query SQLite, Postgres, MySQL",
    icon: Database,
    actionKey: "openDatabaseViewer",
    category: "code",
    hiddenInDropdown: true,
  },
  {
    id: "new-project",
    name: "New Project",
    description: "Create from templates",
    icon: FolderPlus,
    actionKey: "openProjectTemplates",
    category: "project",
    hiddenInDropdown: true,
  },
  {
    id: "file-finder",
    name: "File Finder",
    description: "Browse project files",
    icon: FileSearch,
    actionKey: "openFileFinder",
    category: "project",
    hiddenInDropdown: true,
  },
  {
    id: "project-search",
    name: "Project Search",
    description: "Search & replace in files",
    icon: Search,
    actionKey: "openProjectSearch",
    category: "project",
    hiddenInDropdown: true,
  },
  {
    id: "beads-tracker",
    name: "Beads Tracker",
    description: "Manage project issues",
    icon: CircleDot,
    actionKey: "openBeadsTracker",
    category: "project",
    hiddenInDropdown: true,
  },
  {
    id: "auto-build",
    name: "Auto Build",
    description: "Auto-work through issues",
    icon: Bot,
    actionKey: "openAutoBuild",
    category: "project",
    hiddenInDropdown: true,
  },
  {
    id: "farmwork",
    name: "Farmwork",
    description: "Audit & dev workflow",
    icon: Wheat,
    actionKey: "openFarmwork",
    category: "project",
    hiddenInDropdown: true,
  },

  // === CODE ===
  {
    id: "live-preview",
    name: "Live Preview",
    description: "Preview in browser",
    icon: Play,
    actionKey: "openLivePreview",
    category: "code",
    hiddenInDropdown: true,
  },
  {
    id: "storybook-viewer",
    name: "Storybook Viewer",
    description: "Browse Storybook components",
    icon: BookOpen,
    actionKey: "openStorybookViewer",
    category: "code",
  },
  {
    id: "claude-code-stats",
    name: "Claude Code Stats",
    description: "CLI usage analytics",
    icon: BarChart3,
    actionKey: "openClaudeCodeStats",
    category: "code",
  },

  // === TESTING ===
  {
    id: "test-runner",
    name: "Test Runner",
    description: "Run and view test results",
    icon: FlaskConical,
    actionKey: "openTestRunner",
    category: "testing",
  },
  {
    id: "api-tester",
    name: "API Tester",
    description: "Test HTTP APIs",
    icon: Send,
    actionKey: "openApiTester",
    category: "testing",
  },

  // === PROJECT ===
  {
    id: "farmwork-tycoon",
    name: "Farmwork Tycoon",
    description: "CLI activity as farm game",
    icon: Tractor,
    actionKey: "openFarmworkTycoon",
    category: "project",
    hiddenInDropdown: true,
  },

  // === LOCAL SYSTEM ===
  {
    id: "port-manager",
    name: "Port Manager",
    description: "Manage localhost ports",
    icon: Network,
    actionKey: "openPortManager",
    category: "local-system",
  },
  {
    id: "localhost-tunnel",
    name: "Localhost Tunnel",
    description: "Share localhost publicly",
    icon: Globe,
    actionKey: "openLocalhostTunnel",
    category: "local-system",
  },
  {
    id: "background-services",
    name: "Background Services",
    description: "Manage dev services",
    icon: Server,
    actionKey: "openBackgroundServices",
    category: "local-system",
  },
  {
    id: "system-health",
    name: "System Health",
    description: "Dev tools & resources",
    icon: Activity,
    actionKey: "openSystemHealth",
    category: "local-system",
  },

  // === PRODUCTION ===
  {
    id: "overwatch",
    name: "Overwatch",
    description: "Monitor prod services",
    icon: Eye,
    actionKey: "openOverwatch",
    category: "production",
    hiddenInDropdown: true,
  },
  {
    id: "netlify-ftp",
    name: "Netlify FTP",
    description: "Deploy with retro FTP",
    icon: Upload,
    actionKey: "openNetlifyFtp",
    category: "production",
  },
  {
    id: "web-backup",
    name: "Web Backup",
    description: "Encrypted cloud backup settings",
    icon: Lock,
    actionKey: "openWebBackup",
    category: "production",
  },

  // === DESIGN ===
  {
    id: "favicon-generator",
    name: "Favicon Generator",
    description: "Generate favicons",
    icon: Image,
    actionKey: "openFaviconGenerator",
    category: "design",
  },

  // === RECORDING ===
  {
    id: "floating-webcam",
    name: "Floating Webcam",
    description: "Webcam with AI effects",
    icon: Video,
    actionKey: "openFloatingWebcam",
    category: "recording",
  },
  {
    id: "screen-studio",
    name: "Screen Studio",
    description: "Cinematic screen recorder",
    icon: MonitorPlay,
    actionKey: "openScreenStudio",
    category: "recording",
  },
  {
    id: "gif-recorder",
    name: "GIF Screen Recorder",
    description: "Record screen as GIF",
    icon: Image,
    actionKey: "openGifRecorder",
    category: "recording",
  },

  // === TOOLKITS ===
  {
    id: "dev-toolkit",
    name: "Developer Tools",
    description: "Text & encoding utilities",
    icon: Hammer,
    actionKey: "openDevToolkit",
    category: "web-tools",
  },
  {
    id: "domain-tools",
    name: "Domain Tools",
    description: "WHOIS, DNS & SSL checks",
    icon: AtSign,
    actionKey: "openDomainTools",
    category: "web-tools",
  },
  {
    id: "seo-tools",
    name: "SEO Tools",
    description: "Meta tags & Open Graph",
    icon: FileCode,
    actionKey: "openSeoTools",
    category: "web-tools",
  },

  // === PRODUCTIVITY ===
  {
    id: "bookmarks",
    name: "Bookmarks",
    description: "Manage your bookmarks",
    icon: Bookmark,
    actionKey: "openBookmarks",
    category: "productivity",
    hiddenInDropdown: true,
  },
  {
    id: "subscription-manager",
    name: "Subscription Manager",
    description: "Track subscriptions",
    icon: CreditCard,
    actionKey: "openSubscriptions",
    category: "productivity",
    hiddenInDropdown: true,
  },

  // === UTILITIES ===
  {
    id: "mcp-manager",
    name: "MCP Servers",
    description: "Manage MCP servers",
    icon: Blocks,
    actionKey: "openMcpManager",
    category: "utilities",
  },
  {
    id: "env-manager",
    name: "Environment Variables",
    description: "Manage .env & secrets",
    icon: Key,
    actionKey: "openEnvManager",
    category: "utilities",
  },
  {
    id: "node-modules-cleaner",
    name: "Node Modules Cleaner",
    description: "Clean node_modules",
    icon: Package,
    actionKey: "openNodeModulesCleaner",
    category: "utilities",
  },
  {
    id: "just-command-manager",
    name: "Just Command Manager",
    description: "Manage justfile recipes",
    icon: Play,
    actionKey: "openJustCommandManager",
    category: "utilities",
  },

  // === DEV TOOLKIT MINI-TOOLS ===
  { id: "dt-json-formatter", name: "JSON Formatter", description: "Format & validate JSON", icon: Braces, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "json-formatter", group: "Developer Tools" },
  { id: "dt-base64", name: "Base64 Encoder", description: "Encode/decode Base64", icon: Binary, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "base64", group: "Developer Tools" },
  { id: "dt-url-encode", name: "URL Encoder", description: "Encode/decode URLs", icon: Link, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "url-encode", group: "Developer Tools" },
  { id: "dt-html-entity", name: "HTML Entity", description: "Encode/decode HTML", icon: Code2, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "html-entity", group: "Developer Tools" },
  { id: "dt-string-escape", name: "String Escape", description: "Escape strings", icon: Quote, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "string-escape", group: "Developer Tools" },
  { id: "dt-text-diff", name: "Text Diff", description: "Compare two texts", icon: GitCompare, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "text-diff", group: "Developer Tools" },
  { id: "dt-case-converter", name: "Case Converter", description: "Convert text case", icon: Type, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "case-converter", group: "Developer Tools" },
  { id: "dt-lorem-ipsum", name: "Lorem Ipsum", description: "Generate placeholder", icon: FileText, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "lorem-ipsum", group: "Developer Tools" },
  { id: "dt-slug-generator", name: "Slug Generator", description: "Create URL slugs", icon: Tag, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "slug-generator", group: "Developer Tools" },
  { id: "dt-word-counter", name: "Word Counter", description: "Count words & chars", icon: AlignLeft, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "word-counter", group: "Developer Tools" },
  { id: "dt-list-sorter", name: "List Sorter", description: "Sort & dedupe lists", icon: ArrowUpDown, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "list-sorter", group: "Developer Tools" },
  { id: "dt-json-yaml", name: "JSON/YAML Converter", description: "Convert JSON ↔ YAML", icon: FileJson, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "json-yaml", group: "Developer Tools" },
  { id: "dt-csv-json", name: "CSV/JSON Converter", description: "Convert CSV ↔ JSON", icon: Table, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "csv-json", group: "Developer Tools" },
  { id: "dt-timestamp", name: "Timestamp Converter", description: "Unix ↔ date", icon: Clock, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "timestamp", group: "Developer Tools" },
  { id: "dt-cron-parser", name: "Cron Parser", description: "Explain cron syntax", icon: Timer, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "cron-parser", group: "Developer Tools" },
  { id: "dt-regex-tester", name: "Regex Tester", description: "Test regular expressions", icon: Regex, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "regex-tester", group: "Developer Tools" },
  { id: "dt-uuid-generator", name: "UUID Generator", description: "Generate UUIDs", icon: Fingerprint, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "uuid-generator", group: "Developer Tools" },
  { id: "dt-password-generator", name: "Password Generator", description: "Secure passwords", icon: Lock, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "password-generator", group: "Developer Tools" },
  { id: "dt-qr-generator", name: "QR Code Generator", description: "Generate QR codes", icon: QrCode, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "qr-generator", group: "Developer Tools" },
  { id: "dt-placeholder-image", name: "Placeholder Image", description: "Generate placeholders", icon: Image, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "placeholder-image", group: "Developer Tools" },
  { id: "dt-hash-generator", name: "Hash Generator", description: "MD5, SHA hashes", icon: Hash, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "hash-generator", group: "Developer Tools" },
  { id: "dt-jwt-debugger", name: "JWT Debugger", description: "Decode JWT tokens", icon: Key, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "jwt-debugger", group: "Developer Tools" },
  { id: "dt-bcrypt-generator", name: "Bcrypt Generator", description: "Hash passwords", icon: KeyRound, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "bcrypt-generator", group: "Developer Tools" },
  { id: "dt-hmac-generator", name: "HMAC Generator", description: "HMAC signatures", icon: Shield, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "hmac-generator", group: "Developer Tools" },
  { id: "dt-url-parser", name: "URL Parser", description: "Parse URL parts", icon: Link2, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "url-parser", group: "Developer Tools" },
  { id: "dt-http-status", name: "HTTP Status Codes", description: "Status reference", icon: Globe, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "http-status", group: "Developer Tools" },
  { id: "dt-user-agent", name: "User Agent Parser", description: "Parse user agents", icon: Smartphone, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "user-agent", group: "Developer Tools" },
  { id: "dt-ip-address", name: "IP Address Tool", description: "Analyze IPs", icon: Network, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "ip-address", group: "Developer Tools" },
  { id: "dt-number-base", name: "Number Base Converter", description: "Hex, binary, decimal", icon: Calculator, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "number-base", group: "Developer Tools" },
  { id: "dt-byte-size", name: "Byte Size Converter", description: "KB, MB, GB, TB", icon: HardDrive, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "byte-size", group: "Developer Tools" },
  { id: "dt-html-css-validator", name: "HTML/CSS Validator", description: "Validate code", icon: FileCode, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "html-css-validator", group: "Developer Tools" },
  { id: "dt-exif-remover", name: "EXIF Remover", description: "Remove image metadata", icon: Image, actionKey: "openDevToolkit", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDevToolkit", subToolId: "exif-remover", group: "Developer Tools" },

  // === DOMAIN TOOLS MINI-TOOLS ===
  { id: "dom-whois", name: "WHOIS Lookup", description: "Domain registration", icon: FileSearch, actionKey: "openDomainTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDomainTools", subToolId: "whois", group: "Domain Tools" },
  { id: "dom-availability", name: "Domain Availability", description: "Check if registered", icon: Globe, actionKey: "openDomainTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDomainTools", subToolId: "availability", group: "Domain Tools" },
  { id: "dom-dns", name: "DNS Lookup", description: "Query DNS records", icon: Server, actionKey: "openDomainTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDomainTools", subToolId: "dns", group: "Domain Tools" },
  { id: "dom-propagation", name: "DNS Propagation", description: "Global DNS check", icon: Radio, actionKey: "openDomainTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDomainTools", subToolId: "propagation", group: "Domain Tools" },
  { id: "dom-ssl", name: "SSL Certificate", description: "Check SSL details", icon: Shield, actionKey: "openDomainTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDomainTools", subToolId: "ssl", group: "Domain Tools" },
  { id: "dom-headers", name: "HTTP Headers", description: "Inspect headers", icon: FileSearch, actionKey: "openDomainTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDomainTools", subToolId: "headers", group: "Domain Tools" },
  { id: "dom-ip", name: "IP Address Lookup", description: "Geolocation & ISP", icon: MapPin, actionKey: "openDomainTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDomainTools", subToolId: "ip", group: "Domain Tools" },
  { id: "dom-redirect", name: "Redirect Tracker", description: "Follow redirects", icon: ArrowRightLeft, actionKey: "openDomainTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDomainTools", subToolId: "redirect", group: "Domain Tools" },
  { id: "dom-dead-links", name: "Dead Link Checker", description: "Find broken links", icon: Link2, actionKey: "openDomainTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDomainTools", subToolId: "dead-links", group: "Domain Tools" },
  { id: "dom-lighthouse", name: "Lighthouse Auditor", description: "Run audits", icon: TrendingUp, actionKey: "openDomainTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDomainTools", subToolId: "lighthouse", group: "Domain Tools" },
  { id: "dom-favicon", name: "Favicon Grabber", description: "Extract favicons", icon: Image, actionKey: "openDomainTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openDomainTools", subToolId: "favicon-grabber", group: "Domain Tools" },

  // === SEO TOOLS MINI-TOOLS ===
  { id: "seo-meta-tags", name: "Meta Tags Generator", description: "Generate meta tags", icon: FileCode, actionKey: "openSeoTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openSeoTools", subToolId: "meta-tags", group: "SEO Tools" },
  { id: "seo-open-graph", name: "Open Graph Generator", description: "Facebook/LinkedIn", icon: Share2, actionKey: "openSeoTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openSeoTools", subToolId: "open-graph", group: "SEO Tools" },
  { id: "seo-twitter-card", name: "Twitter Card Generator", description: "Twitter cards", icon: Twitter, actionKey: "openSeoTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openSeoTools", subToolId: "twitter-card", group: "SEO Tools" },
  { id: "seo-structured-data", name: "JSON-LD Generator", description: "Schema.org data", icon: Code2, actionKey: "openSeoTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openSeoTools", subToolId: "structured-data", group: "SEO Tools" },
  { id: "seo-canonical", name: "Canonical URL Helper", description: "Canonical links", icon: Link, actionKey: "openSeoTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openSeoTools", subToolId: "canonical", group: "SEO Tools" },
  { id: "seo-robots-txt", name: "Robots.txt Generator", description: "Generate robots.txt", icon: Bot, actionKey: "openSeoTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openSeoTools", subToolId: "robots-txt", group: "SEO Tools" },
  { id: "seo-llms-txt", name: "LLMs.txt Generator", description: "AI-friendly summary", icon: FileText, actionKey: "openSeoTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openSeoTools", subToolId: "llms-txt", group: "SEO Tools" },
  { id: "seo-sitemap", name: "Sitemap Generator", description: "XML sitemap", icon: Map, actionKey: "openSeoTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openSeoTools", subToolId: "sitemap", group: "SEO Tools" },
  { id: "seo-hreflang", name: "Hreflang Generator", description: "Multi-language tags", icon: Languages, actionKey: "openSeoTools", category: "web-tools", hiddenInDropdown: true, parentActionKey: "openSeoTools", subToolId: "hreflang", group: "SEO Tools" },
];

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  category:
    | "code"
    | "testing"
    | "project"
    | "local-system"
    | "production"
    | "design"
    | "recording"
    | "web-tools"
    | "productivity"
    | "utilities";
  disabled?: boolean;
  hiddenInDropdown?: boolean;
}

interface ToolCategory {
  id: Tool["category"];
  label: string;
  tools: Tool[];
}

interface ToolsDropdownProps {
  onOpenProjectSearch: () => void;
  onOpenPortManager: () => void;
  onOpenNodeModulesCleaner: () => void;
  onOpenLocalhostTunnel: () => void;
  onOpenSystemHealth: () => void;
  onOpenLivePreview: () => void;
  onOpenEnvManager: () => void;
  onOpenApiTester: () => void;
  onOpenTestRunner: () => void;
  onOpenStorybookViewer: () => void;
  onOpenBackgroundServices: () => void;
  onOpenOverwatch: () => void;
  onOpenMcpManager: () => void;
  onOpenFaviconGenerator: () => void;
  onOpenDevToolkit: () => void;
  onOpenClaudeCodeStats: () => void;
  onOpenDomainTools: () => void;
  onOpenSeoTools: () => void;
  onOpenFloatingWebcam: () => void;
  onOpenScreenStudio: () => void;
  onOpenNetlifyFtp: () => void;
  onOpenGifRecorder: () => void;
  onOpenBookmarks: () => void;
  onOpenMeditation: () => void;
  onOpenDatabaseViewer: () => void;
  onOpenProjectTemplates: () => void;
  onOpenFileFinder: () => void;
  onOpenSubscriptions: () => void;
  onOpenFarmwork: () => void;
  onOpenJustCommandManager: () => void;
  hasStorybook?: boolean;
  hasJustfile?: boolean;
}

export function ToolsDropdown({
  onOpenProjectSearch,
  onOpenPortManager,
  onOpenNodeModulesCleaner,
  onOpenLocalhostTunnel,
  onOpenSystemHealth,
  onOpenLivePreview,
  onOpenEnvManager,
  onOpenApiTester,
  onOpenTestRunner,
  onOpenStorybookViewer,
  onOpenBackgroundServices,
  onOpenOverwatch,
  onOpenMcpManager,
  onOpenFaviconGenerator,
  onOpenDevToolkit,
  onOpenClaudeCodeStats,
  onOpenDomainTools,
  onOpenSeoTools,
  onOpenFloatingWebcam,
  onOpenScreenStudio,
  onOpenNetlifyFtp,
  onOpenGifRecorder,
  onOpenBookmarks,
  onOpenMeditation,
  onOpenDatabaseViewer,
  onOpenProjectTemplates,
  onOpenFileFinder,
  onOpenSubscriptions,
  onOpenFarmwork,
  onOpenJustCommandManager,
  hasStorybook = false,
  hasJustfile = false,
}: ToolsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("tools-dropdown-collapsed");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const toolButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tools-dropdown-collapsed", JSON.stringify([...collapsedCategories]));
    } catch {
      // Ignore storage errors
    }
  }, [collapsedCategories]);

  const tools: Tool[] = [
    // === HIDDEN TOOLS (have dedicated icons in toolbars) ===
    {
      id: "meditation",
      name: "Music / Meditation",
      description: "Ambient music & meditation",
      icon: <Music className="w-4 h-4" />,
      category: "productivity",
      hiddenInDropdown: true,
      onClick: () => {
        onOpenMeditation();
        setIsOpen(false);
      },
    },
    {
      id: "database-viewer",
      name: "Database Viewer",
      description: "Query SQLite, Postgres, MySQL",
      icon: <Database className="w-4 h-4" />,
      category: "code",
      hiddenInDropdown: true,
      onClick: () => {
        onOpenDatabaseViewer();
        setIsOpen(false);
      },
    },
    {
      id: "new-project",
      name: "New Project",
      description: "Create from templates",
      icon: <FolderPlus className="w-4 h-4" />,
      category: "project",
      hiddenInDropdown: true,
      onClick: () => {
        onOpenProjectTemplates();
        setIsOpen(false);
      },
    },
    {
      id: "file-finder",
      name: "File Finder",
      description: "Browse project files",
      icon: <FileSearch className="w-4 h-4" />,
      category: "project",
      hiddenInDropdown: true,
      onClick: () => {
        onOpenFileFinder();
        setIsOpen(false);
      },
    },
    {
      id: "project-search",
      name: "Project Search",
      description: "Search & replace in files",
      icon: <Search className="w-4 h-4" />,
      category: "project",
      hiddenInDropdown: true,
      onClick: () => {
        onOpenProjectSearch();
        setIsOpen(false);
      },
    },
    {
      id: "beads-tracker",
      name: "Beads Tracker",
      description: "Manage project issues",
      icon: <CircleDot className="w-4 h-4" />,
      category: "project",
      hiddenInDropdown: true,
      onClick: () => {
        window.dispatchEvent(
          new CustomEvent("command-palette-tool", {
            detail: { action: "openBeadsTracker" },
          })
        );
        setIsOpen(false);
      },
    },
    {
      id: "auto-build",
      name: "Auto Build",
      description: "Auto-work through issues",
      icon: <Bot className="w-4 h-4" />,
      category: "project",
      hiddenInDropdown: true,
      onClick: () => {
        window.dispatchEvent(
          new CustomEvent("command-palette-tool", {
            detail: { action: "openAutoBuild" },
          })
        );
        setIsOpen(false);
      },
    },
    {
      id: "farmwork",
      name: "Farmwork",
      description: "Audit & dev workflow",
      icon: <Wheat className="w-4 h-4" />,
      category: "project",
      hiddenInDropdown: true,
      onClick: () => {
        onOpenFarmwork();
        setIsOpen(false);
      },
    },

    // === CODE ===
    {
      id: "live-preview",
      name: "Live Preview",
      description: "Preview in browser",
      icon: <Play className="w-4 h-4" />,
      category: "code",
      hiddenInDropdown: true,
      onClick: () => {
        onOpenLivePreview();
        setIsOpen(false);
      },
    },
    {
      id: "storybook-viewer",
      name: "Storybook Viewer",
      description: hasStorybook
        ? "Browse Storybook components"
        : "Storybook not detected",
      icon: <BookOpen className="w-4 h-4" />,
      category: "code",
      onClick: () => {
        if (!hasStorybook) return;
        onOpenStorybookViewer();
        setIsOpen(false);
      },
      disabled: !hasStorybook,
    },
    {
      id: "claude-code-stats",
      name: "Claude Code Stats",
      description: "CLI usage analytics",
      icon: <BarChart3 className="w-4 h-4" />,
      category: "code",
      onClick: () => {
        onOpenClaudeCodeStats();
        setIsOpen(false);
      },
    },

    // === TESTING ===
    {
      id: "test-runner",
      name: "Test Runner",
      description: "Run and view test results",
      icon: <FlaskConical className="w-4 h-4" />,
      category: "testing",
      onClick: () => {
        onOpenTestRunner();
        setIsOpen(false);
      },
    },
    {
      id: "api-tester",
      name: "API Tester",
      description: "Test HTTP APIs",
      icon: <Send className="w-4 h-4" />,
      category: "testing",
      onClick: () => {
        onOpenApiTester();
        setIsOpen(false);
      },
    },

    // === PROJECT ===
    {
      id: "farmwork-tycoon",
      name: "Farmwork Tycoon",
      description: "CLI activity as farm game",
      icon: <Tractor className="w-4 h-4" />,
      category: "project",
      hiddenInDropdown: true,
      onClick: () => {
        window.dispatchEvent(
          new CustomEvent("command-palette-tool", {
            detail: { action: "openFarmworkTycoon" },
          })
        );
        setIsOpen(false);
      },
    },

    // === LOCAL SYSTEM ===
    {
      id: "port-manager",
      name: "Port Manager",
      description: "Manage localhost ports",
      icon: <Network className="w-4 h-4" />,
      category: "local-system",
      onClick: () => {
        onOpenPortManager();
        setIsOpen(false);
      },
    },
    {
      id: "localhost-tunnel",
      name: "Localhost Tunnel",
      description: "Share localhost publicly",
      icon: <Globe className="w-4 h-4" />,
      category: "local-system",
      onClick: () => {
        onOpenLocalhostTunnel();
        setIsOpen(false);
      },
    },
    {
      id: "background-services",
      name: "Background Services",
      description: "Manage dev services",
      icon: <Server className="w-4 h-4" />,
      category: "local-system",
      onClick: () => {
        onOpenBackgroundServices();
        setIsOpen(false);
      },
    },
    {
      id: "system-health",
      name: "System Health",
      description: "Dev tools & resources",
      icon: <Activity className="w-4 h-4" />,
      category: "local-system",
      onClick: () => {
        onOpenSystemHealth();
        setIsOpen(false);
      },
    },

    // === PRODUCTION ===
    {
      id: "overwatch",
      name: "Overwatch",
      description: "Monitor prod services",
      icon: <Eye className="w-4 h-4" />,
      category: "production",
      hiddenInDropdown: true,
      onClick: () => {
        onOpenOverwatch();
        setIsOpen(false);
      },
    },
    {
      id: "netlify-ftp",
      name: "Netlify FTP",
      description: "Deploy with retro FTP",
      icon: <Upload className="w-4 h-4" />,
      category: "production",
      onClick: () => {
        onOpenNetlifyFtp();
        setIsOpen(false);
      },
    },

    // === DESIGN ===
    {
      id: "favicon-generator",
      name: "Favicon Generator",
      description: "Generate favicons",
      icon: <Image className="w-4 h-4" />,
      category: "design",
      onClick: () => {
        onOpenFaviconGenerator();
        setIsOpen(false);
      },
    },

    // === RECORDING ===
    {
      id: "floating-webcam",
      name: "Floating Webcam",
      description: "Webcam with AI effects",
      icon: <Video className="w-4 h-4" />,
      category: "recording",
      onClick: () => {
        onOpenFloatingWebcam();
        setIsOpen(false);
      },
    },
    {
      id: "screen-studio",
      name: "Screen Studio",
      description: "Cinematic screen recorder",
      icon: <MonitorPlay className="w-4 h-4" />,
      category: "recording",
      onClick: () => {
        onOpenScreenStudio();
        setIsOpen(false);
      },
    },
    {
      id: "gif-recorder",
      name: "GIF Screen Recorder",
      description: "Record screen as GIF",
      icon: <Image className="w-4 h-4" />,
      category: "recording",
      onClick: () => {
        onOpenGifRecorder();
        setIsOpen(false);
      },
    },

    // === TOOLKITS ===
    {
      id: "dev-toolkit",
      name: "Developer Tools",
      description: "Text & encoding utilities",
      icon: <Hammer className="w-4 h-4" />,
      category: "web-tools",
      onClick: () => {
        onOpenDevToolkit();
        setIsOpen(false);
      },
    },
    {
      id: "domain-tools",
      name: "Domain Tools",
      description: "WHOIS, DNS & SSL checks",
      icon: <AtSign className="w-4 h-4" />,
      category: "web-tools",
      onClick: () => {
        onOpenDomainTools();
        setIsOpen(false);
      },
    },
    {
      id: "seo-tools",
      name: "SEO Tools",
      description: "Meta tags & Open Graph",
      icon: <FileCode className="w-4 h-4" />,
      category: "web-tools",
      onClick: () => {
        onOpenSeoTools();
        setIsOpen(false);
      },
    },

    // === PRODUCTIVITY ===
    {
      id: "bookmarks",
      name: "Bookmarks",
      description: "Manage your bookmarks",
      icon: <Bookmark className="w-4 h-4" />,
      category: "productivity",
      hiddenInDropdown: true,
      onClick: () => {
        onOpenBookmarks();
        setIsOpen(false);
      },
    },
    {
      id: "subscription-manager",
      name: "Subscription Manager",
      description: "Track subscriptions",
      icon: <CreditCard className="w-4 h-4" />,
      category: "productivity",
      hiddenInDropdown: true,
      onClick: () => {
        onOpenSubscriptions();
        setIsOpen(false);
      },
    },

    // === UTILITIES ===
    {
      id: "mcp-manager",
      name: "MCP Servers",
      description: "Manage MCP servers",
      icon: <Blocks className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenMcpManager();
        setIsOpen(false);
      },
    },
    {
      id: "env-manager",
      name: "Environment Variables",
      description: "Manage .env & secrets",
      icon: <Key className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenEnvManager();
        setIsOpen(false);
      },
    },
    {
      id: "node-modules-cleaner",
      name: "Node Modules Cleaner",
      description: "Clean up node_modules folders",
      icon: <Package className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        onOpenNodeModulesCleaner();
        setIsOpen(false);
      },
    },
    {
      id: "just-command-manager",
      name: "Just Command Manager",
      description: hasJustfile
        ? "Manage justfile recipes"
        : "Justfile not detected",
      icon: <Play className="w-4 h-4" />,
      category: "utilities",
      onClick: () => {
        if (!hasJustfile) return;
        onOpenJustCommandManager();
        setIsOpen(false);
      },
      disabled: !hasJustfile,
    },
  ];

  // Filter tools based on search query and hiddenInDropdown flag
  const filteredTools = useMemo(() => {
    // First filter out hidden tools (unless searching)
    const visibleTools = searchQuery.trim()
      ? tools // Show all tools when searching (including hidden ones)
      : tools.filter((tool) => !tool.hiddenInDropdown);

    if (!searchQuery.trim()) return visibleTools;

    const query = searchQuery.toLowerCase();
    return visibleTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query),
    );
  }, [searchQuery, tools]);

  // Group tools by category
  const categories: ToolCategory[] = useMemo(() => {
    const categoryOrder: Array<{ id: ToolCategory["id"]; label: string }> = [
      { id: "code", label: "Code" },
      { id: "testing", label: "Testing" },
      { id: "project", label: "Project" },
      { id: "local-system", label: "Local System" },
      { id: "production", label: "Production" },
      { id: "design", label: "Design" },
      { id: "recording", label: "Recording" },
      { id: "web-tools", label: "Toolkits" },
      { id: "productivity", label: "Productivity" },
      { id: "utilities", label: "Utilities" },
    ];

    return categoryOrder
      .map((cat) => ({
        ...cat,
        tools: filteredTools.filter((tool) => tool.category === cat.id),
      }))
      .filter((cat) => cat.tools.length > 0);
  }, [filteredTools]);

  // Create flat list of navigable tools (respecting collapsed categories)
  const navigableTools = useMemo(() => {
    const result: Tool[] = [];
    for (const category of categories) {
      if (!collapsedCategories.has(category.id)) {
        for (const tool of category.tools) {
          if (!tool.disabled) {
            result.push(tool);
          }
        }
      }
    }
    return result;
  }, [categories, collapsedCategories]);

  // Reset highlighted index when search changes or navigable tools change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, navigableTools.length]);

  // Scroll highlighted tool into view
  useEffect(() => {
    if (navigableTools.length > 0 && highlightedIndex >= 0) {
      const tool = navigableTools[highlightedIndex];
      if (tool) {
        const button = toolButtonRefs.current[tool.id];
        button?.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, navigableTools]);

  // Category collapse logic
  const allCollapsed = collapsedCategories.size === categories.length && categories.length > 0;

  const toggleAllCategories = () => {
    if (allCollapsed) {
      setCollapsedCategories(new Set());
    } else {
      setCollapsedCategories(new Set(categories.map((c) => c.id)));
    }
  };

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Autofocus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the DOM is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
      // Reset highlighted index when opening
      setHighlightedIndex(0);
    } else {
      // Reset search when closing
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < navigableTools.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const tool = navigableTools[highlightedIndex];
        if (tool && !tool.disabled) {
          tool.onClick();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, highlightedIndex, navigableTools]);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.right - 254,
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <Tooltip content="Tools">
        <button
          ref={buttonRef}
          onClick={handleToggle}
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors",
            "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
            isOpen && "bg-bg-hover text-text-primary",
          )}
        >
          <Wrench className="w-4 h-4" />
        </button>
      </Tooltip>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] w-64 bg-bg-secondary border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            {/* Search Input */}
            <div className="p-2 border-b border-border">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-bg-primary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  />
                </div>
                <Tooltip content={allCollapsed ? "Expand all" : "Collapse all"}>
                  <button
                    onClick={toggleAllCategories}
                    className={cn(
                      "p-1.5 rounded-md border border-border transition-colors",
                      allCollapsed
                        ? "bg-accent/10 text-accent border-accent/30"
                        : "bg-bg-primary text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                    )}
                  >
                    <ChevronsUpDown className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Tools List */}
            <OverlayScrollbarsComponent
              options={{
                scrollbars: {
                  theme: "os-theme-custom",
                  autoHide: "leave",
                  autoHideDelay: 100,
                },
              }}
              className="max-h-[400px] os-theme-custom"
            >
              <div>
                {categories.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-text-secondary text-center">
                    No tools found
                  </div>
                ) : (
                  categories.map((category) => {
                    const isCollapsed = collapsedCategories.has(category.id);
                    return (
                      <div key={category.id}>
                        {/* Category Header - full width, darker bg */}
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider bg-black/20 hover:bg-black/30 border-y border-border/50 transition-colors"
                        >
                          <ChevronRight
                            className={cn(
                              "w-3 h-3 transition-transform",
                              !isCollapsed && "rotate-90"
                            )}
                          />
                          <span>{category.label}</span>
                          <span className="ml-auto text-[10px] opacity-60">
                            {category.tools.length}
                          </span>
                        </button>
                        {/* Category Tools */}
                        {!isCollapsed && (
                          <div className="py-1">
                            {category.tools.map((tool) => {
                              const toolIndex = navigableTools.findIndex(
                                (t) => t.id === tool.id
                              );
                              const isHighlighted =
                                toolIndex !== -1 && toolIndex === highlightedIndex;
                              return (
                                <Tooltip
                                  key={tool.id}
                                  content={tool.description}
                                  side="left"
                                  wrapperClassName="block w-full"
                                >
                                  <button
                                    ref={(el) => {
                                      toolButtonRefs.current[tool.id] = el;
                                    }}
                                    onClick={tool.onClick}
                                    disabled={tool.disabled}
                                    onMouseEnter={() => {
                                      if (toolIndex !== -1) {
                                        setHighlightedIndex(toolIndex);
                                      }
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors group",
                                      tool.disabled
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:bg-bg-hover",
                                      isHighlighted &&
                                        !tool.disabled &&
                                        "bg-accent/20",
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "flex-shrink-0 text-text-secondary transition-colors",
                                        !tool.disabled && "group-hover:text-accent",
                                        isHighlighted && !tool.disabled && "text-accent",
                                      )}
                                    >
                                      {tool.icon}
                                    </div>
                                    <span className="text-[13px] font-medium text-text-primary truncate">
                                      {tool.name}
                                    </span>
                                  </button>
                                </Tooltip>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </OverlayScrollbarsComponent>
          </div>,
          document.body,
        )}
    </>
  );
}
