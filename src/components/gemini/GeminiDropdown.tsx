import { useEffect, useRef, useState } from "react";
import { RefreshCw, ExternalLink, Settings, BookOpen, Activity } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { cn } from "@/lib/utils";
import { getGeminiVersion } from "@/services/providerVersion";

const GEMINI_LINKS = {
  studio: "https://aistudio.google.com",
  docs: "https://ai.google.dev/gemini-api/docs",
  status: "https://status.cloud.google.com",
};

export function GeminiDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [version, setVersion] = useState<string>("unknown");
  const [isCheckingVersion, setIsCheckingVersion] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVersion();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const fetchVersion = async () => {
    setIsCheckingVersion(true);
    try {
      const v = await getGeminiVersion();
      setVersion(v);
    } catch {
      setVersion("unknown");
    } finally {
      setIsCheckingVersion(false);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      await open(url);
    } catch (error) {
      console.error("Failed to open link:", error);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-1.5 rounded transition-colors",
          isOpen
            ? "bg-accent/15 text-accent border border-accent/50"
            : "hover:bg-bg-tertiary text-text-secondary hover:text-text-primary border border-transparent"
        )}
        title="Gemini Manager"
      >
        <img src="/gemini-color.svg" alt="Gemini" className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 py-1 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 dropdown-solid">
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">Gemini CLI</span>
              <span className="text-xs text-text-secondary">v{version}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchVersion();
              }}
              disabled={isCheckingVersion}
              className="mt-1.5 flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors"
            >
              <RefreshCw className={cn("w-3 h-3", isCheckingVersion && "animate-spin")} />
              {isCheckingVersion ? "Checking..." : "Refresh version"}
            </button>
          </div>

          <div className="py-1">
            <button
              onClick={() => handleOpenLink(GEMINI_LINKS.studio)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Google AI Studio</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </button>

            <button
              onClick={() => handleOpenLink(GEMINI_LINKS.docs)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Documentation</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </button>

            <button
              onClick={() => handleOpenLink(GEMINI_LINKS.status)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span>API Status</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
