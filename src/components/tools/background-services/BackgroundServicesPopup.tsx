import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  RefreshCw,
  Server,
  AlertCircle,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Database,
  Globe,
  Code,
  MessageSquare,
  Zap,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Modal, IconButton, Tooltip } from "@/components/ui";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import type { BackgroundService, ServiceCategory } from "./types";
import { CATEGORY_CONFIG } from "./types";

interface BackgroundServicesPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProcessGroup {
  name: string;
  services: BackgroundService[];
  totalMemory: number;
}

const REFRESH_INTERVAL = 3000;

const CATEGORY_ICONS: Record<ServiceCategory, React.ReactNode> = {
  databases: <Database className="w-4 h-4" />,
  web_servers: <Globe className="w-4 h-4" />,
  dev_servers: <Code className="w-4 h-4" />,
  message_queues: <MessageSquare className="w-4 h-4" />,
  other: <Zap className="w-4 h-4" />,
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function BackgroundServicesPopup({
  isOpen,
  onClose,
}: BackgroundServicesPopupProps) {
  const [services, setServices] = useState<BackgroundService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [killingPid, setKillingPid] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["databases", "dev_servers", "web_servers", "message_queues"])
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchServices = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const result = await invoke<BackgroundService[]>(
        "list_background_services"
      );
      setServices(result);
    } catch (err) {
      setError(err as string);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchServices(true);

      intervalRef.current = setInterval(() => {
        fetchServices(false);
      }, REFRESH_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, fetchServices]);

  const handleKillProcess = async (pid: number) => {
    setKillingPid(pid);
    try {
      await invoke("kill_process", { pid });
      await fetchServices(false);
    } catch (err) {
      setError(`Failed to kill process: ${err}`);
    } finally {
      setKillingPid(null);
    }
  };

  const handleKillGroup = async (group: ProcessGroup) => {
    for (const service of group.services) {
      try {
        await invoke("kill_process", { pid: service.pid });
      } catch (err) {
        console.error(`Failed to kill PID ${service.pid}:`, err);
      }
    }
    await fetchServices(false);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const query = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        s.pid.toString().includes(query)
    );
  }, [services, searchQuery]);

  const groupedByCategory = useMemo(() => {
    const categories: Record<ServiceCategory, ProcessGroup[]> = {
      databases: [],
      web_servers: [],
      dev_servers: [],
      message_queues: [],
      other: [],
    };

    // First group by category
    const byCategory: Record<ServiceCategory, BackgroundService[]> = {
      databases: [],
      web_servers: [],
      dev_servers: [],
      message_queues: [],
      other: [],
    };

    for (const service of filteredServices) {
      const category = service.category as ServiceCategory;
      if (byCategory[category]) {
        byCategory[category].push(service);
      } else {
        byCategory.other.push(service);
      }
    }

    // Then group by name within each category
    for (const [category, categoryServices] of Object.entries(byCategory)) {
      const byName: Record<string, BackgroundService[]> = {};

      for (const service of categoryServices) {
        if (!byName[service.name]) {
          byName[service.name] = [];
        }
        byName[service.name].push(service);
      }

      // Convert to ProcessGroup array
      const groups: ProcessGroup[] = Object.entries(byName).map(([name, services]) => ({
        name,
        services: services.sort((a, b) => b.memoryBytes - a.memoryBytes),
        totalMemory: services.reduce((sum, s) => sum + s.memoryBytes, 0),
      }));

      // Sort by total memory (descending)
      groups.sort((a, b) => b.totalMemory - a.totalMemory);

      categories[category as ServiceCategory] = groups;
    }

    return categories;
  }, [filteredServices]);

  const categoryOrder: ServiceCategory[] = [
    "databases",
    "web_servers",
    "dev_servers",
    "message_queues",
    "other",
  ];

  const totalGroups = useMemo(() => {
    return Object.values(groupedByCategory).reduce(
      (sum, groups) => sum + groups.length,
      0
    );
  }, [groupedByCategory]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Background Services"
      size="lg"
    >
      <div className="flex flex-col h-[550px] p-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-accent" />
            <span className="text-sm text-text-secondary">
              {filteredServices.length} process{filteredServices.length !== 1 ? "es" : ""} in {totalGroups} group{totalGroups !== 1 ? "s" : ""}
            </span>
          </div>
          <Tooltip content="Refresh">
            <IconButton
              size="sm"
              onClick={() => fetchServices(true)}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </IconButton>
          </Tooltip>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-bg-tertiary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Content */}
        <OverlayScrollbarsComponent
          className="flex-1 -mx-1 px-1 os-theme-custom"
          options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
        >
          {error && (
            <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {loading && services.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-secondary">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Scanning services...
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
              <Server className="w-8 h-8 mb-2 opacity-50" />
              <p>
                {searchQuery
                  ? "No services match your search"
                  : "No developer services detected"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {categoryOrder.map((category) => {
                const processGroups = groupedByCategory[category];
                if (processGroups.length === 0) return null;

                const config = CATEGORY_CONFIG[category];
                const isCategoryExpanded = expandedCategories.has(category);
                const totalProcesses = processGroups.reduce(
                  (sum, g) => sum + g.services.length,
                  0
                );

                return (
                  <div key={category} className="rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-3 bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={config.color}>
                          {CATEGORY_ICONS[category]}
                        </span>
                        <span className="font-medium text-sm">
                          {config.label}
                        </span>
                        <span className="text-xs text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded">
                          {totalProcesses}
                        </span>
                      </div>
                      {isCategoryExpanded ? (
                        <ChevronDown className="w-4 h-4 text-text-secondary" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-secondary" />
                      )}
                    </button>

                    {isCategoryExpanded && (
                      <div className="divide-y divide-border">
                        {processGroups.map((group) => {
                          const groupKey = `${category}-${group.name}`;
                          const isGroupExpanded = expandedGroups.has(groupKey);
                          const hasMultiple = group.services.length > 1;

                          if (!hasMultiple) {
                            // Single process - render directly
                            const service = group.services[0];
                            return (
                              <div
                                key={service.pid}
                                className="flex items-center justify-between p-3 hover:bg-bg-tertiary/30 transition-colors group"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-medium text-text-primary truncate">
                                      {service.name}
                                    </span>
                                    {service.port && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono">
                                        :{service.port}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-text-secondary">
                                    <span>PID: {service.pid}</span>
                                    <span>{formatBytes(service.memoryBytes)}</span>
                                    <span className="capitalize">
                                      {service.status.toLowerCase()}
                                    </span>
                                  </div>
                                </div>

                                <Tooltip content="Kill Process">
                                  <IconButton
                                    size="sm"
                                    onClick={() => handleKillProcess(service.pid)}
                                    disabled={killingPid === service.pid}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 hover:bg-red-500/10"
                                  >
                                    {killingPid === service.pid ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </div>
                            );
                          }

                          // Multiple processes - render as expandable group
                          return (
                            <div key={groupKey}>
                              <button
                                onClick={() => toggleGroup(groupKey)}
                                className="w-full flex items-center justify-between p-3 hover:bg-bg-tertiary/30 transition-colors group"
                              >
                                <div className="flex items-center gap-2">
                                  {isGroupExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
                                  )}
                                  <span className="font-mono text-sm font-medium text-text-primary">
                                    {group.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                                    {group.services.length}
                                  </span>
                                  <span className="text-[11px] text-text-secondary">
                                    {formatBytes(group.totalMemory)} total
                                  </span>
                                </div>
                                <Tooltip content="Kill All">
                                  <IconButton
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleKillGroup(group);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </IconButton>
                                </Tooltip>
                              </button>

                              {isGroupExpanded && (
                                <div className="pl-8 divide-y divide-border/50">
                                  {group.services.map((service) => (
                                    <div
                                      key={service.pid}
                                      className="flex items-center justify-between p-2 hover:bg-bg-tertiary/20 transition-colors group/item"
                                    >
                                      <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                                        <span className="font-mono">PID: {service.pid}</span>
                                        <span>{formatBytes(service.memoryBytes)}</span>
                                        {service.port && (
                                          <span className="px-1 py-0.5 rounded bg-accent/10 text-accent font-mono">
                                            :{service.port}
                                          </span>
                                        )}
                                        <span className="capitalize">
                                          {service.status.toLowerCase()}
                                        </span>
                                      </div>
                                      <Tooltip content="Kill Process">
                                        <IconButton
                                          size="sm"
                                          onClick={() => handleKillProcess(service.pid)}
                                          disabled={killingPid === service.pid}
                                          className="opacity-0 group-hover/item:opacity-100 transition-opacity hover:text-red-400 hover:bg-red-500/10"
                                        >
                                          {killingPid === service.pid ? (
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Trash2 className="w-3 h-3" />
                                          )}
                                        </IconButton>
                                      </Tooltip>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </OverlayScrollbarsComponent>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-border">
          <p className="text-[11px] text-text-secondary/70">
            Shows developer services (databases, web servers, etc.). Kill
            processes with caution.
          </p>
        </div>
      </div>
    </Modal>
  );
}
