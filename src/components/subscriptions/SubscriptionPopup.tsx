import { useState, useEffect, useCallback } from "react";
import { X, CreditCard, FolderOpen, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip } from "@/components/ui";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { SubscriptionCard } from "./SubscriptionCard";
import { SubscriptionForm } from "./SubscriptionForm";
import { GroupManager } from "./GroupManager";
import type { Subscription } from "@/types";

interface SubscriptionPopupProps {
  onClose: () => void;
}

type PopupTab = "subscriptions" | "groups";

export function SubscriptionPopup({ onClose }: SubscriptionPopupProps) {
  const [activeTab, setActiveTab] = useState<PopupTab>("subscriptions");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isAddingSubscription, setIsAddingSubscription] = useState(false);

  const {
    subscriptions,
    getGroupedSubscriptions,
    calculateSummary,
    deleteSubscription,
    toggleSubscriptionActive,
  } = useSubscriptionStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isAddingSubscription || editingSubscription) {
          setIsAddingSubscription(false);
          setEditingSubscription(null);
        } else {
          onClose();
        }
      }
    },
    [onClose, isAddingSubscription, editingSubscription]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const summary = calculateSummary();
  const groupedSubs = getGroupedSubscriptions();

  // Filter subscriptions by search query
  const filteredGroupedSubs = searchQuery
    ? groupedSubs
        .map((g) => ({
          ...g,
          subscriptions: g.subscriptions.filter((s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.notes?.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((g) => g.subscriptions.length > 0)
    : groupedSubs;

  // Also include inactive subscriptions in the main list
  const inactiveSubscriptions = subscriptions.filter((s) => !s.isActive);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleDelete = (sub: Subscription) => {
    if (confirm(`Delete "${sub.name}"? This action cannot be undone.`)) {
      deleteSubscription(sub.id);
    }
  };

  const tabs: { id: PopupTab; label: string; icon: typeof CreditCard }[] = [
    { id: "subscriptions", label: "All Subscriptions", icon: CreditCard },
    { id: "groups", label: "Groups", icon: FolderOpen },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-4xl h-[600px] max-h-[80vh] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
            <span className="font-medium text-text-primary">Subscriptions</span>
            <Tooltip content="Close (Esc)" side="bottom">
              <IconButton size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-48 border-r border-border bg-bg-secondary p-2 flex flex-col">
              <div className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      activeTab === tab.id
                        ? "bg-bg-hover text-text-primary"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Summary stats at bottom of sidebar */}
              <div className="mt-auto pt-4 border-t border-border space-y-2">
                <div className="px-3 py-2 rounded-lg bg-bg-tertiary">
                  <div className="text-xs text-text-secondary">Monthly</div>
                  <div className="text-lg font-mono font-medium text-accent-green">
                    {formatCurrency(summary.totalMonthly)}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-bg-tertiary">
                  <div className="text-xs text-text-secondary">Yearly</div>
                  <div className="text-sm font-mono text-text-primary">
                    {formatCurrency(summary.totalYearly)}
                  </div>
                </div>
                <div className="flex justify-between px-3 text-xs text-text-secondary">
                  <span>Active: {summary.activeCount}</span>
                  <span>Inactive: {summary.inactiveCount}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0">
              {activeTab === "subscriptions" && (
                <>
                  {/* Toolbar */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
                    <button
                      onClick={() => setIsAddingSubscription(true)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm",
                        "bg-accent text-white hover:bg-accent/90 transition-colors"
                      )}
                    >
                      <Plus className="w-4 h-4" />
                      Add Subscription
                    </button>

                    <div className="flex-1" />

                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search subscriptions..."
                        className={cn(
                          "w-64 pl-8 pr-3 py-1.5 rounded-md text-sm",
                          "bg-bg-tertiary border border-border text-text-primary placeholder:text-text-secondary",
                          "focus:outline-none focus:ring-2 focus:ring-accent/50"
                        )}
                      />
                    </div>
                  </div>

                  {/* Subscription List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {filteredGroupedSubs.length === 0 && inactiveSubscriptions.length === 0 ? (
                      <div className="text-center py-12">
                        <CreditCard className="w-12 h-12 mx-auto mb-4 text-text-secondary opacity-50" />
                        <p className="text-text-secondary mb-2">
                          {searchQuery ? "No subscriptions match your search" : "No subscriptions yet"}
                        </p>
                        {!searchQuery && (
                          <button
                            onClick={() => setIsAddingSubscription(true)}
                            className="text-sm text-accent hover:underline"
                          >
                            Add your first subscription
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {filteredGroupedSubs.map((grouped) => (
                          <div key={grouped.group?.id || "ungrouped"}>
                            <div className="flex items-center gap-2 mb-2">
                              {grouped.group?.color && (
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: grouped.group.color }}
                                />
                              )}
                              <h3 className="text-sm font-medium text-text-secondary">
                                {grouped.group?.name || "Ungrouped"}
                              </h3>
                              <span className="text-xs text-text-secondary font-mono">
                                {formatCurrency(grouped.totalMonthlyCost)}/mo
                              </span>
                            </div>
                            <div className="space-y-2">
                              {grouped.subscriptions.map((sub) => (
                                <SubscriptionCard
                                  key={sub.id}
                                  subscription={sub}
                                  variant="full"
                                  onEdit={() => setEditingSubscription(sub)}
                                  onDelete={() => handleDelete(sub)}
                                  onToggleActive={() => toggleSubscriptionActive(sub.id)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Inactive subscriptions */}
                        {inactiveSubscriptions.length > 0 && !searchQuery && (
                          <div>
                            <h3 className="text-sm font-medium text-text-secondary mb-2">
                              Inactive ({inactiveSubscriptions.length})
                            </h3>
                            <div className="space-y-2">
                              {inactiveSubscriptions.map((sub) => (
                                <SubscriptionCard
                                  key={sub.id}
                                  subscription={sub}
                                  variant="full"
                                  onEdit={() => setEditingSubscription(sub)}
                                  onDelete={() => handleDelete(sub)}
                                  onToggleActive={() => toggleSubscriptionActive(sub.id)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              {activeTab === "groups" && (
                <div className="flex-1 overflow-y-auto p-4">
                  <GroupManager />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {(isAddingSubscription || editingSubscription) && (
        <SubscriptionForm
          subscription={editingSubscription ?? undefined}
          onSave={() => {
            setIsAddingSubscription(false);
            setEditingSubscription(null);
          }}
          onCancel={() => {
            setIsAddingSubscription(false);
            setEditingSubscription(null);
          }}
        />
      )}
    </>
  );
}
