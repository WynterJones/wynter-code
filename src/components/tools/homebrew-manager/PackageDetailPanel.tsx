import { X, ExternalLink, Package, Box, Download, Trash2, ArrowUp, Loader2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useHomebrewStore } from "@/stores/homebrewStore";

export function PackageDetailPanel() {
  const {
    selectedPackage,
    isLoading,
    isOperating,
    clearSelectedPackage,
    installPackage,
    uninstallPackage,
    upgradePackage,
  } = useHomebrewStore();

  if (!selectedPackage) return null;

  const isCask = selectedPackage.packageType === "cask";

  return (
    <div className="w-80 border-l border-border bg-bg-secondary flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-medium text-text-primary truncate">{selectedPackage.name}</h3>
        <Tooltip content="Close" side="left">
          <IconButton size="sm" onClick={clearSelectedPackage} aria-label="Close package details">
            <X className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1" scrollbarVisibility="visible">
        <div className="p-4 space-y-4">
          {/* Type and version */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-2 rounded-lg bg-bg-tertiary">
              {isCask ? (
                <Box className="w-5 h-5 text-purple-400" />
              ) : (
                <Package className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  isCask
                    ? "bg-purple-500/20 text-purple-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {isCask ? "Cask" : "Formula"}
              </span>
              <p className="text-sm text-text-tertiary mt-0.5">v{selectedPackage.version}</p>
            </div>

            {selectedPackage.installed && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                Installed
              </span>
            )}
            {selectedPackage.outdated && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                Outdated
              </span>
            )}
          </div>

          {/* Description */}
          {selectedPackage.desc && (
            <div>
              <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">
                Description
              </h4>
              <p className="text-sm text-text-secondary">{selectedPackage.desc}</p>
            </div>
          )}

          {/* Homepage */}
          {selectedPackage.homepage && (
            <div>
              <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">
                Homepage
              </h4>
              <a
                href={selectedPackage.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                {selectedPackage.homepage.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* License */}
          {selectedPackage.license && (
            <div>
              <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">
                License
              </h4>
              <p className="text-sm text-text-secondary">{selectedPackage.license}</p>
            </div>
          )}

          {/* Dependencies */}
          {selectedPackage.dependencies.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">
                Dependencies ({selectedPackage.dependencies.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {selectedPackage.dependencies.map((dep) => (
                  <span
                    key={dep}
                    className="text-xs px-2 py-1 rounded bg-bg-tertiary text-text-secondary"
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Caveats */}
          {selectedPackage.caveats && (
            <div>
              <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">
                Caveats
              </h4>
              <pre className="text-xs text-text-secondary bg-bg-tertiary p-3 rounded-lg overflow-auto whitespace-pre-wrap">
                {selectedPackage.caveats}
              </pre>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          </div>
        ) : selectedPackage.installed ? (
          <>
            {selectedPackage.outdated && (
              <Button
                className="w-full"
                onClick={() => upgradePackage(selectedPackage.name, isCask)}
                disabled={isOperating}
              >
                <ArrowUp className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            )}
            <Button
              variant="danger"
              className="w-full"
              onClick={() => uninstallPackage(selectedPackage.name, isCask)}
              disabled={isOperating}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Uninstall
            </Button>
          </>
        ) : (
          <Button
            className="w-full"
            onClick={() => installPackage(selectedPackage.name, isCask)}
            disabled={isOperating}
          >
            <Download className="w-4 h-4 mr-2" />
            Install
          </Button>
        )}
      </div>
    </div>
  );
}
