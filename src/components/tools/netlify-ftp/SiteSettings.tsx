import { useState } from "react";
import { Globe, ExternalLink, Copy, Check } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { Modal, Button } from "@/components/ui";
import { IconButton } from "@/components/ui/IconButton";
import type { NetlifySite } from "@/types/netlifyFtp";

interface SiteSettingsProps {
  site: NetlifySite;
  onClose: () => void;
}

export function SiteSettings({ site, onClose }: SiteSettingsProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleOpenUrl = async (url: string) => {
    try {
      await open(url);
    } catch (err) {
      console.error("Failed to open URL:", err);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Site Settings - ${site.name}`} size="md">
      <div className="p-4 space-y-6">
        {/* Site Info */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Site Information
          </h4>

          <div className="space-y-2">
            <InfoRow
              label="Site ID"
              value={site.id}
              onCopy={() => handleCopy(site.id, "id")}
              copied={copied === "id"}
            />
            <InfoRow label="Name" value={site.name} />
            <InfoRow
              label="Created"
              value={new Date(site.created_at).toLocaleDateString()}
            />
            <InfoRow
              label="Updated"
              value={new Date(site.updated_at).toLocaleDateString()}
            />
          </div>
        </div>

        {/* URLs */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            URLs
          </h4>

          <div className="space-y-2">
            <UrlRow
              label="Site URL"
              url={site.ssl_url || site.url}
              onOpen={handleOpenUrl}
            />
            {site.custom_domain && (
              <UrlRow
                label="Custom Domain"
                url={`https://${site.custom_domain}`}
                onOpen={handleOpenUrl}
              />
            )}
          </div>
        </div>

        {/* Domain Aliases */}
        {site.domain_aliases && site.domain_aliases.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Domain Aliases
            </h4>
            <div className="space-y-1">
              {site.domain_aliases.map((alias) => (
                <div
                  key={alias}
                  className="text-xs font-mono p-2 bg-bg-tertiary rounded flex items-center gap-2"
                >
                  <Globe className="w-3 h-3 text-text-secondary" />
                  {alias}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            variant="default"
            className="flex-1"
            onClick={() => handleOpenUrl(site.admin_url)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in Netlify
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function InfoRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center text-sm">
      <span className="w-20 flex-shrink-0 text-text-secondary">{label}:</span>
      <span className="font-mono truncate flex-1 text-text-primary">{value}</span>
      {onCopy && (
        <IconButton size="sm" onClick={onCopy}>
          {copied ? (
            <Check className="w-3 h-3 text-accent-green" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </IconButton>
      )}
    </div>
  );
}

function UrlRow({
  label,
  url,
  onOpen,
}: {
  label: string;
  url: string;
  onOpen: (url: string) => void;
}) {
  return (
    <div className="flex items-center text-sm">
      <span className="w-20 flex-shrink-0 text-text-secondary">{label}:</span>
      <button
        onClick={() => onOpen(url)}
        className="font-mono truncate flex-1 text-accent hover:underline text-left"
      >
        {url}
      </button>
      <IconButton size="sm" onClick={() => onOpen(url)}>
        <ExternalLink className="w-3 h-3" />
      </IconButton>
    </div>
  );
}
