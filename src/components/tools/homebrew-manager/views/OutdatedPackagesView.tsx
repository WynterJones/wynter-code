import { useEffect } from "react";
import { AlertCircle, ArrowUp, Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useHomebrewStore } from "@/stores/homebrewStore";
import { PackageCard } from "../PackageCard";

export function OutdatedPackagesView() {
  const {
    outdatedPackages,
    isLoading,
    isOperating,
    fetchOutdatedPackages,
    upgradePackage,
  } = useHomebrewStore();

  useEffect(() => {
    fetchOutdatedPackages();
  }, [fetchOutdatedPackages]);

  const formulaeCount = outdatedPackages.filter((p) => p.packageType === "formula").length;
  const casksCount = outdatedPackages.filter((p) => p.packageType === "cask").length;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-400" />
          <span className="font-medium text-text-primary">
            {outdatedPackages.length} outdated package
            {outdatedPackages.length !== 1 ? "s" : ""}
          </span>
          {outdatedPackages.length > 0 && (
            <span className="text-sm text-text-tertiary">
              ({formulaeCount} formulae, {casksCount} casks)
            </span>
          )}
        </div>

        {outdatedPackages.length > 0 && (
          <Button
            onClick={() => upgradePackage(null, false)}
            disabled={isOperating}
          >
            <ArrowUp className="w-4 h-4 mr-2" />
            Upgrade All
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && outdatedPackages.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-text-primary font-medium">All packages are up to date!</p>
          <p className="text-sm text-text-tertiary mt-1">
            Run "brew update" to check for new versions
          </p>
        </div>
      )}

      {/* Package list */}
      {!isLoading && outdatedPackages.length > 0 && (
        <div className="space-y-2">
          {outdatedPackages.map((pkg) => (
            <PackageCard
              key={`${pkg.packageType}-${pkg.name}`}
              pkg={pkg}
              showUpgrade
            />
          ))}
        </div>
      )}
    </div>
  );
}
