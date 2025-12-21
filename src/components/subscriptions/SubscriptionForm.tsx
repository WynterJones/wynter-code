import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip } from "@/components/ui";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useProjectStore } from "@/stores/projectStore";
import type { Subscription, SubscriptionInput, BillingCycle, CurrencyCode } from "@/types";

interface SubscriptionFormProps {
  subscription?: Subscription;
  onSave: () => void;
  onCancel: () => void;
}

const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "weekly", label: "Weekly" },
  { value: "one-time", label: "One-time" },
];

const CURRENCIES: { value: CurrencyCode; label: string; symbol: string }[] = [
  { value: "USD", label: "USD", symbol: "$" },
  { value: "EUR", label: "EUR", symbol: "\u20ac" },
  { value: "GBP", label: "GBP", symbol: "\u00a3" },
  { value: "CAD", label: "CAD", symbol: "C$" },
  { value: "AUD", label: "AUD", symbol: "A$" },
];

export function SubscriptionForm({
  subscription,
  onSave,
  onCancel,
}: SubscriptionFormProps) {
  const { addSubscription, updateSubscription, getCategoriesForProject, getFaviconUrl } =
    useSubscriptionStore();
  const { activeProjectId } = useProjectStore();

  const categories = activeProjectId ? getCategoriesForProject(activeProjectId) : [];

  const [formData, setFormData] = useState<Omit<SubscriptionInput, "projectId">>({
    name: subscription?.name ?? "",
    url: subscription?.url ?? "",
    faviconUrl: subscription?.faviconUrl ?? "",
    monthlyCost: subscription?.monthlyCost ?? 0,
    billingCycle: subscription?.billingCycle ?? "monthly",
    currency: subscription?.currency ?? "USD",
    categoryId: subscription?.categoryId ?? null,
    notes: subscription?.notes ?? "",
    isActive: subscription?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fetch favicon when URL changes
  useEffect(() => {
    if (formData.url && !formData.faviconUrl) {
      const favicon = getFaviconUrl(formData.url);
      if (favicon) {
        setFormData((prev) => ({ ...prev, faviconUrl: favicon }));
      }
    }
  }, [formData.url, formData.faviconUrl, getFaviconUrl]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (formData.monthlyCost < 0) {
      newErrors.monthlyCost = "Cost cannot be negative";
    }

    if (formData.url) {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = "Invalid URL format";
      }
    }

    if (!activeProjectId && !subscription) {
      newErrors.project = "No project selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (subscription) {
      updateSubscription(subscription.id, formData);
    } else if (activeProjectId) {
      addSubscription({
        ...formData,
        projectId: activeProjectId,
      });
    }

    onSave();
  };

  const isEditing = !!subscription;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-bg-primary rounded-xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
          <span className="font-medium text-text-primary">
            {isEditing ? "Edit Subscription" : "Add Subscription"}
          </span>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {errors.project && (
            <div className="p-2 rounded-lg bg-accent-red/10 border border-accent-red/30">
              <p className="text-xs text-accent-red">{errors.project}</p>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Name <span className="text-accent-red">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="GitHub Pro, AWS, Netflix..."
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-bg-tertiary border text-text-primary placeholder:text-text-secondary",
                "focus:outline-none focus:ring-2 focus:ring-accent/50",
                errors.name ? "border-accent-red" : "border-border"
              )}
            />
            {errors.name && (
              <p className="text-xs text-accent-red">{errors.name}</p>
            )}
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">URL</label>
            <input
              type="text"
              value={formData.url ?? ""}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://github.com"
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-bg-tertiary border text-text-primary placeholder:text-text-secondary",
                "focus:outline-none focus:ring-2 focus:ring-accent/50",
                errors.url ? "border-accent-red" : "border-border"
              )}
            />
            {errors.url && (
              <p className="text-xs text-accent-red">{errors.url}</p>
            )}
          </div>

          {/* Cost and Currency */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Cost</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.monthlyCost}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyCost: parseFloat(e.target.value) || 0 })
                }
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm font-mono",
                  "bg-bg-tertiary border text-text-primary",
                  "focus:outline-none focus:ring-2 focus:ring-accent/50",
                  errors.monthlyCost ? "border-accent-red" : "border-border"
                )}
              />
            </div>
            <div className="w-24 space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value as CurrencyCode })
                }
                className={cn(
                  "w-full px-2 py-2 rounded-lg text-sm",
                  "bg-bg-tertiary border border-border text-text-primary",
                  "focus:outline-none focus:ring-2 focus:ring-accent/50"
                )}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Billing Cycle */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Billing Cycle
            </label>
            <div className="flex flex-wrap gap-2">
              {BILLING_CYCLES.map((cycle) => (
                <button
                  key={cycle.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, billingCycle: cycle.value })}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm transition-colors",
                    formData.billingCycle === cycle.value
                      ? "bg-accent text-white"
                      : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
                  )}
                >
                  {cycle.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Category</label>
            <select
              value={formData.categoryId ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, categoryId: e.target.value || null })
              }
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-bg-tertiary border border-border text-text-primary",
                "focus:outline-none focus:ring-2 focus:ring-accent/50"
              )}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Notes</label>
            <textarea
              value={formData.notes ?? ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes about this subscription..."
              rows={2}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm resize-none",
                "bg-bg-tertiary border border-border text-text-primary placeholder:text-text-secondary",
                "focus:outline-none focus:ring-2 focus:ring-accent/50"
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className={cn(
                "px-4 py-2 rounded-lg text-sm",
                "text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "bg-accent text-white hover:bg-accent/90 transition-colors"
              )}
            >
              {isEditing ? "Save Changes" : "Add Subscription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
