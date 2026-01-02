import { Package, Box, Info, Trash2, ArrowUp, Pin, PinOff } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import type { BrewPackage } from "@/types/homebrew";
import { useHomebrewStore } from "@/stores/homebrewStore";

interface PackageCardProps {
  pkg: BrewPackage;
  showActions?: boolean;
  showUpgrade?: boolean;
}

export function PackageCard({ pkg, showActions = true, showUpgrade = false }: PackageCardProps) {
  const {
    isOperating,
    fetchPackageInfo,
    uninstallPackage,
    upgradePackage,
    pinPackage,
    unpinPackage,
  } = useHomebrewStore();

  const isCask = pkg.packageType === "cask";

  return (
    <div className="group p-3 bg-bg-secondary hover:bg-bg-tertiary rounded-lg border border-border transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-bg-tertiary">
            {isCask ? (
              <Box className="w-4 h-4 text-purple-400" />
            ) : (
              <Package className="w-4 h-4 text-blue-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-text-primary truncate">{pkg.name}</span>
              <span className="text-xs text-text-tertiary">{pkg.version}</span>

              {/* Type badge */}
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  isCask
                    ? "bg-purple-500/20 text-purple-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {isCask ? "Cask" : "Formula"}
              </span>

              {/* Status badges */}
              {pkg.outdated && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                  Outdated
                </span>
              )}
              {pkg.pinned && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">
                  Pinned
                </span>
              )}
            </div>

            {pkg.desc && (
              <p className="text-sm text-text-secondary mt-1 line-clamp-2">{pkg.desc}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip content="View details" side="top">
              <IconButton
                size="sm"
                onClick={() => fetchPackageInfo(pkg.name, isCask)}
                disabled={isOperating}
                aria-label={`View details for ${pkg.name}`}
              >
                <Info className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>

            {showUpgrade && pkg.outdated && (
              <Tooltip content="Upgrade" side="top">
                <IconButton
                  size="sm"
                  variant="primary"
                  onClick={() => upgradePackage(pkg.name, isCask)}
                  disabled={isOperating}
                  aria-label={`Upgrade ${pkg.name}`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </IconButton>
              </Tooltip>
            )}

            {!isCask && (
              <Tooltip content={pkg.pinned ? "Unpin" : "Pin"} side="top">
                <IconButton
                  size="sm"
                  onClick={() =>
                    pkg.pinned ? unpinPackage(pkg.name) : pinPackage(pkg.name)
                  }
                  disabled={isOperating}
                  aria-label={pkg.pinned ? `Unpin ${pkg.name}` : `Pin ${pkg.name}`}
                >
                  {pkg.pinned ? (
                    <PinOff className="w-3.5 h-3.5" />
                  ) : (
                    <Pin className="w-3.5 h-3.5" />
                  )}
                </IconButton>
              </Tooltip>
            )}

            <Tooltip content="Uninstall" side="top">
              <IconButton
                size="sm"
                variant="danger"
                onClick={() => uninstallPackage(pkg.name, isCask)}
                disabled={isOperating}
                aria-label={`Uninstall ${pkg.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
