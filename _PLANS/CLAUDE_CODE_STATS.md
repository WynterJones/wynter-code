# Claude Code Stats Tracking - Implementation Plan

## Overview

Build a popup tool that displays comprehensive usage statistics from Claude Code CLI's pre-computed `~/.claude/stats-cache.json` file with charts and visualizations.

---

## Data Source

Claude Code CLI already maintains `~/.claude/stats-cache.json` with rich data:

```typescript
interface StatsCache {
  version: number;
  lastComputedDate: string;
  firstSessionDate: string;
  totalMessages: number;
  totalSessions: number;
  longestSession: {
    sessionId: string;
    duration: number; // ms
    messageCount: number;
    timestamp: string;
  };
  dailyActivity: Array<{
    date: string;
    messageCount: number;
    sessionCount: number;
    toolCallCount: number;
  }>;
  hourCounts: Record<string, number>; // hour -> session count
  modelUsage: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    webSearchRequests: number;
    costUSD: number;
  }>;
  dailyModelTokens: Array<{
    date: string;
    tokensByModel: Record<string, number>;
  }>;
}
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Code Stats                              [Refresh] X │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 138.4K  │ │   496   │ │  40.2M  │ │  43 days│           │
│  │Messages │ │Sessions │ │ Tokens  │ │ Active  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│  [Overview] [Daily Activity] [Model Usage] [Sessions]       │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │            📊 Activity Chart (Recharts)             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Model Breakdown:                                          │
│  ┌───────────────────────────────────────────────────┐     │
│  │ Opus 4.5     ████████████████████████░░ 85%       │     │
│  │ Sonnet 4.5   ████░░░░░░░░░░░░░░░░░░░░░░ 15%       │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Setup & Types

1. **Install recharts** (charting library)
   ```bash
   pnpm add recharts
   ```

2. **Create types file**
   - `src/components/tools/claude-code-stats/types.ts`
   - Define `StatsCache` interface matching ~/.claude/stats-cache.json

3. **Create Rust command**
   - `src-tauri/src/commands/stats.rs`
   - Add `read_claude_stats()` command that reads ~/.claude/stats-cache.json

### Phase 2: Components

4. **Create popup folder**
   ```
   src/components/tools/claude-code-stats/
   ├── ClaudeCodeStatsPopup.tsx    (main)
   ├── types.ts
   ├── StatCard.tsx                (summary cards)
   ├── ActivityChart.tsx           (line chart)
   ├── ModelUsageChart.tsx         (pie/bar chart)
   ├── HourlyHeatmap.tsx           (hour distribution)
   └── SessionsTab.tsx             (session details)
   ```

5. **StatCard component**
   - Displays: icon, value, label, optional trend
   - Uses: Lucide icons, theme colors

6. **ActivityChart component**
   - Line chart with messages/sessions/tools over time
   - Toggle between metrics
   - Date range selector (7d, 30d, All)

7. **ModelUsageChart component**
   - Pie chart for token distribution by model
   - Bar chart for input/output/cache breakdown

8. **HourlyHeatmap component**
   - 24-cell grid showing session distribution
   - Color intensity based on count

### Phase 3: Main Popup

9. **ClaudeCodeStatsPopup**
   - Modal wrapper (size="lg")
   - Tabs: Overview, Daily Activity, Model Usage, Sessions
   - Auto-refresh on open
   - Manual refresh button

### Phase 4: Integration

10. **Register in ToolsDropdown**
    - `src/components/tools/ToolsDropdown.tsx`
    - Add to TOOL_DEFINITIONS with BarChart3 icon

11. **Add to ProjectTabBar**
    - `src/components/layout/ProjectTabBar.tsx`
    - State, command listener, render

12. **Export from index**
    - `src/components/tools/index.ts`

---

## Files to Modify

| File | Action |
|------|--------|
| `package.json` | Add recharts dependency |
| `src-tauri/src/commands/mod.rs` | Add stats module |
| `src-tauri/src/commands/stats.rs` | NEW: read_claude_stats command |
| `src-tauri/src/main.rs` | Register command |
| `src/components/tools/claude-code-stats/*` | NEW: All popup components |
| `src/components/tools/ToolsDropdown.tsx` | Add tool definition |
| `src/components/layout/ProjectTabBar.tsx` | Add state + render |
| `src/components/tools/index.ts` | Export |

---

## Rust Command

```rust
// src-tauri/src/commands/stats.rs
use std::path::PathBuf;
use serde_json::Value;
use dirs::home_dir;

#[tauri::command]
pub async fn read_claude_stats() -> Result<Value, String> {
    let path = home_dir()
        .ok_or("Could not find home directory")?
        .join(".claude")
        .join("stats-cache.json");

    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read stats: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse stats: {}", e))
}
```

---

## Chart Examples

**Activity Line Chart (Recharts):**
```tsx
<LineChart data={dailyActivity}>
  <XAxis dataKey="date" />
  <YAxis />
  <Line type="monotone" dataKey="messageCount" stroke="#da7756" />
  <Line type="monotone" dataKey="sessionCount" stroke="#4285f4" />
  <Tooltip />
</LineChart>
```

**Model Pie Chart:**
```tsx
<PieChart>
  <Pie data={modelData} dataKey="tokens" nameKey="model">
    <Cell fill="#da7756" /> {/* Opus */}
    <Cell fill="#f59e0b" /> {/* Sonnet */}
  </Pie>
  <Legend />
</PieChart>
```

---

## Summary Calculations

```typescript
// Format large numbers
const formatNumber = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
};

// Calculate active days
const activeDays = dailyActivity.length;

// Total tokens
const totalTokens = Object.values(modelUsage).reduce(
  (sum, m) => sum + m.inputTokens + m.outputTokens, 0
);

// Format duration
const formatDuration = (ms: number) => {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
};
```

---

## Future: Multi-Model Support

When Gemini/Codex CLIs are added:
- Add provider toggle in stats header
- Read from respective stats locations
- Normalize data to common schema
- See `_PLANS/MULTI_MODEL_SUPPORT.md` for telemetry details
