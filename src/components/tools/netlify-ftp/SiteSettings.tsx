import { useState } from "react";
import { X, Globe, Settings, ExternalLink, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NetlifySite } from "@/types/netlifyFtp";

interface SiteSettingsProps {
  site: NetlifySite;
  onClose: () => void;
  theme?: "classic" | "terminal" | "amber";
}

export function SiteSettings({
  site,
  onClose,
  theme = "classic",
}: SiteSettingsProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const isTerminalTheme = theme === "terminal" || theme === "amber";

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
      <div className={cn(
        "retro-raised w-full max-w-md",
        isTerminalTheme && "bg-[#0a0a0a]"
      )}>
        {/* Title bar */}
        <div className="retro-titlebar">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>Site Settings - {site.name}</span>
          </div>
          <div className="retro-titlebar-buttons">
            <button className="retro-titlebar-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={cn("p-4 space-y-4", isTerminalTheme && "crt-glow")}>
          {/* Site Info */}
          <div className="space-y-2">
            <div className={cn(
              "text-xs font-bold uppercase tracking-wider",
              isTerminalTheme ? "opacity-70" : "text-gray-500"
            )}>
              Site Information
            </div>
            
            <div className="space-y-1">
              <InfoRow 
                label="Site ID" 
                value={site.id} 
                onCopy={() => handleCopy(site.id, "id")}
                copied={copied === "id"}
                theme={theme}
              />
              <InfoRow 
                label="Name" 
                value={site.name}
                theme={theme}
              />
              <InfoRow 
                label="Created" 
                value={new Date(site.created_at).toLocaleDateString()}
                theme={theme}
              />
              <InfoRow 
                label="Updated" 
                value={new Date(site.updated_at).toLocaleDateString()}
                theme={theme}
              />
            </div>
          </div>

          {/* URLs */}
          <div className="space-y-2">
            <div className={cn(
              "text-xs font-bold uppercase tracking-wider",
              isTerminalTheme ? "opacity-70" : "text-gray-500"
            )}>
              URLs
            </div>
            
            <div className="space-y-1">
              <UrlRow 
                label="Site URL" 
                url={site.ssl_url || site.url}
                theme={theme}
              />
              {site.custom_domain && (
                <UrlRow 
                  label="Custom Domain" 
                  url={`https://${site.custom_domain}`}
                  theme={theme}
                />
              )}
            </div>
          </div>

          {/* Domain Aliases */}
          {site.domain_aliases && site.domain_aliases.length > 0 && (
            <div className="space-y-2">
              <div className={cn(
                "text-xs font-bold uppercase tracking-wider",
                isTerminalTheme ? "opacity-70" : "text-gray-500"
              )}>
                Domain Aliases
              </div>
              <div className="space-y-1">
                {site.domain_aliases.map((alias) => (
                  <div 
                    key={alias}
                    className={cn(
                      "text-xs font-mono p-1 flex items-center gap-2",
                      isTerminalTheme ? "bg-[#1a1a1a]" : "bg-gray-100"
                    )}
                  >
                    <Globe className="w-3 h-3 opacity-50" />
                    {alias}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-current/20">
            <a
              href={site.admin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="retro-button flex-1 justify-center"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Netlify
            </a>
            <button
              onClick={onClose}
              className="retro-button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ 
  label, 
  value, 
  onCopy, 
  copied,
  theme 
}: { 
  label: string; 
  value: string; 
  onCopy?: () => void;
  copied?: boolean;
  theme?: "classic" | "terminal" | "amber";
}) {
  const isTerminalTheme = theme === "terminal" || theme === "amber";
  
  return (
    <div className={cn(
      "flex items-center text-xs",
      isTerminalTheme && "crt-glow"
    )}>
      <span className={cn(
        "w-20 flex-shrink-0",
        isTerminalTheme ? "opacity-70" : "text-gray-500"
      )}>
        {label}:
      </span>
      <span className="font-mono truncate flex-1">{value}</span>
      {onCopy && (
        <button
          onClick={onCopy}
          className="ml-2 p-1 opacity-50 hover:opacity-100"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      )}
    </div>
  );
}

function UrlRow({ 
  label, 
  url,
  theme 
}: { 
  label: string; 
  url: string;
  theme?: "classic" | "terminal" | "amber";
}) {
  const isTerminalTheme = theme === "terminal" || theme === "amber";
  
  return (
    <div className={cn(
      "flex items-center text-xs",
      isTerminalTheme && "crt-glow"
    )}>
      <span className={cn(
        "w-20 flex-shrink-0",
        isTerminalTheme ? "opacity-70" : "text-gray-500"
      )}>
        {label}:
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "font-mono truncate flex-1 underline",
          isTerminalTheme ? "hover:opacity-70" : "text-blue-600 hover:text-blue-800"
        )}
      >
        {url}
      </a>
      <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
    </div>
  );
}
