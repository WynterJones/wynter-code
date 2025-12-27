import { useEffect, useState } from "react";
import {
  Shield,
  TestTube2,
  Gauge,
  Accessibility,
  Code2,
  Home,
  Sprout,
  Trash2,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import type { BuildingType, AuditKey } from "../types";

interface BuildingPopupProps {
  buildingId: string | null;
  onClose: () => void;
}

interface BuildingInfo {
  icon: LucideIcon;
  color: string;
  description: string;
  type: "audit" | "count";
}

const BUILDING_INFO: Record<BuildingType, BuildingInfo> = {
  security: {
    icon: Shield,
    color: "#f38ba8",
    description: "Monitors OWASP Top 10 vulnerabilities, injection attacks, XSS, and security best practices in your codebase.",
    type: "audit",
  },
  tests: {
    icon: TestTube2,
    color: "#89b4fa",
    description: "Tracks test coverage, test scaffolding, and ensures your code has proper test suites.",
    type: "audit",
  },
  performance: {
    icon: Gauge,
    color: "#fab387",
    description: "Identifies memory leaks, unnecessary re-renders, bundle size issues, and performance anti-patterns.",
    type: "audit",
  },
  farmhouse: {
    icon: Warehouse,
    color: "#cba6f7",
    description: "The central hub of your project. Tracks overall project health metrics and completed issues.",
    type: "audit",
  },
  office: {
    icon: Home,
    color: "#06b6d4",
    description: "Home base for tool operations. Tracks the total number of tool calls made during this session.",
    type: "count",
  },
  accessibility: {
    icon: Accessibility,
    color: "#94e2d5",
    description: "Audits WCAG 2.1 compliance, screen reader compatibility, keyboard navigation, and color contrast.",
    type: "audit",
  },
  garden: {
    icon: Sprout,
    color: "#a6e3a1",
    description: "Your idea garden where new features and improvements are planted before becoming plans.",
    type: "count",
  },
  compost: {
    icon: Trash2,
    color: "#78716c",
    description: "Ideas that didn't make the cut. Sometimes good ideas need to rest before their time comes.",
    type: "count",
  },
  codeQuality: {
    icon: Code2,
    color: "#f5c2e7",
    description: "Detects DRY violations, code smells, complexity issues, naming problems, and technical debt.",
    type: "audit",
  },
};

const AUDIT_KEY_MAP: Partial<Record<BuildingType, AuditKey>> = {
  security: "security",
  tests: "tests",
  performance: "performance",
  farmhouse: "farmhouse",
  accessibility: "accessibility",
  codeQuality: "codeQuality",
};

export function BuildingPopup({ buildingId, onClose }: BuildingPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { buildings, auditScores, gardenStats, compostStats } = useFarmworkTycoonStore();

  const building = buildings.find((b) => b.id === buildingId);
  const info = building ? BUILDING_INFO[building.type] : null;

  useEffect(() => {
    if (buildingId) {
      setIsAnimating(true);
      // Small delay to trigger animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [buildingId]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && buildingId) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [buildingId, onClose]);

  if (!isAnimating || !building || !info) return null;

  const Icon = info.icon;
  const auditKey = AUDIT_KEY_MAP[building.type];
  const metadata = auditKey ? auditScores[auditKey] : null;

  // Get count value for count-type buildings
  const getCountValue = () => {
    switch (building.type) {
      case "garden":
        return gardenStats.activeIdeas;
      case "compost":
        return compostStats.rejectedIdeas;
      case "office":
        return building.score;
      default:
        return 0;
    }
  };

  const getCountLabel = () => {
    switch (building.type) {
      case "garden":
        return "Active Ideas";
      case "compost":
        return "Composted Ideas";
      case "office":
        return "Tool Calls";
      default:
        return "Count";
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "bg-bg-secondary/95 backdrop-blur-sm rounded-xl border border-border/50 shadow-2xl",
          "w-[300px] max-h-[80%] flex flex-col",
          "transition-all duration-200 ease-out",
          isVisible
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - fixed */}
        <div className="p-4 pb-3 border-b border-border/30 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4 text-text-tertiary" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div
              className="p-2.5 rounded-lg shrink-0"
              style={{ backgroundColor: `${info.color}20` }}
            >
              <Icon className="w-6 h-6" style={{ color: info.color }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-text-primary truncate">
                {building.name}
              </h3>
              <span
                className="text-xs font-mono"
                style={{ color: info.color }}
              >
                {info.type === "audit" && metadata
                  ? `${metadata.score.toFixed(1)}/10`
                  : `${getCountValue()} ${getCountLabel().toLowerCase()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="p-4 pt-3 overflow-y-auto flex-1 min-h-0">
          {/* Description */}
          <p className="text-xs text-text-secondary leading-relaxed mb-4">
            {info.description}
          </p>

          {/* Progress Bar for audit buildings */}
          {info.type === "audit" && metadata && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-text-tertiary uppercase tracking-wider">Score</span>
                <span className="font-mono font-bold" style={{ color: info.color }}>
                  {metadata.score.toFixed(1)}/10
                </span>
              </div>
              <div className="flex gap-[3px] h-3">
                {Array.from({ length: 10 }).map((_, i) => {
                  const isFilled = i < Math.floor(metadata.score);
                  const isPartial = i === Math.floor(metadata.score) && (metadata.score % 1) > 0;
                  const partialFill = (metadata.score % 1) * 100;

                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-[4px] relative overflow-hidden"
                      style={{
                        backgroundColor: `${info.color}15`,
                        boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3)`,
                      }}
                    >
                      {isFilled && (
                        <div
                          className="absolute inset-0 rounded-[4px]"
                          style={{
                            backgroundColor: info.color,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.2)`,
                          }}
                        />
                      )}
                      {isPartial && (
                        <div
                          className="absolute inset-y-0 left-0 rounded-[4px]"
                          style={{
                            backgroundColor: info.color,
                            width: `${partialFill}%`,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.2)`,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Last updated and status */}
              {(metadata.lastUpdated || metadata.status) && (
                <div className="mt-3 pt-2 border-t border-border/30 space-y-1">
                  {metadata.lastUpdated && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-text-tertiary">Last Updated</span>
                      <span className="text-text-secondary">{metadata.lastUpdated}</span>
                    </div>
                  )}
                  {metadata.status && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-text-tertiary">Status</span>
                      <span className="text-text-secondary truncate ml-2">{metadata.status}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Open items */}
              {metadata.openItems.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border/30">
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">
                    Open Items ({metadata.openItems.length})
                  </div>
                  <div className="space-y-1">
                    {metadata.openItems.map((item, i) => (
                      <div
                        key={i}
                        className={cn(
                          "text-[10px] leading-snug py-1 px-2 rounded",
                          "bg-bg-tertiary/50 truncate",
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
                </div>
              )}
            </div>
          )}

          {/* Count display for count-type buildings */}
          {info.type === "count" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider">
                  {getCountLabel()}
                </span>
                <span
                  className="text-2xl font-mono font-bold"
                  style={{ color: info.color }}
                >
                  {getCountValue()}
                </span>
              </div>

              {/* Show ideas list for garden */}
              {building.type === "garden" && gardenStats.ideas.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border/30">
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">
                    Ideas
                  </div>
                  <div className="space-y-1">
                    {gardenStats.ideas.map((idea, i) => (
                      <div
                        key={i}
                        className="text-[10px] leading-snug py-1 px-2 rounded bg-bg-tertiary/50 text-text-secondary truncate"
                        title={idea}
                      >
                        {idea}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show rejected ideas list for compost */}
              {building.type === "compost" && compostStats.ideas.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border/30">
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">
                    Rejected Ideas
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {compostStats.ideas.map((idea, i) => (
                      <div
                        key={i}
                        className="text-[10px] leading-snug py-1 px-2 rounded bg-bg-tertiary/50 text-text-secondary truncate"
                        title={idea}
                      >
                        {idea}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
