import { Lock, Unlock, Star, ExternalLink, Loader2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { ScrollArea } from "@/components/ui/ScrollArea";
import type { GhRepo } from "@/types/github";
import { cn } from "@/lib/utils";

interface RepoListProps {
  repos: GhRepo[];
  loading: boolean;
  onSelect: (repo: GhRepo) => void;
  showOwner?: boolean;
}

export function RepoList({ repos, loading, onSelect, showOwner }: RepoListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-tertiary">
        No repositories found
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1" scrollbarVisibility="visible">
      <div className="p-4 grid gap-3">
        {repos.map((repo) => (
          <RepoCard
            key={repo.url}
            repo={repo}
            onClick={() => onSelect(repo)}
            showOwner={showOwner}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function RepoCard({
  repo,
  onClick,
  showOwner,
}: {
  repo: GhRepo;
  onClick: () => void;
  showOwner?: boolean;
}) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const displayName = showOwner && repo.owner ? `${repo.owner.login}/${repo.name}` : repo.name;

  return (
    <div
      className={cn(
        "p-4 rounded-lg border border-border bg-bg-secondary",
        "hover:border-accent/50 hover:bg-bg-tertiary transition-colors cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-text-primary truncate">
              {displayName}
            </h3>
            {repo.isPrivate ? (
              <Lock className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
            )}
          </div>

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

            {repo.stargazerCount !== undefined && repo.stargazerCount > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {repo.stargazerCount}
              </span>
            )}

            {repo.updatedAt && <span>Updated {formatDate(repo.updatedAt)}</span>}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            open(repo.url);
          }}
          className="p-2 rounded hover:bg-bg-hover text-text-tertiary hover:text-text-primary"
          title="Open in browser"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
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
