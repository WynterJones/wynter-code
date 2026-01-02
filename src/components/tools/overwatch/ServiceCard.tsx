import { useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import {
  Train,
  BarChart3,
  Globe,
  Bug,
  MoreVertical,
  RefreshCw,
  ExternalLink,
  Pencil,
  Trash2,
  Link as LinkIcon,
  Server,
  Database,
  Cloud,
  Shield,
  Zap,
  Box,
  Layers,
  Monitor,
  Cpu,
  HardDrive,
  Wifi,
  Lock,
  Key,
  FileCode,
  GitBranch,
  Terminal,
  Settings,
  Activity,
} from "lucide-react";
import { IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { StatusIndicator } from "./StatusIndicator";
import type {
  ServiceConfig,
  ServiceData,
  ServiceProvider,
  RailwayMetrics,
  PlausibleMetrics,
  NetlifyMetrics,
  SentryMetrics,
} from "@/types/overwatch";

interface ServiceCardProps {
  config: ServiceConfig;
  data?: ServiceData;
  isRefreshing?: boolean;
  onRefresh: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const PROVIDER_ICONS: Record<ServiceProvider, typeof Train> = {
  railway: Train,
  plausible: BarChart3,
  netlify: Globe,
  sentry: Bug,
  link: LinkIcon,
};

const PROVIDER_COLORS: Record<ServiceProvider, string> = {
  railway: "#9B4DFF",
  plausible: "#5850EC",
  netlify: "#00C7B7",
  sentry: "#362D59",
  link: "#6c7086",
};

// Map of icon IDs to components for Link services
const LINK_ICON_MAP: Record<string, typeof Train> = {
  link: LinkIcon,
  globe: Globe,
  server: Server,
  database: Database,
  cloud: Cloud,
  shield: Shield,
  zap: Zap,
  box: Box,
  layers: Layers,
  monitor: Monitor,
  cpu: Cpu,
  "hard-drive": HardDrive,
  wifi: Wifi,
  lock: Lock,
  key: Key,
  "file-code": FileCode,
  "git-branch": GitBranch,
  terminal: Terminal,
  settings: Settings,
  activity: Activity,
};

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function RailwayMetricsDisplay({ metrics }: { metrics: RailwayMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="text-xs text-text-secondary">Status</div>
        <div className="text-sm font-medium capitalize">{metrics.deploymentStatus}</div>
      </div>
      <div>
        <div className="text-xs text-text-secondary">Services</div>
        <div className="text-sm font-medium">{metrics.serviceCount}</div>
      </div>
      {metrics.environmentName && (
        <div className="col-span-2">
          <div className="text-xs text-text-secondary">Environment</div>
          <div className="text-sm font-medium">{metrics.environmentName}</div>
        </div>
      )}
    </div>
  );
}

function PlausibleMetricsDisplay({ metrics }: { metrics: PlausibleMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="text-xs text-text-secondary">Visitors</div>
        <div className="text-sm font-medium">{metrics.visitors.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-xs text-text-secondary">Pageviews</div>
        <div className="text-sm font-medium">{metrics.pageviews.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-xs text-text-secondary">Bounce Rate</div>
        <div className="text-sm font-medium">{metrics.bounceRate.toFixed(1)}%</div>
      </div>
      <div>
        <div className="text-xs text-text-secondary">Avg. Duration</div>
        <div className="text-sm font-medium">{Math.round(metrics.visitDuration)}s</div>
      </div>
    </div>
  );
}

function NetlifyMetricsDisplay({ metrics }: { metrics: NetlifyMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="text-xs text-text-secondary">Build Status</div>
        <div className="text-sm font-medium capitalize">{metrics.buildStatus}</div>
      </div>
      <div>
        <div className="text-xs text-text-secondary">Deploy Time</div>
        <div className="text-sm font-medium">
          {metrics.deployTime ? `${metrics.deployTime}s` : "-"}
        </div>
      </div>
      <div className="col-span-2">
        <div className="text-xs text-text-secondary">Site</div>
        <div className="text-sm font-medium truncate">{metrics.siteName}</div>
      </div>
    </div>
  );
}

function SentryMetricsDisplay({ metrics }: { metrics: SentryMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="text-xs text-text-secondary">Unresolved</div>
        <div className="text-sm font-medium">{metrics.unresolvedIssues}</div>
      </div>
      <div>
        <div className="text-xs text-text-secondary">Last 24h</div>
        <div className="text-sm font-medium">{metrics.issuesLast24h} issues</div>
      </div>
      <div>
        <div className="text-xs text-text-secondary">Crash Free</div>
        <div className="text-sm font-medium">{metrics.crashFreeRate.toFixed(1)}%</div>
      </div>
      <div>
        <div className="text-xs text-text-secondary">Events (24h)</div>
        <div className="text-sm font-medium">{metrics.eventsLast24h.toLocaleString()}</div>
      </div>
    </div>
  );
}

export function ServiceCard({
  config,
  data,
  isRefreshing,
  onRefresh,
  onEdit,
  onDelete,
}: ServiceCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isLink = config.provider === "link";

  // For link services, use custom icon/color if set, otherwise use defaults
  const Icon = isLink && config.linkIcon
    ? LINK_ICON_MAP[config.linkIcon] || LinkIcon
    : PROVIDER_ICONS[config.provider];
  const color = isLink && config.linkColor
    ? config.linkColor
    : PROVIDER_COLORS[config.provider];
  const status = data?.status ?? "unknown";

  return (
    <div className="relative group bg-surface border border-border rounded-lg overflow-hidden hover:border-accent/50 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{config.name}</div>
            <div className="flex items-center gap-1.5">
              {isLink ? (
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <LinkIcon className="w-3 h-3" />
                  <span>Quick link</span>
                </div>
              ) : (
                <StatusIndicator status={status} size="sm" showLabel />
              )}
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <IconButton
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Service options menu"
          >
            <MoreVertical className="w-4 h-4" />
          </IconButton>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 w-32 py-1 bg-bg-secondary border border-border rounded-lg shadow-lg dropdown-solid">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-hover flex items-center gap-2"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-surface-hover flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {isLink ? (
          <div className="text-sm text-text-secondary">
            Click to open external link
          </div>
        ) : data?.error ? (
          <div className="text-sm text-red-400">{data.error}</div>
        ) : data?.metrics ? (
          <>
            {config.provider === "railway" && (
              <RailwayMetricsDisplay metrics={data.metrics as RailwayMetrics} />
            )}
            {config.provider === "plausible" && (
              <PlausibleMetricsDisplay metrics={data.metrics as PlausibleMetrics} />
            )}
            {config.provider === "netlify" && (
              <NetlifyMetricsDisplay metrics={data.metrics as NetlifyMetrics} />
            )}
            {config.provider === "sentry" && (
              <SentryMetricsDisplay metrics={data.metrics as SentryMetrics} />
            )}
          </>
        ) : (
          <div className="text-sm text-text-secondary">No data available</div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-surface-raised/50">
        <div className="text-xs text-text-secondary">
          {isLink ? (
            config.externalUrl ? new URL(config.externalUrl).hostname : "No URL"
          ) : (
            data?.lastUpdated ? formatTimeAgo(data.lastUpdated) : "Never updated"
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isLink && (
            <Tooltip content="Refresh">
              <IconButton
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label="Refresh service status"
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
                />
              </IconButton>
            </Tooltip>
          )}
          {config.externalUrl && (
            <Tooltip content={isLink ? "Open Link" : "Open Dashboard"}>
              <IconButton
                size="sm"
                onClick={() => open(config.externalUrl!)}
                aria-label={isLink ? "Open external link" : "Open service dashboard"}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
