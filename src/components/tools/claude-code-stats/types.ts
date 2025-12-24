export interface LongestSession {
  sessionId: string;
  duration: number;
  messageCount: number;
  timestamp: string;
}

export interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface ModelUsageData {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
  costUSD: number;
  contextWindow: number;
}

export interface DailyModelTokens {
  date: string;
  tokensByModel: Record<string, number>;
}

export interface StatsCache {
  version: number;
  lastComputedDate: string;
  firstSessionDate: string;
  totalMessages: number;
  totalSessions: number;
  longestSession: LongestSession;
  dailyActivity: DailyActivity[];
  hourCounts: Record<string, number>;
  modelUsage: Record<string, ModelUsageData>;
  dailyModelTokens: DailyModelTokens[];
}

export type DateRange = "7d" | "30d" | "all";
