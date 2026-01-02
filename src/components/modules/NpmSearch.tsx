import { useState, useCallback } from "react";
import { Search, Plus, Loader2, Package, ExternalLink } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ScrollArea, Input, Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface NpmSearchResult {
  name: string;
  description: string | null;
  version: string;
  date: string | null;
  keywords: string[] | null;
}

interface NpmSearchProps {
  projectPath: string;
  onPackageInstalled: () => void;
}

export function NpmSearch({ projectPath, onPackageInstalled }: NpmSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NpmSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const searchResults = await invoke<NpmSearchResult[]>("npm_search", {
        query: query.trim(),
      });
      setResults(searchResults);
    } catch (err) {
      setError(String(err));
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleInstall = async (packageName: string, isDev: boolean) => {
    setInstalling(`${packageName}-${isDev ? "dev" : "prod"}`);
    setError(null);

    try {
      const result = await invoke<{ stdout: string; stderr: string; code: number }>(
        "npm_install",
        {
          projectPath,
          packageName,
          isDev,
        }
      );

      if (result.code !== 0) {
        setError(`Installation failed: ${result.stderr || result.stdout}`);
      } else {
        onPackageInstalled();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setInstalling(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 1) return "today";
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
      return `${Math.floor(diffDays / 365)}y ago`;
    } catch (err) {
      return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search npm packages..."
            className="pl-7 pr-16 h-7 text-xs"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="btn-primary absolute right-1 top-1/2 -translate-y-1/2 !px-2 !py-0.5 !text-xs !rounded"
          >
            {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-2 mt-2 p-2 text-xs text-accent-red bg-accent-red/10 rounded-md">
          {error}
        </div>
      )}

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {results.length === 0 && !searching && query && (
            <p className="text-xs text-text-secondary text-center py-4">
              No packages found for "{query}"
            </p>
          )}

          {results.length === 0 && !searching && !query && (
            <div className="text-center py-8">
              <Package className="w-8 h-8 text-text-secondary mx-auto mb-2" />
              <p className="text-sm text-text-secondary">Search for npm packages</p>
              <p className="text-xs text-text-secondary mt-1">
                Enter a package name and press Enter
              </p>
            </div>
          )}

          {searching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-text-secondary animate-spin" />
            </div>
          )}

          {results.map((pkg) => (
            <NpmPackageCard
              key={pkg.name}
              pkg={pkg}
              formatDate={formatDate}
              installing={installing}
              onInstall={handleInstall}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      {results.length > 0 && (
        <div className="px-3 py-2 border-t border-border">
          <p className="text-xs text-text-secondary">
            {results.length} package{results.length !== 1 ? "s" : ""} found
          </p>
        </div>
      )}
    </div>
  );
}

interface NpmPackageCardProps {
  pkg: NpmSearchResult;
  formatDate: (dateStr: string | null) => string | null;
  installing: string | null;
  onInstall: (name: string, isDev: boolean) => void;
}

function NpmPackageCard({ pkg, formatDate, installing, onInstall }: NpmPackageCardProps) {
  const [showActions, setShowActions] = useState(false);
  const isInstallingThis = installing?.startsWith(pkg.name);
  const formattedDate = formatDate(pkg.date);

  return (
    <div
      className={cn(
        "rounded-md border border-transparent p-2 transition-colors",
        "hover:border-border hover:bg-bg-hover"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Package className="w-3.5 h-3.5 text-accent-orange flex-shrink-0" />
          <span className="text-sm text-text-primary font-medium truncate">{pkg.name}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge variant="default" className="text-[10px] px-1.5">
            {pkg.version}
          </Badge>
          {formattedDate && (
            <span className="text-[10px] text-text-secondary">{formattedDate}</span>
          )}
        </div>
      </div>

      {/* Description */}
      {pkg.description && (
        <p className="text-xs text-text-secondary mt-1 line-clamp-2 pl-5">
          {pkg.description}
        </p>
      )}

      {/* Actions */}
      {(showActions || isInstallingThis) && (
        <div className="flex items-center gap-2 mt-2 pl-5">
          <Button
            size="sm"
            variant="default"
            onClick={() => onInstall(pkg.name, false)}
            disabled={!!installing}
            className="text-xs h-6 px-2"
          >
            {installing === `${pkg.name}-prod` ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Plus className="w-3 h-3 mr-1" />
            )}
            Install
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onInstall(pkg.name, true)}
            disabled={!!installing}
            className="text-xs h-6 px-2"
          >
            {installing === `${pkg.name}-dev` ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Plus className="w-3 h-3 mr-1" />
            )}
            Dev
          </Button>
          <a
            href={`https://www.npmjs.com/package/${pkg.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-text-secondary hover:text-text-primary transition-colors"
            title="View on npm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
