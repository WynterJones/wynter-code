import { useState } from "react";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";

// Format numbers: 0, 10, 100, 1.2k, 12k, 100k, 1.2M
function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 10000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (num < 1000000) return Math.round(num / 1000) + "k";
  return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
}
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
  ChevronDown,
  LeafyGreen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { AuditMetadata, AuditKey } from "../types";

interface ScoreBarProps {
  name: string;
  auditKey: AuditKey;
  metadata: AuditMetadata;
  icon: LucideIcon;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function ScoreBar({ name, metadata, icon: Icon, color, isExpanded, onToggle }: ScoreBarProps) {
  const { score, lastUpdated, status, openItems } = metadata;
  const segments = 10;
  const filledSegments = Math.floor(score);
  const partialFill = (score % 1) * 100;
  const hasOpenItems = openItems.length > 0;

  const tooltipContent = (
    <div className="text-[10px] space-y-0.5">
      {lastUpdated && <div>Updated: {lastUpdated}</div>}
      {status && <div>Status: {status}</div>}
      {openItems.length > 0 && <div>{openItems.length} open item{openItems.length !== 1 ? "s" : ""}</div>}
      {!lastUpdated && !status && openItems.length === 0 && <div>No audit data</div>}
    </div>
  );

  return (
    <div className="py-2 w-full border-b border-border/30 last:border-b-0">
      <Tooltip content={tooltipContent} side="left" wrapperClassName="w-full block">
        <button
          onClick={hasOpenItems ? onToggle : undefined}
          className={cn(
            "w-full text-left block",
            hasOpenItems && "cursor-pointer"
          )}
        >
          {/* Top row: icon + label on left, score + chevron on right */}
          <div className="flex items-center justify-between mb-1 w-full">
            <div className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              <span className="text-[11px] text-text-secondary">{name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono font-bold" style={{ color }}>
                {score.toFixed(1)}
              </span>
              {hasOpenItems && (
                <ChevronDown
                  className={cn(
                    "w-3 h-3 text-text-tertiary transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              )}
            </div>
          </div>

          {/* Progress bar - full width with 10 pips */}
          <div className="flex gap-[3px] h-2 w-full">
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
        </button>
      </Tooltip>

      {/* Open Items Dropdown */}
      {isExpanded && openItems.length > 0 && (
        <div className="mt-2 space-y-0.5 bg-bg-primary/50 rounded-md p-2 border border-border/30">
          {openItems.map((item, i) => (
            <div
              key={i}
              className={cn(
                "text-[10px] leading-snug py-0.5 px-1.5 rounded truncate",
                "bg-bg-tertiary/50",
                item.priority === "high" && "text-red-400 border-l-2 border-red-400/50",
                item.priority === "medium" && "text-yellow-400 border-l-2 border-yellow-400/50",
                !item.priority && "text-text-secondary border-l-2 border-border/50"
              )}
              title={item.text}
            >
              {item.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// Catppuccin Mocha pastel palette
const AUDIT_CONFIG: { key: AuditKey; name: string; icon: LucideIcon; color: string }[] = [
  { key: "security", name: "Security", icon: Shield, color: "#f38ba8" },      // Red
  { key: "tests", name: "Tests", icon: TestTube2, color: "#89b4fa" },         // Blue
  { key: "performance", name: "Performance", icon: Gauge, color: "#fab387" }, // Peach
  { key: "farmhouse", name: "Farmhouse", icon: Home, color: "#cba6f7" },      // Mauve
  { key: "accessibility", name: "Accessibility", icon: Accessibility, color: "#94e2d5" }, // Teal
  { key: "codeQuality", name: "Code Quality", icon: Code2, color: "#f5c2e7" }, // Pink
];

export function StatsSidebar() {
  const { auditScores, beadsStats, gardenStats, compostStats, activityFeed } =
    useFarmworkTycoonStore();

  const [expandedAudit, setExpandedAudit] = useState<AuditKey | null>(null);

  const toggleAudit = (key: AuditKey) => {
    setExpandedAudit(expandedAudit === key ? null : key);
  };

  return (
    <div className="p-3 h-full flex flex-col gap-3">
        {/* Ideas Section */}
        <section className="shrink-0">
          <h3 className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Ideas</h3>
          <div className="bg-bg-tertiary rounded-lg p-2 border border-border/50">
            <div className="grid grid-cols-4 gap-1">
              <div className="flex flex-col items-center gap-0.5 py-1">
                <Sprout className="w-3.5 h-3.5" style={{ color: "#a6e3a1" }} />
                <span className="text-xs font-mono font-bold" style={{ color: "#a6e3a1" }}>
                  {formatNumber(gardenStats.planted)}
                </span>
                <span className="text-[7px] text-text-tertiary uppercase">Planted</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 py-1">
                <TreeDeciduous className="w-3.5 h-3.5" style={{ color: "#94e2d5" }} />
                <span className="text-xs font-mono font-bold" style={{ color: "#94e2d5" }}>
                  {formatNumber(gardenStats.growing)}
                </span>
                <span className="text-[7px] text-text-tertiary uppercase">Growing</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 py-1">
                <Apple className="w-3.5 h-3.5" style={{ color: "#f38ba8" }} />
                <span className="text-xs font-mono font-bold" style={{ color: "#f38ba8" }}>
                  {formatNumber(gardenStats.picked)}
                </span>
                <span className="text-[7px] text-text-tertiary uppercase">Picked</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 py-1">
                <LeafyGreen className="w-3.5 h-3.5" style={{ color: "#fab387" }} />
                <span className="text-xs font-mono font-bold" style={{ color: "#fab387" }}>
                  {formatNumber(compostStats.rejectedIdeas)}
                </span>
                <span className="text-[7px] text-text-tertiary uppercase">Compost</span>
              </div>
            </div>
          </div>
        </section>

        {/* Issues Section - moved below Ideas */}
        {beadsStats && (
          <section className="shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">Issues</h3>
              <span className="text-[9px] font-mono text-text-tertiary">
                {formatNumber(beadsStats.total)} total
              </span>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-2 border border-border/50">
              <div className="grid grid-cols-4 gap-1">
                <div className="flex flex-col items-center gap-0.5 py-1">
                  <CircleDot className="w-3.5 h-3.5" style={{ color: "#a6e3a1" }} />
                  <span className="text-xs font-mono font-bold" style={{ color: "#a6e3a1" }}>
                    {formatNumber(beadsStats.open)}
                  </span>
                  <span className="text-[7px] text-text-tertiary uppercase">Open</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 py-1">
                  <Clock className="w-3.5 h-3.5" style={{ color: "#f9e2af" }} />
                  <span className="text-xs font-mono font-bold" style={{ color: "#f9e2af" }}>
                    {formatNumber(beadsStats.in_progress)}
                  </span>
                  <span className="text-[7px] text-text-tertiary uppercase">Progress</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 py-1">
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#f38ba8" }} />
                  <span className="text-xs font-mono font-bold" style={{ color: "#f38ba8" }}>
                    {formatNumber(beadsStats.blocked)}
                  </span>
                  <span className="text-[7px] text-text-tertiary uppercase">Blocked</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#6c7086" }} />
                  <span className="text-xs font-mono font-bold" style={{ color: "#6c7086" }}>
                    {formatNumber(beadsStats.closed)}
                  </span>
                  <span className="text-[7px] text-text-tertiary uppercase">Closed</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Audit Section */}
        <section className="shrink-0">
          <h3 className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Audit</h3>
          <div className="bg-bg-tertiary rounded-lg px-2.5 border border-border/50">
            {AUDIT_CONFIG.map((config) => (
              <ScoreBar
                key={config.key}
                auditKey={config.key}
                name={config.name}
                metadata={auditScores[config.key]}
                icon={config.icon}
                color={config.color}
                isExpanded={expandedAudit === config.key}
                onToggle={() => toggleAudit(config.key)}
              />
            ))}
          </div>
        </section>

        {/* Activity Log - fills remaining space */}
        <section className="flex-1 min-h-0 flex flex-col">
          <h3 className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5 shrink-0">Log</h3>
          <div className="bg-bg-tertiary rounded-lg border border-border/50 overflow-hidden flex-1 min-h-0">
            <div className="h-full overflow-y-auto">
              {activityFeed.length === 0 ? (
                <p className="text-[10px] text-text-secondary italic p-2">Awaiting events...</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {activityFeed.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 px-2.5 py-1.5"
                    >
                      <span className="text-[9px] text-text-tertiary font-mono tabular-nums shrink-0">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                      </span>
                      <span className="text-[10px] text-text-secondary leading-snug truncate">
                        {event.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
    </div>
  );
}
