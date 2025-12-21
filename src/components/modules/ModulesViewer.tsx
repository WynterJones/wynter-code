import { useState, useEffect, useRef, useCallback } from "react";
import { Package, Search, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ScrollArea, Input, Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { PackageHoverCard } from "./PackageHoverCard";
import { NpmSearch } from "./NpmSearch";

interface NodeModule {
  name: string;
  version: string;
  description: string | null;
  is_dev: boolean;
}

interface OutdatedInfo {
  current: string;
  wanted: string;
  latest: string;
}

interface ModulesViewerProps {
  projectPath: string;
}

type ViewTab = "installed" | "search";

export function ModulesViewer({ projectPath }: ModulesViewerProps) {
  const [modules, setModules] = useState<NodeModule[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>("installed");
  const [outdatedInfo, setOutdatedInfo] = useState<Map<string, OutdatedInfo>>(new Map());
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [hoveredModule, setHoveredModule] = useState<NodeModule | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ top: 0 });
  const [updatingPackage, setUpdatingPackage] = useState<string | null>(null);
  const [uninstallingPackage, setUninstallingPackage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModules();
  }, [projectPath]);

  const loadModules = async () => {
    try {
      setLoading(true);
      const result = await invoke<NodeModule[]>("get_node_modules", {
        projectPath,
      });
      setModules(result);
    } catch (error) {
      console.error("Failed to load modules:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkForUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const result = await invoke<Record<string, OutdatedInfo>>("check_outdated_packages", {
        projectPath,
      });
      setOutdatedInfo(new Map(Object.entries(result)));
    } catch (error) {
      console.error("Failed to check updates:", error);
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleUpdatePackage = async (packageName: string) => {
    setUpdatingPackage(packageName);
    try {
      await invoke("npm_install", {
        projectPath,
        packageName: `${packageName}@latest`,
        isDev: modules.find((m) => m.name === packageName)?.is_dev ?? false,
      });
      await loadModules();
      await checkForUpdates();
    } catch (error) {
      console.error("Failed to update package:", error);
    } finally {
      setUpdatingPackage(null);
    }
  };

  const handleUninstallPackage = async (packageName: string) => {
    setUninstallingPackage(packageName);
    setHoveredModule(null);
    try {
      await invoke("npm_uninstall", {
        projectPath,
        packageName,
      });
      await loadModules();
      setOutdatedInfo((prev) => {
        const next = new Map(prev);
        next.delete(packageName);
        return next;
      });
    } catch (error) {
      console.error("Failed to uninstall package:", error);
    } finally {
      setUninstallingPackage(null);
    }
  };

  const handleModuleHover = useCallback(
    (module: NodeModule, element: HTMLElement) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      setHoveredModule(module);
      setHoverPosition({
        top: elementRect.top - containerRect.top,
      });
    },
    []
  );

  const handleModuleLeave = useCallback(() => {
    setHoveredModule(null);
  }, []);

  const filteredModules = modules.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const devCount = modules.filter((m) => m.is_dev).length;
  const outdatedCount = outdatedInfo.size;

  if (loading) {
    return (
      <div className="p-4 text-text-secondary text-sm flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading modules...
      </div>
    );
  }

  if (modules.length === 0 && activeTab === "installed") {
    return (
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <TabHeader activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="p-4 text-center flex-1 flex flex-col items-center justify-center">
          <Package className="w-8 h-8 text-text-secondary mx-auto mb-2" />
          <p className="text-sm text-text-secondary">No dependencies found</p>
          <p className="text-xs text-text-secondary mt-1">
            No package.json or node_modules
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full relative">
      {/* Tabs */}
      <TabHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "installed" ? (
        <>
          {/* Search + Check Updates */}
          <div className="p-2 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter modules..."
                className="pl-7 h-7 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={checkForUpdates}
              disabled={checkingUpdates}
              className="w-full text-xs h-7"
            >
              {checkingUpdates ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              )}
              {checkingUpdates ? "Checking..." : "Check for updates"}
            </Button>
          </div>

          {/* Modules List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {filteredModules.map((module) => (
                <ModuleRow
                  key={module.name}
                  module={module}
                  outdatedInfo={outdatedInfo.get(module.name)}
                  onHover={handleModuleHover}
                  onLeave={handleModuleLeave}
                  isUninstalling={uninstallingPackage === module.name}
                />
              ))}

              {filteredModules.length === 0 && (
                <p className="text-xs text-text-secondary text-center py-4">
                  No modules match "{search}"
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border">
            <p className="text-xs text-text-secondary">
              {modules.length} package{modules.length !== 1 ? "s" : ""}{" "}
              <span className="text-accent-blue">({devCount} dev)</span>
              {outdatedCount > 0 && (
                <span className="text-accent-yellow ml-1">
                  {" "}
                  • {outdatedCount} outdated
                </span>
              )}
            </p>
          </div>

          {/* Hover Card */}
          {hoveredModule && (
            <PackageHoverCard
              module={hoveredModule}
              outdatedInfo={outdatedInfo.get(hoveredModule.name)}
              position={hoverPosition}
              onUpdate={() => handleUpdatePackage(hoveredModule.name)}
              onUninstall={() => handleUninstallPackage(hoveredModule.name)}
              isUpdating={updatingPackage === hoveredModule.name}
              isUninstalling={uninstallingPackage === hoveredModule.name}
            />
          )}
        </>
      ) : (
        <NpmSearch projectPath={projectPath} onPackageInstalled={loadModules} />
      )}
    </div>
  );
}

interface TabHeaderProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
}

function TabHeader({ activeTab, onTabChange }: TabHeaderProps) {
  return (
    <div className="flex border-b border-border">
      <button
        onClick={() => onTabChange("installed")}
        className={cn(
          "flex-1 py-2 text-xs font-medium transition-colors",
          "border-b-2 -mb-px",
          activeTab === "installed"
            ? "border-accent text-text-primary"
            : "border-transparent text-text-secondary hover:text-text-primary"
        )}
      >
        Installed
      </button>
      <button
        onClick={() => onTabChange("search")}
        className={cn(
          "flex-1 py-2 text-xs font-medium transition-colors",
          "border-b-2 -mb-px",
          activeTab === "search"
            ? "border-accent text-text-primary"
            : "border-transparent text-text-secondary hover:text-text-primary"
        )}
      >
        Search npm
      </button>
    </div>
  );
}

interface ModuleRowProps {
  module: NodeModule;
  outdatedInfo?: OutdatedInfo;
  onHover: (module: NodeModule, element: HTMLElement) => void;
  onLeave: () => void;
  isUninstalling: boolean;
}

function ModuleRow({
  module,
  outdatedInfo,
  onHover,
  onLeave,
  isUninstalling,
}: ModuleRowProps) {
  const isOutdated = outdatedInfo && outdatedInfo.current !== outdatedInfo.latest;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer",
        "border border-transparent transition-colors",
        "hover:border-border hover:bg-bg-hover",
        isUninstalling && "opacity-50"
      )}
      onMouseEnter={(e) => onHover(module, e.currentTarget)}
      onMouseLeave={onLeave}
    >
      <Package className="w-3.5 h-3.5 text-accent-orange flex-shrink-0" />

      <span className="text-sm text-text-primary truncate flex-1">{module.name}</span>

      {isOutdated && (
        <AlertCircle className="w-3.5 h-3.5 text-accent-yellow flex-shrink-0" />
      )}

      <Badge
        variant={module.is_dev ? "info" : "default"}
        className="text-[10px] px-1 flex-shrink-0"
      >
        {module.is_dev ? "dev" : "prod"}
      </Badge>

      <Badge
        variant={isOutdated ? "warning" : outdatedInfo ? "success" : "default"}
        className="text-[10px] px-1.5 font-mono flex-shrink-0"
      >
        {module.version}
      </Badge>
    </div>
  );
}
