import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  FolderOpen,
  FileJson,
  Play,
  Calendar,
  Star,
} from "lucide-react";
import { ScrollArea, Badge } from "@/components/ui";
import type { Project } from "@/types";
import { formatDate } from "@/lib/utils";

interface ProjectInfoProps {
  project: Project;
}

interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  scripts?: Record<string, string>;
  author?: string | { name: string };
  license?: string;
}

export function ProjectInfo({ project }: ProjectInfoProps) {
  const [packageJson, setPackageJson] = useState<PackageJson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackageJson();
  }, [project.path]);

  const loadPackageJson = async () => {
    try {
      setLoading(true);
      const content = await invoke<string>("read_file_content", {
        path: `${project.path}/package.json`,
      });
      setPackageJson(JSON.parse(content));
    } catch {
      setPackageJson(null);
    } finally {
      setLoading(false);
    }
  };

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

        {/* Package.json Info */}
        {!loading && packageJson && (
          <>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="w-4 h-4 text-accent-yellow" />
                <h3 className="text-xs font-medium text-text-secondary uppercase">
                  Package Info
                </h3>
              </div>
              <div className="space-y-1 text-xs">
                {packageJson.version && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Version</span>
                    <Badge variant="info">{packageJson.version}</Badge>
                  </div>
                )}
                {packageJson.license && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">License</span>
                    <span className="text-text-primary">{packageJson.license}</span>
                  </div>
                )}
                {packageJson.description && (
                  <p className="text-text-secondary mt-2">
                    {packageJson.description}
                  </p>
                )}
              </div>
            </div>

            {/* Scripts */}
            {packageJson.scripts && Object.keys(packageJson.scripts).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Play className="w-4 h-4 text-accent-green" />
                  <h3 className="text-xs font-medium text-text-secondary uppercase">
                    Scripts
                  </h3>
                </div>
                <div className="space-y-1">
                  {Object.entries(packageJson.scripts).slice(0, 8).map(([name, cmd]) => (
                    <div
                      key={name}
                      className="flex items-start gap-2 p-1.5 rounded hover:bg-bg-hover cursor-pointer group"
                    >
                      <span className="text-xs font-mono text-accent flex-shrink-0">
                        {name}
                      </span>
                      <span className="text-xs text-text-secondary truncate">
                        {cmd}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !packageJson && (
          <div className="text-center py-4">
            <FileJson className="w-8 h-8 text-text-secondary mx-auto mb-2" />
            <p className="text-xs text-text-secondary">
              No package.json found
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
