import { useState } from "react";
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { SubscriptionCard } from "./SubscriptionCard";

interface SubscriptionDropdownProps {
  onClose: () => void;
  onOpenManage: () => void;
}

export function SubscriptionDropdown({
  onClose: _onClose,
  onOpenManage,
}: SubscriptionDropdownProps) {
  const { getGroupedSubscriptions, calculateSummary, subscriptions } =
    useSubscriptionStore();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const groupedSubs = getGroupedSubscriptions();
  const summary = calculateSummary();

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const isEmpty = subscriptions.length === 0;

  return (
    <div className="absolute right-0 mt-1 w-80 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-bg-tertiary/50">
        <span className="text-sm font-medium text-text-primary">Subscriptions</span>
        <span className="text-sm font-mono text-accent-green">
          {formatCurrency(summary.totalMonthly)}/mo
        </span>
      </div>

      {/* Content */}
      <div className="max-h-[320px] overflow-y-auto">
        {isEmpty ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-text-secondary mb-3">No subscriptions yet</p>
            <button
              onClick={onOpenManage}
              className="text-sm text-accent hover:underline"
            >
              Add your first subscription
            </button>
          </div>
        ) : (
          <div className="py-1">
            {groupedSubs.map((grouped) => {
              const groupKey = grouped.group?.id || "ungrouped";
              const isCollapsed = collapsedGroups.has(groupKey);

              return (
                <div key={groupKey}>
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-hover transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
                    )}
                    {grouped.group?.color && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: grouped.group.color }}
                      />
                    )}
                    <span className="flex-1 text-xs font-medium text-text-secondary text-left">
                      {grouped.group?.name || "Ungrouped"}
                    </span>
                    <span className="text-xs font-mono text-text-secondary">
                      {formatCurrency(grouped.totalMonthlyCost)}
                    </span>
                  </button>

                  {/* Group Items */}
                  {!isCollapsed && (
                    <div className="pl-2">
                      {grouped.subscriptions.map((sub) => (
                        <SubscriptionCard
                          key={sub.id}
                          subscription={sub}
                          variant="compact"
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-2 bg-bg-tertiary/50">
        <button
          onClick={onOpenManage}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm",
            "text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          )}
        >
          <Settings2 className="w-4 h-4" />
          Manage Subscriptions
        </button>
      </div>
    </div>
  );
}
