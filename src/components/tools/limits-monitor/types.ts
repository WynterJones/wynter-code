export type SubscriptionPlan = "pro" | "max-100" | "max-200";

interface PlanLimits {
  name: string;
  monthlyPrice: number;
  sonnet: { minHours: number; maxHours: number };
  opus: { minHours: number; maxHours: number };
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  pro: {
    name: "Pro ($20/month)",
    monthlyPrice: 20,
    sonnet: { minHours: 40, maxHours: 80 },
    opus: { minHours: 4, maxHours: 8 },
  },
  "max-100": {
    name: "Max ($100/month)",
    monthlyPrice: 100,
    sonnet: { minHours: 140, maxHours: 280 },
    opus: { minHours: 15, maxHours: 35 },
  },
  "max-200": {
    name: "Max ($200/month)",
    monthlyPrice: 200,
    sonnet: { minHours: 240, maxHours: 480 },
    opus: { minHours: 24, maxHours: 40 },
  },
};

export interface FiveHourBlock {
  startTime: string;
  endTime: string;
  sonnetTokens: number;
  opusTokens: number;
  haikuTokens: number;
  isCurrent: boolean;
}

export interface UsageSummary {
  currentBlock: FiveHourBlock;
  timeUntilBlockReset: number;
  weeklySonnetTokens: number;
  weeklyOpusTokens: number;
  weeklyHaikuTokens: number;
  weeklySonnetHours: number;
  weeklyOpusHours: number;
  timeUntilWeeklyReset: number;
  sonnetBurnRate: number;
  opusBurnRate: number;
  recentBlocks: FiveHourBlock[];
  totalMessagesToday: number;
  totalSessionsToday: number;
  lastUpdated: string;
}

export type WarningLevel = "safe" | "warning" | "danger";

export function getWarningLevel(percent: number): WarningLevel {
  if (percent < 70) return "safe";
  if (percent < 90) return "warning";
  return "danger";
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  return `${hours.toFixed(1)}h`;
}
