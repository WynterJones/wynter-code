import { FileSearch, Archive, AppWindow } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSystemCleanerStore } from "@/stores/systemCleanerStore";
import type { CleanerCategory } from "@/types/systemCleaner";

interface CategoryItem {
  id: CleanerCategory;
  name: string;
  icon: typeof FileSearch;
}

const CATEGORIES: CategoryItem[] = [
  { id: "large-files", name: "Large Files", icon: FileSearch },
  { id: "app-caches", name: "App Caches", icon: Archive },
  { id: "installed-apps", name: "Installed Apps", icon: AppWindow },
];

function formatSize(bytes: number): string {
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  if (bytes >= GB) {
    return `${(bytes / GB).toFixed(1)} GB`;
  } else if (bytes >= MB) {
    return `${(bytes / MB).toFixed(1)} MB`;
  } else if (bytes >= KB) {
    return `${(bytes / KB).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export function CleanerSidebar() {
  const {
    activeCategory,
    setActiveCategory,
    largeFiles,
    appCaches,
    installedApps,
    largeFilesTotalSize,
    appCachesTotalSize,
    installedAppsTotalSize,
  } = useSystemCleanerStore();

  const getCategoryStats = (id: CleanerCategory) => {
    switch (id) {
      case "large-files":
        return {
          count: largeFiles.length,
          size: largeFilesTotalSize,
        };
      case "app-caches":
        return {
          count: appCaches.length,
          size: appCachesTotalSize,
        };
      case "installed-apps":
        return {
          count: installedApps.length,
          size: installedAppsTotalSize,
        };
    }
  };

  return (
    <div className="w-56 border-r border-border bg-bg-secondary flex flex-col">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
          Categories
        </h3>
      </div>

      <div className="flex-1 p-2 space-y-1">
        {CATEGORIES.map((cat) => {
          const stats = getCategoryStats(cat.id);
          const isActive = activeCategory === cat.id;
          const Icon = cat.icon;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                isActive
                  ? "bg-accent/20 text-accent"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{cat.name}</div>
                {stats.count > 0 && (
                  <div className="text-xs text-text-tertiary">
                    {stats.count} items &middot; {formatSize(stats.size)}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
