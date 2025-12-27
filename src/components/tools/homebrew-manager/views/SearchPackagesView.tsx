import { useState } from "react";
import { Search, Package, Box, Download, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useHomebrewStore } from "@/stores/homebrewStore";

export function SearchPackagesView() {
  const {
    searchResults,
    isLoading,
    isOperating,
    installedPackages,
    searchPackages,
    installPackage,
    fetchPackageInfo,
  } = useHomebrewStore();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchPackages(query.trim());
    }
  };

  const isInstalled = (name: string, isCask: boolean) => {
    return installedPackages.some(
      (pkg) => pkg.name === name && pkg.packageType === (isCask ? "cask" : "formula")
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input
            type="text"
            placeholder="Search Homebrew packages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isLoading || !query.trim()}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </form>

      {/* Results */}
      {!isLoading && searchResults.length === 0 && query && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">No packages found for "{query}"</p>
        </div>
      )}

      {!isLoading && searchResults.length > 0 && (
        <div className="space-y-2">
          {searchResults.map((result) => {
            const isCask = result.packageType === "cask";
            const installed = isInstalled(result.name, isCask);

            return (
              <div
                key={`${result.packageType}-${result.name}`}
                className="group p-3 bg-bg-secondary hover:bg-bg-tertiary rounded-lg border border-border transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-bg-tertiary">
                      {isCask ? (
                        <Box className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Package className="w-4 h-4 text-blue-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchPackageInfo(result.name, isCask)}
                          className="font-medium text-text-primary hover:text-accent transition-colors"
                        >
                          {result.name}
                        </button>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            isCask
                              ? "bg-purple-500/20 text-purple-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {isCask ? "Cask" : "Formula"}
                        </span>
                        {installed && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                            Installed
                          </span>
                        )}
                      </div>
                      {result.desc && (
                        <p className="text-sm text-text-secondary mt-1 truncate">
                          {result.desc}
                        </p>
                      )}
                    </div>
                  </div>

                  {!installed && (
                    <Button
                      size="sm"
                      onClick={() => installPackage(result.name, isCask)}
                      disabled={isOperating}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Install
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Initial state */}
      {!isLoading && searchResults.length === 0 && !query && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">
            Search for packages to install from Homebrew
          </p>
          <p className="text-sm text-text-tertiary mt-1">
            Try searching for "node", "python", or "visual-studio-code"
          </p>
        </div>
      )}
    </div>
  );
}
