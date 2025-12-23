import { useMemo } from "react";
import { CreditCard, TrendingUp, DollarSign, Calendar, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { Subscription } from "@/types";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color?: string;
}

function StatCard({ label, value, subValue, icon, color = "text-accent" }: StatCardProps) {
  return (
    <div className="bg-bg-tertiary rounded-lg p-4 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color, "bg-current/10")}>
          {icon}
        </div>
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <div className={cn("text-2xl font-mono font-medium", color)}>{value}</div>
      {subValue && <div className="text-xs text-text-secondary mt-1">{subValue}</div>}
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  title: string;
  formatValue?: (value: number) => string;
}

function BarChart({ data, title, formatValue = (v) => v.toFixed(0) }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-bg-tertiary rounded-lg p-4 border border-border">
      <h4 className="text-sm font-medium text-text-primary mb-4">{title}</h4>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">{item.label}</span>
              <span className="text-text-primary font-mono">{formatValue(item.value)}</span>
            </div>
            <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color ?? "#cba6f7",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  title: string;
  centerLabel?: string;
  centerValue?: string;
}

function DonutChart({ data, title, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const size = 120;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="bg-bg-tertiary rounded-lg p-4 border border-border">
      <h4 className="text-sm font-medium text-text-primary mb-4">{title}</h4>
      <div className="flex items-center gap-6">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {data.map((item, index) => {
              const percentage = total > 0 ? item.value / total : 0;
              const dashLength = percentage * circumference;
              const offset = currentOffset;
              currentOffset += dashLength;

              return (
                <circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={-offset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          {centerLabel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-mono font-medium text-text-primary">{centerValue}</span>
              <span className="text-xs text-text-secondary">{centerLabel}</span>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-text-secondary flex-1 truncate">{item.label}</span>
              <span className="text-xs font-mono text-text-primary">
                {total > 0 ? Math.round((item.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TopSubscriptionProps {
  subscription: Subscription & { _normalizedMonthly: number };
  rank: number;
}

function TopSubscription({ subscription, rank }: TopSubscriptionProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: subscription.currency }).format(amount);

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-6 h-6 rounded-full bg-bg-primary flex items-center justify-center text-xs font-medium text-text-secondary">
        {rank}
      </div>
      {subscription.faviconUrl ? (
        <img src={subscription.faviconUrl} alt="" className="w-5 h-5 rounded" />
      ) : (
        <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
          <CreditCard className="w-3 h-3 text-accent" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate">{subscription.name}</div>
        <div className="text-xs text-text-secondary">{subscription.billingCycle}</div>
      </div>
      <div className="text-sm font-mono text-accent-green">{formatCurrency(subscription._normalizedMonthly)}/mo</div>
    </div>
  );
}

export function SubscriptionStats() {
  const { workspaces } = useWorkspaceStore();
  const {
    getAllActiveSubscriptions,
    calculateGlobalSummary,
    getSubscriptionsByBillingCycle,
    getSubscriptionsByCurrency,
    getTopSubscriptions,
    subscriptions,
  } = useSubscriptionStore();

  const summary = calculateGlobalSummary();
  const byBillingCycle = getSubscriptionsByBillingCycle();
  const byCurrency = getSubscriptionsByCurrency();
  const topSubs = getTopSubscriptions(5);
  const activeSubscriptions = getAllActiveSubscriptions();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  // Colors for charts
  const billingCycleColors: Record<string, string> = {
    monthly: "#89b4fa",
    yearly: "#a6e3a1",
    quarterly: "#f9e2af",
    weekly: "#fab387",
    "one-time": "#f38ba8",
  };

  const currencyColors: Record<string, string> = {
    USD: "#89b4fa",
    EUR: "#a6e3a1",
    GBP: "#f9e2af",
    CAD: "#fab387",
    AUD: "#f38ba8",
  };

  // Prepare chart data
  const billingCycleData = useMemo(() => {
    return Object.entries(byBillingCycle)
      .map(([cycle, data]) => ({
        label: cycle.charAt(0).toUpperCase() + cycle.slice(1),
        value: data.monthlyCost,
        color: billingCycleColors[cycle] ?? "#cba6f7",
      }))
      .sort((a, b) => b.value - a.value);
  }, [byBillingCycle]);

  const currencyData = useMemo(() => {
    return Object.entries(byCurrency)
      .map(([currency, data]) => ({
        label: currency,
        value: data.count,
        color: currencyColors[currency] ?? "#cba6f7",
      }))
      .sort((a, b) => b.value - a.value);
  }, [byCurrency]);

  // Subscriptions by workspace
  const byWorkspaceData = useMemo(() => {
    const workspaceMap = new Map<string, { name: string; color: string; total: number }>();

    workspaces.forEach((ws) => {
      workspaceMap.set(ws.id, { name: ws.name, color: ws.color, total: 0 });
    });

    activeSubscriptions.forEach((sub) => {
      const ws = workspaceMap.get(sub.workspaceId);
      if (ws) {
        // Normalize to monthly
        let monthly = sub.monthlyCost;
        switch (sub.billingCycle) {
          case "yearly":
            monthly = sub.monthlyCost / 12;
            break;
          case "quarterly":
            monthly = sub.monthlyCost / 3;
            break;
          case "weekly":
            monthly = sub.monthlyCost * 4.33;
            break;
          case "one-time":
            monthly = 0;
            break;
        }
        ws.total += monthly;
      }
    });

    return Array.from(workspaceMap.values())
      .filter((ws) => ws.total > 0)
      .map((ws) => ({
        label: ws.name,
        value: ws.total,
        color: ws.color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [workspaces, activeSubscriptions]);

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <PieChart className="w-16 h-16 text-text-secondary opacity-30 mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">No Subscriptions Yet</h3>
        <p className="text-sm text-text-secondary max-w-xs">
          Add subscriptions to any workspace to see your spending analytics here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Monthly Spend"
          value={formatCurrency(summary.totalMonthly)}
          icon={<DollarSign className="w-4 h-4" />}
          color="text-accent-green"
        />
        <StatCard
          label="Yearly Spend"
          value={formatCurrency(summary.totalYearly)}
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-accent"
        />
        <StatCard
          label="Active Subscriptions"
          value={String(summary.activeCount)}
          subValue={`${summary.inactiveCount} inactive`}
          icon={<CreditCard className="w-4 h-4" />}
          color="text-sky-400"
        />
        <StatCard
          label="Avg. Per Subscription"
          value={formatCurrency(summary.activeCount > 0 ? summary.totalMonthly / summary.activeCount : 0)}
          subValue="per month"
          icon={<Calendar className="w-4 h-4" />}
          color="text-amber-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Workspace */}
        {byWorkspaceData.length > 0 && (
          <DonutChart
            data={byWorkspaceData}
            title="Spending by Workspace"
            centerLabel="total/mo"
            centerValue={formatCurrency(summary.totalMonthly)}
          />
        )}

        {/* By Billing Cycle */}
        {billingCycleData.length > 0 && (
          <BarChart
            data={billingCycleData}
            title="Spending by Billing Cycle"
            formatValue={(v) => formatCurrency(v)}
          />
        )}
      </div>

      {/* Currency Distribution */}
      {currencyData.length > 1 && (
        <DonutChart
          data={currencyData}
          title="Subscriptions by Currency"
          centerLabel="currencies"
          centerValue={String(currencyData.length)}
        />
      )}

      {/* Top Subscriptions */}
      {topSubs.length > 0 && (
        <div className="bg-bg-tertiary rounded-lg p-4 border border-border">
          <h4 className="text-sm font-medium text-text-primary mb-3">Top Subscriptions by Cost</h4>
          <div className="divide-y divide-border">
            {topSubs.map((sub, index) => (
              <TopSubscription key={sub.id} subscription={sub} rank={index + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
