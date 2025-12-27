import { useState, useMemo } from "react";
import { Search, Package, Box, Filter } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useHomebrewStore } from "@/stores/homebrewStore";
import { PackageCard } from "../PackageCard";
import type { FilterType } from "@/types/homebrew";

export function InstalledPackagesView() {
  const { installedPackages, isLoading, filterType, setFilterType } = useHomebrewStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPackages = useMemo(() => {
    let packages = installedPackages;

    // Filter by type
    if (filterType !== "all") {
      packages = packages.filter((pkg) => pkg.packageType === filterType);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      packages = packages.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(query) ||
          pkg.desc?.toLowerCase().includes(query)
      );
    }

    return packages;
  }, [installedPackages, filterType, searchQuery]);

  const formulaeCount = installedPackages.filter((p) => p.packageType === "formula").length;
  const casksCount = installedPackages.filter((p) => p.packageType === "cask").length;

  const filterButtons: { type: FilterType; label: string; count: number }[] = [
    { type: "all", label: "All", count: installedPackages.length },
    { type: "formula", label: "Formulae", count: formulaeCount },
    { type: "cask", label: "Casks", count: casksCount },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header with filter and search */}
      <div className="flex items-center gap-3">
        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-bg-secondary rounded-lg p-1">
          {filterButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => setFilterType(btn.type)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${
                filterType === btn.type
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
              }`}
            >
              {btn.type === "formula" && <Package className="w-3.5 h-3.5" />}
              {btn.type === "cask" && <Box className="w-3.5 h-3.5" />}
              {btn.type === "all" && <Filter className="w-3.5 h-3.5" />}
              {btn.label}
              <span className="text-xs opacity-70">({btn.count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input
            type="text"
            placeholder="Filter packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredPackages.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">
            {searchQuery ? "No packages match your search" : "No packages installed"}
          </p>
        </div>
      )}

      {/* Package list */}
      {!isLoading && filteredPackages.length > 0 && (
        <div className="space-y-2">
          {filteredPackages.map((pkg) => (
            <PackageCard key={`${pkg.packageType}-${pkg.name}`} pkg={pkg} showUpgrade />
          ))}
        </div>
      )}
    </div>
  );
}
