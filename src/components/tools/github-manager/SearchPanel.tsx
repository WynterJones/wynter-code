import { useState, useEffect } from "react";
import { Search, Star, ExternalLink, Loader2 } from "lucide-react";
import { openExternalUrl } from "@/lib/urlSecurity";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useGitHubManagerStore } from "@/stores/githubManagerStore";
import type { GhSearchRepo } from "@/types/github";
import { cn } from "@/lib/utils";

export function SearchPanel() {
  const {
    searchQuery,
    searchResults,
    searchLoading,
    searchRepos,
  } = useGitHubManagerStore();

  const [inputValue, setInputValue] = useState(searchQuery);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.trim() && inputValue !== searchQuery) {
        searchRepos(inputValue);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue, searchQuery, searchRepos]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      searchRepos(inputValue);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search GitHub repositories..."
            className={cn(
              "w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border rounded-lg",
              "text-text-primary placeholder:text-text-tertiary",
              "focus:outline-none focus:border-accent"
            )}
            autoFocus
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
          )}
        </div>
      </form>

      {/* Results */}
      <ScrollArea className="flex-1" scrollbarVisibility="visible">
        <div className="p-4">
          {!searchQuery && !inputValue && (
            <div className="text-center text-text-tertiary py-12">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Search for repositories on GitHub</p>
            </div>
          )}

          {searchQuery && !searchLoading && searchResults.length === 0 && (
            <div className="text-center text-text-tertiary py-12">
              <p>No repositories found for "{searchQuery}"</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="grid gap-3">
              {searchResults.map((repo) => (
                <SearchResultCard key={repo.url} repo={repo} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function SearchResultCard({ repo }: { repo: GhSearchRepo }) {
  const handleOpenRepo = async () => {
    try {
      await openExternalUrl(repo.url);
    } catch (err) {
      console.error("Failed to open repo URL:", err);
    }
  };

  return (
    <button
      onClick={handleOpenRepo}
      className={cn(
        "w-full text-left p-4 rounded-lg border border-border bg-bg-secondary",
        "hover:border-accent/50 hover:bg-bg-tertiary transition-colors"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">
            {repo.fullName}
          </h3>

          {repo.description && (
            <p className="mt-1 text-sm text-text-secondary line-clamp-2">
              {repo.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-4 text-xs text-text-tertiary">
            {repo.primaryLanguage && (
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: getLanguageColor(repo.primaryLanguage.name),
                  }}
                />
                {repo.primaryLanguage.name}
              </span>
            )}

            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {formatStarCount(repo.stargazerCount)}
            </span>
          </div>
        </div>

        <ExternalLink className="w-4 h-4 text-text-tertiary flex-shrink-0" />
      </div>
    </button>
  );
}

function formatStarCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Rust: "#dea584",
    Go: "#00ADD8",
    Java: "#b07219",
    Ruby: "#701516",
    PHP: "#4F5D95",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#178600",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Shell: "#89e051",
    Vue: "#41b883",
    Svelte: "#ff3e00",
  };
  return colors[language] || "#8b949e";
}
