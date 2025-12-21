import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  FolderOpen,
  File,
  Folder,
  HardDrive,
  FileCode,
  Calendar,
  Star,
  Package,
  RefreshCw,
} from "lucide-react";
import { ScrollArea, Badge } from "@/components/ui";
import type { Project } from "@/types";
import { formatDate } from "@/lib/utils";

interface ProjectInfoProps {
  project: Project;
}

interface DirectoryStats {
  fileCount: number;
  folderCount: number;
  totalSize: number;
  nodeModulesSize: number;
  linesOfCode: number;
  fileTypeCounts: Record<string, number>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function ProjectInfo({ project }: ProjectInfoProps) {
  const [stats, setStats] = useState<DirectoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, [project.path]);

  const loadStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const result = await invoke<DirectoryStats>("get_directory_stats", {
        projectPath: project.path,
      });
      setStats(result);
    } catch (err) {
      console.error("Failed to load stats:", err);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const topFileTypes = stats
    ? Object.entries(stats.fileTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    : [];

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Project Details */}
        <div>
          <h3 className="text-xs font-medium text-text-secondary uppercase mb-2">
            Project
          </h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <FolderOpen className="w-4 h-4 text-accent-yellow mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {project.name}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {project.path}
                </p>
              </div>
            </div>

            {project.isFavorite && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-accent-yellow" fill="currentColor" />
                <span className="text-xs text-text-secondary">Favorite</span>
              </div>
            )}

            {project.lastOpenedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-text-secondary" />
                <span className="text-xs text-text-secondary">
                  Last opened: {formatDate(new Date(project.lastOpenedAt))}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Directory Statistics */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-text-secondary uppercase">
              Statistics
            </h3>
            <button
              onClick={() => loadStats(true)}
              disabled={refreshing}
              className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-5 bg-bg-hover rounded animate-pulse" />
              ))}
            </div>
          ) : stats ? (
            <div className="space-y-3">
              {/* File/Folder Counts */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 rounded bg-bg-hover/50">
                  <File className="w-4 h-4 text-accent-blue" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {formatNumber(stats.fileCount)}
                    </p>
                    <p className="text-[10px] text-text-secondary">Files</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-bg-hover/50">
                  <Folder className="w-4 h-4 text-accent-yellow" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {formatNumber(stats.folderCount)}
                    </p>
                    <p className="text-[10px] text-text-secondary">Folders</p>
                  </div>
                </div>
              </div>

              {/* Size & Code Stats */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-3.5 h-3.5 text-text-secondary" />
                    <span className="text-text-secondary">Source Size</span>
                  </div>
                  <span className="text-text-primary font-medium">
                    {formatBytes(stats.totalSize)}
                  </span>
                </div>
                {stats.nodeModulesSize > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-accent-purple" />
                      <span className="text-text-secondary">node_modules</span>
                    </div>
                    <span className="text-text-primary font-medium">
                      {formatBytes(stats.nodeModulesSize)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-accent-blue" />
                    <span className="text-text-secondary">Lines of Code</span>
                  </div>
                  <span className="text-text-primary font-medium">
                    {formatNumber(stats.linesOfCode)}
                  </span>
                </div>
              </div>

              {/* File Types */}
              {topFileTypes.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-medium text-text-secondary uppercase mb-1.5">
                    Top File Types
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {topFileTypes.map(([ext, count]) => (
                      <Badge key={ext} variant="default" className="text-[10px]">
                        .{ext} ({formatNumber(count)})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-secondary">
              Failed to load statistics
            </p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
