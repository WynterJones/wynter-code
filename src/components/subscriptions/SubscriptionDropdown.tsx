import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { SubscriptionCard } from "./SubscriptionCard";

interface SubscriptionDropdownProps {
  onClose: () => void;
  onOpenManage: () => void;
}

export function SubscriptionDropdown({
  onClose: _onClose,
  onOpenManage,
}: SubscriptionDropdownProps) {
  const { getSubscriptionsByWorkspace, calculateSummary } = useSubscriptionStore();
  const { activeWorkspaceId } = useWorkspaceStore();

  const workspaceSubscriptions = activeWorkspaceId
    ? getSubscriptionsByWorkspace(activeWorkspaceId).filter(s => s.isActive)
    : [];
  const summary = calculateSummary(activeWorkspaceId ?? undefined);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const isEmpty = workspaceSubscriptions.length === 0;

  return (
    <div className="absolute right-0 mt-1 w-80 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 overflow-hidden dropdown-solid">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-bg-tertiary/50">
        <span className="text-sm font-medium text-text-primary">Subscriptions</span>
        <span className="text-sm font-mono text-accent-green">
          {formatCurrency(summary.totalMonthly)}/mo
        </span>
      </div>

      {/* Content - flat list of subscriptions for current workspace */}
      <div className="max-h-[320px] overflow-y-auto">
        {isEmpty ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-text-secondary mb-3">
              {activeWorkspaceId ? "No subscriptions for this workspace" : "No workspace selected"}
            </p>
            {activeWorkspaceId && (
              <button
                onClick={onOpenManage}
                className="text-sm text-accent hover:underline"
              >
                Add your first subscription
              </button>
            )}
          </div>
        ) : (
          <div className="py-1">
            {workspaceSubscriptions.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                subscription={sub}
                variant="compact"
              />
            ))}
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
