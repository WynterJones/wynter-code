import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  MessageSquare,
  Layers,
  Calendar,
  RefreshCw,
  Clock,
  Wrench,
  BarChart3,
  Flame,
  Zap,
  Database,
  Cpu,
  Trophy,
  Rocket,
  Target,
  TrendingUp,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { StatCard } from "./StatCard";
import { ActivityChart } from "./ActivityChart";
import { ModelUsageChart } from "./ModelUsageChart";
import { HourlyHeatmap } from "./HourlyHeatmap";
import { StatsCache, DateRange } from "./types";

interface ClaudeCodeStatsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = "overview" | "activity" | "models" | "sessions";

interface Tab {
  id: TabId;
  label: string;
  icon: typeof BarChart3;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "activity", label: "Daily Activity", icon: Calendar },
  { id: "models", label: "Model Usage", icon: Layers },
  { id: "sessions", label: "Sessions", icon: Clock },
];

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

const formatDuration = (ms: number): string => {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatShortDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatHour = (hour: number): string => {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
};

export function ClaudeCodeStatsPopup({
  isOpen,
  onClose,
}: ClaudeCodeStatsPopupProps) {
  const [stats, setStats] = useState<StatsCache | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<StatsCache>("read_claude_stats");
      setStats(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen, fetchStats]);

  const getFilteredActivity = () => {
    if (!stats) return [];
    const activity = [...stats.dailyActivity].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (dateRange === "7d") return activity.slice(-7);
    if (dateRange === "30d") return activity.slice(-30);
    return activity;
  };

  const getTotalTokens = (): number => {
    if (!stats) return 0;
    return Object.values(stats.modelUsage).reduce(
      (sum, m) => sum + m.inputTokens + m.outputTokens,
      0
    );
  };

  const getActiveDays = (): number => {
    return stats?.dailyActivity.length || 0;
  };

  const getTotalToolCalls = (): number => {
    if (!stats) return 0;
    return stats.dailyActivity.reduce((sum, day) => sum + day.toolCallCount, 0);
  };

  const getJourneyDays = (): number => {
    if (!stats?.firstSessionDate) return 0;
    const start = new Date(stats.firstSessionDate);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getAvgMessagesPerSession = (): number => {
    if (!stats || stats.totalSessions === 0) return 0;
    return Math.round(stats.totalMessages / stats.totalSessions);
  };

  const getPeakHour = (): string => {
    if (!stats?.hourCounts) return "N/A";
    const entries = Object.entries(stats.hourCounts);
    if (entries.length === 0) return "N/A";
    const [hour] = entries.reduce((max, curr) =>
      curr[1] > max[1] ? curr : max
    );
    return formatHour(parseInt(hour));
  };

  const getCurrentStreak = (): number => {
    if (!stats?.dailyActivity.length) return 0;
    const sortedDays = [...stats.dailyActivity]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDays.length; i++) {
      const dayDate = new Date(sortedDays[i].date);
      dayDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (dayDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (i === 0 && dayDate.getTime() === expectedDate.getTime() - 86400000) {
        // Allow for yesterday being the last activity day
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const getModelsUsed = (): number => {
    if (!stats?.modelUsage) return 0;
    return Object.keys(stats.modelUsage).length;
  };

  const getCacheHits = (): number => {
    if (!stats?.modelUsage) return 0;
    return Object.values(stats.modelUsage).reduce(
      (sum, m) => sum + m.cacheReadInputTokens, 0
    );
  };

  const getAvgMessagesPerDay = (): number => {
    if (!stats || stats.dailyActivity.length === 0) return 0;
    return Math.round(stats.totalMessages / stats.dailyActivity.length);
  };

  const getInputTokens = (): number => {
    if (!stats?.modelUsage) return 0;
    return Object.values(stats.modelUsage).reduce(
      (sum, m) => sum + m.inputTokens, 0
    );
  };

  const getOutputTokens = (): number => {
    if (!stats?.modelUsage) return 0;
    return Object.values(stats.modelUsage).reduce(
      (sum, m) => sum + m.outputTokens, 0
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 text-accent animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="text-text-secondary text-sm">{error}</div>
          <button
            onClick={fetchStats}
            className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent/90 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!stats) return null;

    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-4">
            {/* Row 1: Core Stats */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard
                icon={MessageSquare}
                value={formatNumber(stats.totalMessages)}
                label="Total Messages"
                color="accent"
              />
              <StatCard
                icon={Layers}
                value={formatNumber(stats.totalSessions)}
                label="Sessions"
                color="blue"
              />
              <StatCard
                icon={Wrench}
                value={formatNumber(getTotalToolCalls())}
                label="Tool Calls"
                color="purple"
              />
              <StatCard
                icon={Calendar}
                value={getActiveDays().toString()}
                label="Active Days"
                color="green"
              />
            </div>

            {/* Row 2: Fun Stats */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard
                icon={Calendar}
                value={getJourneyDays().toString()}
                label="Journey Days"
                subValue="since first session"
                color="yellow"
              />
              <StatCard
                icon={Flame}
                value={getCurrentStreak().toString()}
                label="Current Streak"
                subValue="consecutive days"
                color="accent"
              />
              <StatCard
                icon={Target}
                value={getAvgMessagesPerSession().toString()}
                label="Avg/Session"
                subValue="messages"
                color="blue"
              />
              <StatCard
                icon={TrendingUp}
                value={formatNumber(getAvgMessagesPerDay())}
                label="Avg/Day"
                subValue="messages"
                color="green"
              />
            </div>

            {/* Row 3: Token Stats */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard
                icon={Zap}
                value={formatNumber(getInputTokens())}
                label="Input Tokens"
                color="cyan"
              />
              <StatCard
                icon={Zap}
                value={formatNumber(getOutputTokens())}
                label="Output Tokens"
                color="orange"
              />
              <StatCard
                icon={Database}
                value={formatNumber(getCacheHits())}
                label="Cache Hits"
                subValue="tokens saved"
                color="green"
              />
              <StatCard
                icon={Cpu}
                value={getModelsUsed().toString()}
                label="Models Used"
                color="purple"
              />
            </div>

            {/* Row 4: Records */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard
                icon={Trophy}
                value={formatDuration(stats.longestSession.duration)}
                label="Longest Session"
                subValue={`${formatNumber(stats.longestSession.messageCount)} msgs`}
                color="yellow"
              />
              <StatCard
                icon={Clock}
                value={getPeakHour()}
                label="Peak Hour"
                subValue="most active"
                color="red"
              />
              <StatCard
                icon={BarChart3}
                value={formatNumber(getTotalTokens())}
                label="Total Tokens"
                color="cyan"
              />
              <StatCard
                icon={Rocket}
                value={formatShortDate(stats.firstSessionDate)}
                label="First Session"
                subValue={new Date(stats.firstSessionDate).getFullYear().toString()}
                color="blue"
              />
            </div>
          </div>
        );

      case "activity":
        return (
          <div className="space-y-4">
            <div className="bg-bg-secondary rounded-lg p-4">
              <ActivityChart
                data={getFilteredActivity()}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
            <div className="bg-bg-secondary rounded-lg p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">
                Daily Breakdown
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {[...getFilteredActivity()].reverse().map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <span className="text-sm text-text-primary">
                      {formatDate(day.date)}
                    </span>
                    <div className="flex gap-4 text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {formatNumber(day.messageCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {day.sessionCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        {formatNumber(day.toolCallCount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "models":
        return (
          <div className="bg-bg-secondary rounded-lg p-4">
            <ModelUsageChart modelUsage={stats.modelUsage} />
          </div>
        );

      case "sessions":
        return (
          <div className="space-y-4">
            <div className="bg-bg-secondary rounded-lg p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">
                Hourly Distribution
              </h3>
              <HourlyHeatmap hourCounts={stats.hourCounts} />
            </div>

            <div className="bg-bg-secondary rounded-lg p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">
                Session Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-secondary">
                    Total Sessions
                  </span>
                  <span className="text-sm text-text-primary font-medium">
                    {formatNumber(stats.totalSessions)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-secondary">
                    First Session
                  </span>
                  <span className="text-sm text-text-primary">
                    {formatDate(stats.firstSessionDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-secondary">
                    Longest Session
                  </span>
                  <span className="text-sm text-text-primary">
                    {formatDuration(stats.longestSession.duration)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-text-secondary">
                    Longest Session Messages
                  </span>
                  <span className="text-sm text-text-primary">
                    {formatNumber(stats.longestSession.messageCount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" title="Claude Code Stats">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
                    activeTab === tab.id
                      ? "bg-accent text-black"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {stats && (
              <span className="text-xs text-text-tertiary">
                Updated: {formatDate(stats.lastComputedDate)}
              </span>
            )}
            <Tooltip content="Refresh">
              <IconButton
                size="sm"
                onClick={fetchStats}
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <OverlayScrollbarsComponent
          options={{
            scrollbars: {
              theme: "os-theme-light",
              autoHide: "leave",
              autoHideDelay: 100,
            },
          }}
          className="flex-1 overflow-auto"
        >
          <div className="p-4">{renderContent()}</div>
        </OverlayScrollbarsComponent>
      </div>
    </Modal>
  );
}
