import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import {
  Shield,
  TestTube2,
  Gauge,
  Accessibility,
  Code2,
  Home,
  Sprout,
  Trash2,
  CircleDot,
  Clock,
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuildingType } from "../types";

interface ScoreCardProps {
  name: string;
  score: number;
  icon: LucideIcon;
  color: string;
}

function ScoreCard({ name, score, icon: Icon, color }: ScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s < 3) return "text-red-400";
    if (s < 6) return "text-yellow-400";
    if (s < 8) return "text-blue-400";
    return "text-green-400";
  };

  return (
    <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs text-text-secondary font-medium">{name}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-mono font-bold", getScoreColor(score))}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs text-text-secondary">/10</span>
      </div>
    </div>
  );
}

interface BeadsStatProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

function BeadsStat({ label, value, icon: Icon, color }: BeadsStatProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <span className="text-sm font-mono font-medium" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

const BUILDING_ICONS: Record<BuildingType, LucideIcon> = {
  security: Shield,
  tests: TestTube2,
  performance: Gauge,
  accessibility: Accessibility,
  codeQuality: Code2,
  farmhouse: Home,
  office: Home,
  garden: Sprout,
  compost: Trash2,
};

const BUILDING_COLORS: Record<BuildingType, string> = {
  security: "#ef4444",
  tests: "#3b82f6",
  performance: "#f59e0b",
  accessibility: "#10b981",
  codeQuality: "#ec4899",
  farmhouse: "#8b5cf6",
  office: "#06b6d4",
  garden: "#84cc16",
  compost: "#78716c",
};

export function StatsSidebar() {
  const { buildings, beadsStats, gardenStats, compostStats, activityFeed } =
    useFarmworkTycoonStore();

  const auditBuildings = buildings.filter((b) =>
    ["security", "tests", "performance", "accessibility", "codeQuality", "farmhouse"].includes(
      b.type
    )
  );

  return (
    <div className="p-4 space-y-6">
        <section>
          <h3 className="text-sm font-medium text-text-primary mb-3">Audit Scores</h3>
          <div className="grid grid-cols-2 gap-2">
            {auditBuildings.map((building) => (
              <ScoreCard
                key={building.id}
                name={building.name}
                score={building.score}
                icon={BUILDING_ICONS[building.type]}
                color={BUILDING_COLORS[building.type]}
              />
            ))}
          </div>
        </section>

        {beadsStats && (
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-3">Issues</h3>
            <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
              <BeadsStat
                label="Open"
                value={beadsStats.open}
                icon={CircleDot}
                color="#22c55e"
              />
              <BeadsStat
                label="In Progress"
                value={beadsStats.in_progress}
                icon={Clock}
                color="#f59e0b"
              />
              <BeadsStat
                label="Blocked"
                value={beadsStats.blocked}
                icon={AlertTriangle}
                color="#ef4444"
              />
              <BeadsStat
                label="Closed"
                value={beadsStats.closed}
                icon={CheckCircle2}
                color="#6b7280"
              />
              <div className="border-t border-border mt-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">Total</span>
                  <span className="text-sm font-mono font-bold text-text-primary">
                    {beadsStats.total}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        <section>
          <h3 className="text-sm font-medium text-text-primary mb-3">Ideas</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Sprout className="w-4 h-4 text-green-500" />
                <span className="text-xs text-text-secondary">Garden</span>
              </div>
              <span className="text-xl font-mono font-bold text-green-400">
                {gardenStats.activeIdeas}
              </span>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Trash2 className="w-4 h-4 text-stone-500" />
                <span className="text-xs text-text-secondary">Compost</span>
              </div>
              <span className="text-xl font-mono font-bold text-stone-400">
                {compostStats.rejectedIdeas}
              </span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-text-primary mb-3">Activity</h3>
          <div className="space-y-2">
            {activityFeed.length === 0 ? (
              <p className="text-xs text-text-secondary italic">No recent activity</p>
            ) : (
              activityFeed.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="bg-bg-tertiary rounded p-2 border border-border"
                >
                  <p className="text-xs text-text-primary">{event.message}</p>
                  <p className="text-[10px] text-text-secondary mt-1">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
    </div>
  );
}
