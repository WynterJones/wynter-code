import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  FileJson,
  Play,
  User,
  Scale,
  Globe,
  GitFork,
  Bug,
  Tag,
  Wrench,
  FileCode,
  Box,
  ExternalLink,
} from "lucide-react";
import { ScrollArea, Badge } from "@/components/ui";

interface PackageInfoProps {
  projectPath: string;
}

interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  module?: string;
  types?: string;
  type?: string;
  scripts?: Record<string, string>;
  author?: string | { name: string; email?: string; url?: string };
  license?: string;
  repository?: string | { type: string; url: string };
  bugs?: string | { url: string; email?: string };
  homepage?: string;
  keywords?: string[];
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  private?: boolean;
}

function getAuthorString(author: PackageJson["author"]): string {
  if (!author) return "";
  if (typeof author === "string") return author;
  return author.name || "";
}

function getRepoUrl(repo: PackageJson["repository"]): string | null {
  if (!repo) return null;
  if (typeof repo === "string") {
    if (repo.startsWith("http")) return repo;
    if (repo.includes("/")) return `https://github.com/${repo}`;
    return null;
  }
  return repo.url?.replace(/^git\+/, "").replace(/\.git$/, "") || null;
}

function getBugsUrl(bugs: PackageJson["bugs"]): string | null {
  if (!bugs) return null;
  if (typeof bugs === "string") return bugs;
  return bugs.url || null;
}

export function PackageInfo({ projectPath }: PackageInfoProps) {
  const [packageJson, setPackageJson] = useState<PackageJson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackageJson();
  }, [projectPath]);

  const loadPackageJson = async () => {
    try {
      setLoading(true);
      const content = await invoke<string>("read_file_content", {
        path: `${projectPath}/package.json`,
      });
      setPackageJson(JSON.parse(content));
    } catch {
      setPackageJson(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-3 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 bg-bg-hover rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!packageJson) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <FileJson className="w-12 h-12 text-text-secondary mb-3" />
        <p className="text-sm text-text-secondary text-center">
          No package.json found in this project
        </p>
      </div>
    );
  }

  const repoUrl = getRepoUrl(packageJson.repository);
  const bugsUrl = getBugsUrl(packageJson.bugs);
  const depCount = Object.keys(packageJson.dependencies || {}).length;
  const devDepCount = Object.keys(packageJson.devDependencies || {}).length;
  const peerDepCount = Object.keys(packageJson.peerDependencies || {}).length;

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Package Header */}
        <div>
          <div className="flex items-start gap-2 mb-2">
            <FileJson className="w-5 h-5 text-accent-yellow mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-text-primary">
                  {packageJson.name || "Unnamed Package"}
                </h2>
                {packageJson.version && (
                  <Badge variant="info" className="text-[10px]">
                    v{packageJson.version}
                  </Badge>
                )}
                {packageJson.private && (
                  <Badge variant="default" className="text-[10px]">
                    private
                  </Badge>
                )}
              </div>
              {packageJson.description && (
                <p className="text-xs text-text-secondary mt-1">
                  {packageJson.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Package Metadata */}
        <div className="space-y-2">
          {packageJson.license && (
            <div className="flex items-center gap-2 text-xs">
              <Scale className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-text-secondary">License:</span>
              <span className="text-text-primary">{packageJson.license}</span>
            </div>
          )}

          {getAuthorString(packageJson.author) && (
            <div className="flex items-center gap-2 text-xs">
              <User className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-text-secondary">Author:</span>
              <span className="text-text-primary">
                {getAuthorString(packageJson.author)}
              </span>
            </div>
          )}

          {packageJson.type && (
            <div className="flex items-center gap-2 text-xs">
              <Box className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-text-secondary">Type:</span>
              <span className="text-text-primary">{packageJson.type}</span>
            </div>
          )}
        </div>

        {/* Entry Points */}
        {(packageJson.main || packageJson.module || packageJson.types) && (
          <div>
            <h3 className="text-xs font-medium text-text-secondary uppercase mb-2">
              Entry Points
            </h3>
            <div className="space-y-1.5 text-xs">
              {packageJson.main && (
                <div className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-accent-blue" />
                  <span className="text-text-secondary">main:</span>
                  <code className="text-text-primary font-mono text-[11px] bg-bg-hover px-1 rounded">
                    {packageJson.main}
                  </code>
                </div>
              )}
              {packageJson.module && (
                <div className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-accent-green" />
                  <span className="text-text-secondary">module:</span>
                  <code className="text-text-primary font-mono text-[11px] bg-bg-hover px-1 rounded">
                    {packageJson.module}
                  </code>
                </div>
              )}
              {packageJson.types && (
                <div className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-accent-purple" />
                  <span className="text-text-secondary">types:</span>
                  <code className="text-text-primary font-mono text-[11px] bg-bg-hover px-1 rounded">
                    {packageJson.types}
                  </code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Links */}
        {(packageJson.homepage || repoUrl || bugsUrl) && (
          <div>
            <h3 className="text-xs font-medium text-text-secondary uppercase mb-2">
              Links
            </h3>
            <div className="space-y-1.5 text-xs">
              {packageJson.homepage && (
                <a
                  href={packageJson.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-accent hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="truncate">{packageJson.homepage}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              )}
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-accent hover:underline"
                >
                  <GitFork className="w-3.5 h-3.5" />
                  <span className="truncate">{repoUrl}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              )}
              {bugsUrl && (
                <a
                  href={bugsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-accent hover:underline"
                >
                  <Bug className="w-3.5 h-3.5" />
                  <span className="truncate">{bugsUrl}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Keywords */}
        {packageJson.keywords && packageJson.keywords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-3.5 h-3.5 text-text-secondary" />
              <h3 className="text-xs font-medium text-text-secondary uppercase">
                Keywords
              </h3>
            </div>
            <div className="flex flex-wrap gap-1">
              {packageJson.keywords.map((keyword) => (
                <Badge key={keyword} variant="default" className="text-[10px]">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Engines */}
        {packageJson.engines && Object.keys(packageJson.engines).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-3.5 h-3.5 text-text-secondary" />
              <h3 className="text-xs font-medium text-text-secondary uppercase">
                Engines
              </h3>
            </div>
            <div className="space-y-1">
              {Object.entries(packageJson.engines).map(([engine, version]) => (
                <div key={engine} className="flex items-center gap-2 text-xs">
                  <span className="text-text-secondary">{engine}:</span>
                  <code className="text-text-primary font-mono text-[11px]">
                    {version}
                  </code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dependency Summary */}
        {(depCount > 0 || devDepCount > 0 || peerDepCount > 0) && (
          <div>
            <h3 className="text-xs font-medium text-text-secondary uppercase mb-2">
              Dependencies Summary
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {depCount > 0 && (
                <div className="text-center p-2 rounded bg-bg-hover/50">
                  <p className="text-sm font-semibold text-text-primary">
                    {depCount}
                  </p>
                  <p className="text-[10px] text-text-secondary">deps</p>
                </div>
              )}
              {devDepCount > 0 && (
                <div className="text-center p-2 rounded bg-bg-hover/50">
                  <p className="text-sm font-semibold text-text-primary">
                    {devDepCount}
                  </p>
                  <p className="text-[10px] text-text-secondary">dev</p>
                </div>
              )}
              {peerDepCount > 0 && (
                <div className="text-center p-2 rounded bg-bg-hover/50">
                  <p className="text-sm font-semibold text-text-primary">
                    {peerDepCount}
                  </p>
                  <p className="text-[10px] text-text-secondary">peer</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scripts */}
        {packageJson.scripts && Object.keys(packageJson.scripts).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Play className="w-3.5 h-3.5 text-accent-green" />
              <h3 className="text-xs font-medium text-text-secondary uppercase">
                Scripts ({Object.keys(packageJson.scripts).length})
              </h3>
            </div>
            <div className="space-y-1">
              {Object.entries(packageJson.scripts).map(([name, cmd]) => (
                <div
                  key={name}
                  className="p-1.5 rounded bg-bg-hover/30 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-accent-green font-medium">
                      {name}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary font-mono mt-0.5 break-all">
                    {cmd}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
