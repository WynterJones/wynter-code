import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Gauge,
  Clock,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Settings,
} from "lucide-react";
import {
  Popup,
  IconButton,
  Tooltip,
  HorizontalTabs,
  HorizontalTabsList,
  HorizontalTabsTrigger,
  HorizontalTabsContent,
} from "@/components/ui";
import { useSettingsStore, ClaudeSubscriptionPlan } from "@/stores/settingsStore";
import {
  UsageSummary,
  PLAN_LIMITS,
  SubscriptionPlan,
  getWarningLevel,
  formatDuration,
  formatTokens,
  formatHours,
} from "./types";

interface LimitsMonitorPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = "overview" | "weekly" | "settings";

interface Tab {
  id: TabId;
  label: string;
  icon: typeof Gauge;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "weekly", label: "Weekly Limits", icon: Calendar },
  { id: "settings", label: "Settings", icon: Settings },
];

const POLL_INTERVAL = 5000; // 5 seconds

const getStatusColor = (level: "safe" | "warning" | "danger") => {
  switch (level) {
    case "safe":
      return "text-green-400";
    case "warning":
      return "text-yellow-400";
    case "danger":
      return "text-red-400";
  }
};

const getProgressColor = (level: "safe" | "warning" | "danger") => {
  switch (level) {
    case "safe":
      return "bg-green-500";
    case "warning":
      return "bg-yellow-500";
    case "danger":
      return "bg-red-500";
  }
};

const formatCountdown = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

function UsageGauge({
  label,
  current,
  max,
  unit,
  showHours = false,
}: {
  label: string;
  current: number;
  max: number;
  unit: string;
  showHours?: boolean;
}) {
  const percent = Math.min((current / max) * 100, 100);
  const level = getWarningLevel(percent);

  return (
    <div className="bg-bg-secondary rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className={`text-sm font-medium ${getStatusColor(level)}`}>
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${getProgressColor(level)} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <span>
          {showHours ? formatHours(current) : formatTokens(current)} / {showHours ? formatHours(max) : formatTokens(max)}
        </span>
        <span>{unit}</span>
      </div>
    </div>
  );
}

export function LimitsMonitorPopup({ isOpen, onClose }: LimitsMonitorPopupProps) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { claudeSubscriptionPlan, setClaudeSubscriptionPlan } = useSettingsStore();
  const planLimits = PLAN_LIMITS[claudeSubscriptionPlan as SubscriptionPlan];

  const fetchUsage = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const result = await invoke<UsageSummary>("calculate_usage_summary");
      setUsage(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Small delay to prevent blocking UI on mount
      const timeoutId = setTimeout(() => {
        fetchUsage(true);
      }, 100);

      intervalRef.current = setInterval(() => {
        fetchUsage(false);
      }, POLL_INTERVAL);

      return () => {
        clearTimeout(timeoutId);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, fetchUsage]);

  const getOpusUsagePercent = () => {
    if (!usage) return 0;
    return (usage.weeklyOpusHours / planLimits.opus.maxHours) * 100;
  };

  const renderLoadingState = () => (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-6 h-6 text-accent animate-spin" />
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle className="w-8 h-8 text-yellow-500" />
      <div className="text-text-secondary text-sm text-center">{error}</div>
      <button
        onClick={() => fetchUsage(true)}
        className="px-3 py-1.5 text-sm bg-accent text-primary-950 rounded hover:bg-accent/90 transition-colors"
      >
        Retry
      </button>
    </div>
  );

  const renderOverviewContent = () => {
    if (loading && !usage) return renderLoadingState();
    if (error) return renderErrorState();
    if (!usage) return null;

    const opusLevel = getWarningLevel(getOpusUsagePercent());

    return (
      <div className="space-y-4">
        {/* Main Opus Gauge - Full Width */}
        <UsageGauge
          label="Opus Usage"
          current={usage.weeklyOpusHours}
          max={planLimits.opus.maxHours}
          unit="hours this week"
          showHours
        />

        {/* Countdown Cards - Better Design */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Clock className="w-4 h-4 text-accent" />
              </div>
              <span className="text-xs text-text-tertiary font-medium uppercase tracking-wide">
                Block Reset
              </span>
            </div>
            <div className="text-3xl font-mono font-semibold text-text-primary tracking-tight">
              {formatCountdown(usage.timeUntilBlockReset)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <Calendar className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-xs text-text-tertiary font-medium uppercase tracking-wide">
                Weekly Reset
              </span>
            </div>
            <div className="text-3xl font-mono font-semibold text-text-primary tracking-tight">
              {formatCountdown(usage.timeUntilWeeklyReset)}
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        {opusLevel === "danger" && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-300">
              Approaching Opus limits! Consider slowing down to avoid rate limiting.
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderWeeklyContent = () => {
    if (loading && !usage) return renderLoadingState();
    if (error) return renderErrorState();
    if (!usage) return null;

    return (
      <div className="space-y-4">
        {/* Weekly Summary - Opus Only */}
        <div className="bg-bg-secondary rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">
            Weekly Opus Usage
          </h3>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Opus</span>
              <span className="text-sm text-text-primary">
                {formatHours(usage.weeklyOpusHours)} /{" "}
                {formatHours(planLimits.opus.maxHours)}
              </span>
            </div>
            <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(getWarningLevel(getOpusUsagePercent()))} transition-all duration-300`}
                style={{ width: `${Math.min(getOpusUsagePercent(), 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-text-tertiary">
              <span>Min: {formatHours(planLimits.opus.minHours)}</span>
              <span>Max: {formatHours(planLimits.opus.maxHours)}</span>
            </div>
          </div>
        </div>

        {/* Token Breakdown - Opus Only */}
        <div className="bg-bg-secondary rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">
            Weekly Token Usage
          </h3>
          <div className="text-center">
            <div className="text-3xl font-medium text-text-primary">
              {formatTokens(usage.weeklyOpusTokens)}
            </div>
            <div className="text-xs text-text-tertiary mt-1">Opus Tokens</div>
          </div>
        </div>

        {/* Reset Info */}
        <div className="bg-bg-secondary rounded-lg p-4 text-center">
          <div className="text-xs text-text-tertiary mb-1">Resets on</div>
          <div className="text-sm text-text-primary">
            Monday 00:00 UTC ({formatDuration(usage.timeUntilWeeklyReset)} remaining)
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsContent = () => {
    return (
      <div className="space-y-4">
        <div className="bg-bg-secondary rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">
            Subscription Plan
          </h3>
          <p className="text-xs text-text-tertiary mb-3">
            Select your Claude subscription plan to set Opus usage limits.
          </p>
          <select
            value={claudeSubscriptionPlan}
            onChange={(e) =>
              setClaudeSubscriptionPlan(e.target.value as ClaudeSubscriptionPlan)
            }
            className="w-full px-3 py-2 text-sm bg-bg-primary border border-border rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          >
            <option value="pro">Pro ($20/month)</option>
            <option value="max-100">Max ($100/month)</option>
            <option value="max-200">Max ($200/month)</option>
          </select>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">
            Opus Limits
          </h3>
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-text-secondary">Weekly Limit</span>
            <span className="text-text-primary">
              {planLimits.opus.minHours} - {planLimits.opus.maxHours} hours
            </span>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-2">
            About Limits
          </h3>
          <p className="text-xs text-text-tertiary leading-relaxed">
            Claude Code uses a 5-hour rolling window and weekly quotas to manage usage.
            Limits are approximate and may vary. The "min" value is a soft target,
            while "max" is the hard limit before rate limiting kicks in.
          </p>
        </div>
      </div>
    );
  };

  return (
    <Popup isOpen={isOpen} onClose={onClose} size="medium">
      <Popup.Header
        icon={Gauge}
        title="Claude Limits Monitor"
        actions={
          <div className="flex items-center gap-2">
            {usage && (
              <span className="text-xs text-text-tertiary">
                Updated: {new Date(usage.lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <Tooltip content="Refresh">
              <IconButton
                size="sm"
                onClick={() => fetchUsage(false)}
                disabled={loading}
                aria-label="Refresh usage data"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </IconButton>
            </Tooltip>
          </div>
        }
      />
      <HorizontalTabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabId)}
        defaultValue="overview"
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="flex items-center px-4 py-2 border-b border-border">
          <HorizontalTabsList>
            {TABS.map((tab) => (
              <HorizontalTabsTrigger
                key={tab.id}
                value={tab.id}
                icon={tab.icon}
                label={tab.label}
              />
            ))}
          </HorizontalTabsList>
        </div>
        <Popup.Content scrollable padding="md" className="flex-1">
          <HorizontalTabsContent value="overview">
            {renderOverviewContent()}
          </HorizontalTabsContent>
          <HorizontalTabsContent value="weekly">
            {renderWeeklyContent()}
          </HorizontalTabsContent>
          <HorizontalTabsContent value="settings">
            {renderSettingsContent()}
          </HorizontalTabsContent>
        </Popup.Content>
      </HorizontalTabs>
    </Popup>
  );
}
