import { useEffect, useState, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { watchImmediate } from "@tauri-apps/plugin-fs";
import { useProjectStore } from "@/stores";
import {
  Shield,
  TestTube2,
  Gauge,
  Accessibility,
  Code2,
  Home,
  Sprout,
  CircleDot,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TreeDeciduous,
  Apple,
  LeafyGreen,
  Tractor,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import type { PanelContentProps } from "@/types/panel";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

interface AuditMetadata {
  score: number;
  lastUpdated: string | null;
  status: string | null;
  openItems: Array<{ text: string; priority?: string }>;
}

interface BeadsStats {
  total: number;
  open: number;
  in_progress: number;
  blocked: number;
  closed: number;
}

interface GardenStats {
  planted: number;
  growing: number;
  picked: number;
}

interface CompostStats {
  rejectedIdeas: number;
}

type AuditKey = "security" | "tests" | "performance" | "farmhouse" | "accessibility" | "codeQuality";

type AuditScores = Record<AuditKey, AuditMetadata>;

const DEFAULT_AUDIT: AuditMetadata = {
  score: 0,
  lastUpdated: null,
  status: null,
  openItems: [],
};

const AUDIT_CONFIG: { key: AuditKey; name: string; icon: LucideIcon; color: string }[] = [
  { key: "security", name: "Security", icon: Shield, color: "#f38ba8" },
  { key: "tests", name: "Tests", icon: TestTube2, color: "#89b4fa" },
  { key: "performance", name: "Perf", icon: Gauge, color: "#fab387" },
  { key: "farmhouse", name: "Farm", icon: Home, color: "#cba6f7" },
  { key: "accessibility", name: "a11y", icon: Accessibility, color: "#94e2d5" },
  { key: "codeQuality", name: "Code", icon: Code2, color: "#f5c2e7" },
];

const AUDIT_FILES: Record<AuditKey, string> = {
  security: "SECURITY.md",
  tests: "TESTS.md",
  performance: "PERFORMANCE.md",
  farmhouse: "FARMHOUSE.md",
  accessibility: "ACCESSIBILITY.md",
  codeQuality: "CODE_QUALITY.md",
};

function parseAuditFile(content: string, _filename: string): AuditMetadata {
  let score = 0;
  let lastUpdated: string | null = null;
  let status: string | null = null;
  const openItems: Array<{ text: string; priority?: string }> = [];

  // Parse **Score:** 7.5/10 format (with markdown bold)
  const scoreMatch = content.match(/\*\*Score:\*\*\s*(\d+(?:\.\d+)?)/i);
  if (scoreMatch) score = parseFloat(scoreMatch[1]);

  // Parse **Last Updated:** 2025-12-26 format
  const dateMatch = content.match(/\*\*Last Updated:\*\*\s*(.+)/i);
  if (dateMatch) lastUpdated = dateMatch[1].trim();

  // Parse **Status:** format
  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/i);
  if (statusMatch) status = statusMatch[1].trim();

  // Parse unchecked todo items
  const todoMatches = content.match(/^-\s*\[[ ]\].+$/gm) || [];
  for (const line of todoMatches) {
    const text = line.replace(/^-\s*\[[ ]\]\s*/, "").trim();
    const priority = line.toLowerCase().includes("critical") || line.toLowerCase().includes("high")
      ? "high"
      : line.toLowerCase().includes("medium")
      ? "medium"
      : undefined;
    if (text) openItems.push({ text, priority });
  }

  return { score, lastUpdated, status, openItems };
}

interface StatRowProps {
  icon: LucideIcon;
  name: string;
  value: number;
  color: string;
  showBar?: boolean;
}

function StatRow({ icon: Icon, name, value, color, showBar }: StatRowProps) {
  const segments = 10;
  const filledSegments = Math.floor(value);
  const partialFill = (value % 1) * 100;

  return (
    <div className="flex items-center gap-2 py-1">
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
      <span className="text-[10px] text-text-secondary w-12 truncate">{name}</span>
      {showBar && (
        <div className="flex gap-[2px] h-2 flex-1">
          {Array.from({ length: segments }).map((_, i) => {
            const isFilled = i < filledSegments;
            const isPartial = i === filledSegments && partialFill > 0;

            return (
              <div
                key={i}
                className="flex-1 rounded-[3px] relative overflow-hidden"
                style={{
                  backgroundColor: `${color}15`,
                  boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3)`,
                }}
              >
                {isFilled && (
                  <div
                    className="absolute inset-0 rounded-[3px]"
                    style={{
                      backgroundColor: color,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.2)`,
                    }}
                  />
                )}
                {isPartial && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-[3px]"
                    style={{
                      backgroundColor: color,
                      width: `${partialFill}%`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.2)`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
      <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color }}>
        {showBar ? value.toFixed(1) : value}
      </span>
    </div>
  );
}

export function FarmworkStatsPanel({
  panelId: _panelId,
  projectId: _projectId,
  projectPath,
  panel,
  isFocused: _isFocused,
  onProcessStateChange: _onProcessStateChange,
  onPanelUpdate,
}: PanelContentProps) {
  const [auditScores, setAuditScores] = useState<AuditScores>({
    security: DEFAULT_AUDIT,
    tests: DEFAULT_AUDIT,
    performance: DEFAULT_AUDIT,
    farmhouse: DEFAULT_AUDIT,
    accessibility: DEFAULT_AUDIT,
    codeQuality: DEFAULT_AUDIT,
  });
  const [beadsStats, setBeadsStats] = useState<BeadsStats | null>(null);
  const [gardenStats, setGardenStats] = useState<GardenStats>({ planted: 0, growing: 0, picked: 0 });
  const [compostStats, setCompostStats] = useState<CompostStats>({ rejectedIdeas: 0 });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getProject = useProjectStore((s) => s.getProject);
  const activeProject = useMemo(
    () => (activeProjectId ? getProject(activeProjectId) : undefined),
    [activeProjectId, getProject]
  );

  const effectiveProjectPath = projectPath || activeProject?.path;

  // Set panel title on mount
  useEffect(() => {
    if (!panel.title) {
      onPanelUpdate({ title: "Farmwork" });
    }
  }, [panel.title, onPanelUpdate]);

  const loadStats = useCallback(async () => {
    if (!effectiveProjectPath) return;

    try {
      const auditPath = await join(effectiveProjectPath, "_AUDIT");

      const newScores: AuditScores = { ...auditScores };
      for (const [key, filename] of Object.entries(AUDIT_FILES)) {
        try {
          const filePath = await join(auditPath, filename);
          const content = await invoke<string>("read_file_content", { path: filePath });
          newScores[key as AuditKey] = parseAuditFile(content, filename);
        } catch {
          // File doesn't exist, keep default
        }
      }
      setAuditScores(newScores);

      // Load beads stats
      try {
        const beadsPath = await join(effectiveProjectPath, ".beads", "issues.jsonl");
        const content = await invoke<string>("read_file_content", { path: beadsPath });
        const lines = content.trim().split("\n").filter(Boolean);
        const stats: BeadsStats = { total: 0, open: 0, in_progress: 0, blocked: 0, closed: 0 };
        for (const line of lines) {
          try {
            const issue = JSON.parse(line);
            stats.total++;
            if (issue.status === "open") stats.open++;
            else if (issue.status === "in_progress") stats.in_progress++;
            else if (issue.status === "blocked") stats.blocked++;
            else if (issue.status === "closed") stats.closed++;
          } catch {
            // Invalid JSON line
          }
        }
        setBeadsStats(stats);
      } catch {
        setBeadsStats(null);
      }

      // Load garden stats
      try {
        const gardenPath = await join(auditPath, "GARDEN.md");
        const content = await invoke<string>("read_file_content", { path: gardenPath });
        const ideas = (content.match(/^##\s+/gm) || []).length;
        const planted = ideas;
        const growing = (content.match(/Status:\s*In Progress/gi) || []).length;
        const picked = (content.match(/Status:\s*Graduated/gi) || []).length;
        setGardenStats({ planted, growing, picked });
      } catch {
        setGardenStats({ planted: 0, growing: 0, picked: 0 });
      }

      // Load compost stats
      try {
        const compostPath = await join(auditPath, "COMPOST.md");
        const content = await invoke<string>("read_file_content", { path: compostPath });
        const rejected = (content.match(/^##\s+/gm) || []).length;
        setCompostStats({ rejectedIdeas: rejected });
      } catch {
        setCompostStats({ rejectedIdeas: 0 });
      }

      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectPath, auditScores]);

  // Initial load
  useEffect(() => {
    loadStats();
  }, [effectiveProjectPath]);

  // File watcher
  useEffect(() => {
    if (!effectiveProjectPath) return;

    let cleanup: (() => void) | undefined;

    const setupWatcher = async () => {
      try {
        const auditPath = await join(effectiveProjectPath, "_AUDIT");
        const unwatch = await watchImmediate(auditPath, () => {
          loadStats();
        }, { recursive: true });
        cleanup = unwatch;
      } catch {
        // Watcher setup failed, rely on manual refresh
      }
    };

    setupWatcher();

    return () => {
      if (cleanup) cleanup();
    };
  }, [effectiveProjectPath, loadStats]);

  // Calculate average audit score - must be before conditional returns
  const avgScore = useMemo(() => {
    const scores = AUDIT_CONFIG.map(c => auditScores[c.key].score);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [auditScores]);

  if (!effectiveProjectPath) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 p-4">
        <Tractor className="w-8 h-8 text-text-secondary/50" />
        <p className="text-xs text-text-secondary text-center">
          Open a project to view Farmwork stats
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-text-secondary" />
        <p className="text-xs text-text-secondary">Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <OverlayScrollbarsComponent
        className="flex-1 min-h-0"
        options={{ scrollbars: { autoHide: "scroll" } }}
      >
        <div className="p-2 space-y-2">
          {/* Ideas & Issues - Two Column Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Ideas */}
            <section>
              <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1">Ideas</div>
              <div className="bg-bg-tertiary rounded px-2 py-1 border border-border/30">
                <StatRow icon={Sprout} name="Planted" value={gardenStats.planted} color="#a6e3a1" />
                <StatRow icon={TreeDeciduous} name="Growing" value={gardenStats.growing} color="#94e2d5" />
                <StatRow icon={Apple} name="Picked" value={gardenStats.picked} color="#f38ba8" />
                <StatRow icon={LeafyGreen} name="Compost" value={compostStats.rejectedIdeas} color="#fab387" />
              </div>
            </section>

            {/* Issues */}
            <section>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-text-tertiary uppercase tracking-wider">Issues</span>
                <span className="text-[8px] font-mono text-text-tertiary">{beadsStats?.total ?? 0}</span>
              </div>
              <div className="bg-bg-tertiary rounded px-2 py-1 border border-border/30">
                <StatRow icon={CircleDot} name="Open" value={beadsStats?.open ?? 0} color="#a6e3a1" />
                <StatRow icon={Clock} name="Progress" value={beadsStats?.in_progress ?? 0} color="#f9e2af" />
                <StatRow icon={AlertTriangle} name="Blocked" value={beadsStats?.blocked ?? 0} color="#f38ba8" />
                <StatRow icon={CheckCircle2} name="Closed" value={beadsStats?.closed ?? 0} color="#6c7086" />
              </div>
            </section>
          </div>

          {/* Audit Scores */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-text-tertiary uppercase tracking-wider">Audit</span>
              <span className="text-[8px] font-mono font-bold" style={{ color: avgScore >= 7 ? "#a6e3a1" : avgScore >= 4 ? "#f9e2af" : "#f38ba8" }}>
                avg {avgScore.toFixed(1)}
              </span>
            </div>
            <div className="bg-bg-tertiary rounded px-2 py-1 border border-border/30">
              {AUDIT_CONFIG.map((config) => (
                <StatRow
                  key={config.key}
                  icon={config.icon}
                  name={config.name}
                  value={auditScores[config.key].score}
                  color={config.color}
                  showBar
                />
              ))}
            </div>
          </section>

          {/* Refresh */}
          <div className="flex justify-center">
            <button
              onClick={loadStats}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>{lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </button>
          </div>
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );
}
