import {
  X,
  Globe,
  Server,
  Shield,
  FileSearch,
  ArrowRightLeft,
  MapPin,
  Radio,
  Link2,
  TrendingUp,
  Image,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { SearchableToolSidebar } from "../shared/SearchableToolSidebar";
import { WhoisLookup } from "./tools/WhoisLookup";
import { DnsLookup } from "./tools/DnsLookup";
import { SslChecker } from "./tools/SslChecker";
import { HttpHeadersInspector } from "./tools/HttpHeadersInspector";
import { DomainAvailability } from "./tools/DomainAvailability";
import { IpAddressLookup } from "./tools/IpAddressLookup";
import { RedirectTracker } from "./tools/RedirectTracker";
import { DnsPropagation } from "./tools/DnsPropagation";
import { DeadLinkChecker } from "./tools/DeadLinkChecker";
import { LighthouseAuditor } from "./tools/LighthouseAuditor";
import { FaviconGrabber } from "./tools/FaviconGrabber";
import type { DomainTool } from "./types";

interface DomainToolsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  initialTool?: string;
}

interface ToolCategory {
  name: string;
  tools: DomainTool[];
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    name: "Domain Info",
    tools: [
      {
        id: "whois",
        name: "WHOIS Lookup",
        description: "Domain registration details",
        icon: FileSearch,
      },
      {
        id: "availability",
        name: "Domain Availability",
        description: "Check if domain is registered",
        icon: Globe,
      },
    ],
  },
  {
    name: "DNS",
    tools: [
      {
        id: "dns",
        name: "DNS Lookup",
        description: "Query DNS records (A, MX, TXT, etc.)",
        icon: Server,
      },
      {
        id: "propagation",
        name: "DNS Propagation",
        description: "Check DNS across global resolvers",
        icon: Radio,
      },
    ],
  },
  {
    name: "Security",
    tools: [
      {
        id: "ssl",
        name: "SSL Certificate",
        description: "Check SSL certificate details",
        icon: Shield,
      },
      {
        id: "headers",
        name: "HTTP Headers",
        description: "Inspect request/response headers",
        icon: FileSearch,
      },
    ],
  },
  {
    name: "Network",
    tools: [
      {
        id: "ip",
        name: "IP Address Lookup",
        description: "Geolocation and ISP info",
        icon: MapPin,
      },
      {
        id: "redirect",
        name: "Redirect Tracker",
        description: "Follow HTTP redirect chain",
        icon: ArrowRightLeft,
      },
    ],
  },
  {
    name: "SEO",
    tools: [
      {
        id: "dead-links",
        name: "Dead Link Checker",
        description: "Find broken links on a website",
        icon: Link2,
      },
      {
        id: "lighthouse",
        name: "Lighthouse Auditor",
        description: "Run Google Lighthouse audits",
        icon: TrendingUp,
      },
    ],
  },
  {
    name: "Utilities",
    tools: [
      {
        id: "favicon-grabber",
        name: "Favicon Grabber",
        description: "Extract favicons from any URL",
        icon: Image,
      },
    ],
  },
];

const ALL_TOOLS = TOOL_CATEGORIES.flatMap((cat) => cat.tools);

export function DomainToolsPopup({ isOpen, onClose, initialTool }: DomainToolsPopupProps) {
  const [activeTool, setActiveTool] = useState("whois");
  const [sharedUrl, setSharedUrl] = useState("");

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
            <span className="font-medium text-text-primary">Domain Tools</span>
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
          <SearchableToolSidebar
            categories={TOOL_CATEGORIES}
            activeToolId={activeTool}
            onToolSelect={setActiveTool}
            searchPlaceholder="Search..."
          />

          <ScrollArea className="flex-1" scrollbarVisibility="visible">
            <div className="h-full">
              {activeTool === "whois" && <WhoisLookup url={sharedUrl} onUrlChange={setSharedUrl} />}
              {activeTool === "availability" && <DomainAvailability url={sharedUrl} onUrlChange={setSharedUrl} />}
              {activeTool === "dns" && <DnsLookup url={sharedUrl} onUrlChange={setSharedUrl} />}
              {activeTool === "propagation" && <DnsPropagation url={sharedUrl} onUrlChange={setSharedUrl} />}
              {activeTool === "ssl" && <SslChecker url={sharedUrl} onUrlChange={setSharedUrl} />}
              {activeTool === "headers" && <HttpHeadersInspector url={sharedUrl} onUrlChange={setSharedUrl} />}
              {activeTool === "ip" && <IpAddressLookup url={sharedUrl} onUrlChange={setSharedUrl} />}
              {activeTool === "redirect" && <RedirectTracker url={sharedUrl} onUrlChange={setSharedUrl} />}
              {activeTool === "dead-links" && <DeadLinkChecker url={sharedUrl} onUrlChange={setSharedUrl} />}
              {activeTool === "lighthouse" && <LighthouseAuditor url={sharedUrl} onUrlChange={setSharedUrl} />}
              {activeTool === "favicon-grabber" && <FaviconGrabber url={sharedUrl} onUrlChange={setSharedUrl} />}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
