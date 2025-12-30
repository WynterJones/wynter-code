import { ExternalLink, Pencil, Trash2, Power } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { cn } from "@/lib/utils";
import { FaviconImage } from "./FaviconImage";
import type { Subscription } from "@/types";

interface SubscriptionCardProps {
  subscription: Subscription;
  variant: "compact" | "full";
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleActive?: () => void;
}

export function SubscriptionCard({
  subscription,
  variant,
  onEdit,
  onDelete,
  onToggleActive,
}: SubscriptionCardProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleOpenLink = () => {
    if (subscription.url) {
      open(subscription.url);
    }
  };

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "group flex items-center gap-2 px-3 py-2 hover:bg-bg-hover transition-colors rounded-md",
          !subscription.isActive && "opacity-50"
        )}
      >
        <FaviconImage
          url={subscription.url}
          faviconUrl={subscription.faviconUrl}
          name={subscription.name}
          size="sm"
        />
        <span className="flex-1 text-sm text-text-primary truncate">
          {subscription.name}
        </span>
        <span className="text-sm font-mono text-text-secondary">
          {formatCurrency(subscription.monthlyCost, subscription.currency)}
        </span>
        {subscription.url && (
          <button
            onClick={handleOpenLink}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-tertiary transition-all"
            title="Open link"
          >
            <ExternalLink className="w-3.5 h-3.5 text-text-secondary hover:text-accent" />
          </button>
        )}
      </div>
    );
  }

  // Full variant for popup
  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 bg-bg-secondary rounded-lg border border-border hover:border-accent/30 transition-colors",
        !subscription.isActive && "opacity-60"
      )}
    >
      <FaviconImage
        url={subscription.url}
        faviconUrl={subscription.faviconUrl}
        name={subscription.name}
        size="lg"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary truncate">
            {subscription.name}
          </span>
          {!subscription.isActive && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary">
              Inactive
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
          <span className="font-mono">
            {formatCurrency(subscription.monthlyCost, subscription.currency)}
            <span className="text-text-secondary/60">
              /{subscription.billingCycle === "one-time" ? "once" : subscription.billingCycle.replace("ly", "")}
            </span>
          </span>
          {subscription.url && (
            <>
              <span className="text-border">|</span>
              <button
                onClick={handleOpenLink}
                className="hover:text-accent transition-colors flex items-center gap-1"
              >
                {new URL(subscription.url).hostname}
                <ExternalLink className="w-3 h-3" />
              </button>
            </>
          )}
        </div>

        {subscription.notes && (
          <p className="mt-2 text-xs text-text-secondary line-clamp-2">
            {subscription.notes}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onToggleActive && (
          <button
            onClick={onToggleActive}
            className={cn(
              "p-1.5 rounded hover:bg-bg-hover transition-colors",
              subscription.isActive ? "text-accent-green" : "text-text-secondary"
            )}
            title={subscription.isActive ? "Deactivate" : "Activate"}
          >
            <Power className="w-4 h-4" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded text-text-secondary hover:text-accent hover:bg-bg-hover transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
