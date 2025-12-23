import { useState, useEffect, useCallback, useRef } from "react";
import { X, CreditCard, Tag, Plus, Search, Download, Upload, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip, ScrollArea } from "@/components/ui";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { SubscriptionCard } from "./SubscriptionCard";
import { SubscriptionForm } from "./SubscriptionForm";
import { CategoryManager } from "./CategoryManager";
import { SubscriptionStats } from "./SubscriptionStats";
import type { Subscription, ShareableSubscriptionData } from "@/types";

interface SubscriptionPopupProps {
  onClose: () => void;
}

type PopupTab = "subscriptions" | "categories" | "viewAll";

export function SubscriptionPopup({ onClose }: SubscriptionPopupProps) {
  const [activeTab, setActiveTab] = useState<PopupTab>("subscriptions");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isAddingSubscription, setIsAddingSubscription] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { activeWorkspaceId, getActiveWorkspace } = useWorkspaceStore();
  const activeWorkspace = getActiveWorkspace();

  const {
    getSubscriptionsByWorkspace,
    getCategorizedSubscriptions,
    calculateSummary,
    deleteSubscription,
    toggleSubscriptionActive,
    exportSubscriptions,
    importSubscriptions,
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

  const summary = calculateSummary(activeWorkspaceId ?? undefined);
  const workspaceSubscriptions = activeWorkspaceId ? getSubscriptionsByWorkspace(activeWorkspaceId) : [];
  const categorizedSubs = activeWorkspaceId ? getCategorizedSubscriptions(activeWorkspaceId) : [];

  // Filter subscriptions by search query
  const filteredCategorizedSubs = searchQuery
    ? categorizedSubs
        .map((g) => ({
          ...g,
          subscriptions: g.subscriptions.filter((s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.notes?.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((g) => g.subscriptions.length > 0)
    : categorizedSubs;

  // Inactive subscriptions for current workspace
  const inactiveSubscriptions = workspaceSubscriptions.filter((s) => !s.isActive);

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

  const handleExport = () => {
    if (!activeWorkspaceId) return;

    const data = exportSubscriptions(activeWorkspaceId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions-${activeWorkspace?.name ?? "export"}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeWorkspaceId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ShareableSubscriptionData;
        if (data.subscriptions && data.version) {
          importSubscriptions(activeWorkspaceId, data);
        } else {
          alert("Invalid subscription file format");
        }
      } catch {
        alert("Failed to parse subscription file");
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const tabs: { id: PopupTab; label: string; icon: typeof CreditCard }[] = [
    { id: "viewAll", label: "View All", icon: BarChart3 },
    { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
    { id: "categories", label: "Categories", icon: Tag },
  ];

  if (!activeWorkspaceId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-md bg-bg-primary rounded-xl border border-border shadow-2xl p-8 text-center">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-text-secondary opacity-50" />
          <h2 className="text-lg font-medium text-text-primary mb-2">No Workspace Selected</h2>
          <p className="text-sm text-text-secondary mb-4">
            Select or create a workspace to manage subscriptions.
          </p>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-4xl h-[600px] max-h-[80vh] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
          {/* Header - Drags the window */}
          <div
            data-tauri-drag-region
            className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-primary">Subscriptions</span>
              {activeTab !== "viewAll" && activeWorkspace && (
                <span className="text-xs text-text-secondary px-2 py-0.5 rounded-full bg-bg-tertiary">
                  {activeWorkspace.name}
                </span>
              )}
            </div>
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

              {/* Import/Export - only show for workspace tabs */}
              {activeTab !== "viewAll" && (
                <div className="mt-4 pt-4 border-t border-border space-y-1">
                  <button
                    onClick={handleExport}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50"
                    )}
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50"
                    )}
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </div>
              )}

              {/* Summary stats at bottom of sidebar - show workspace stats for workspace tabs */}
              {activeTab !== "viewAll" && (
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
              )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0">
              {activeTab === "viewAll" && (
                <ScrollArea className="flex-1">
                  <SubscriptionStats />
                </ScrollArea>
              )}

              {activeTab === "subscriptions" && (
                <>
                  {/* Toolbar */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
                    <button
                      onClick={() => setIsAddingSubscription(true)}
                      className="btn-primary"
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
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                    {filteredCategorizedSubs.length === 0 && inactiveSubscriptions.length === 0 ? (
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
                        {filteredCategorizedSubs.map((categorized) => (
                          <div key={categorized.category?.id || "uncategorized"}>
                            <div className="flex items-center gap-2 mb-2">
                              {categorized.category?.color && (
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: categorized.category.color }}
                                />
                              )}
                              <h3 className="text-sm font-medium text-text-secondary">
                                {categorized.category?.name || "Uncategorized"}
                              </h3>
                              <span className="text-xs text-text-secondary font-mono">
                                {formatCurrency(categorized.totalMonthlyCost)}/mo
                              </span>
                            </div>
                            <div className="space-y-2">
                              {categorized.subscriptions.map((sub) => (
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
                  </ScrollArea>
                </>
              )}

              {activeTab === "categories" && (
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    <CategoryManager />
                  </div>
                </ScrollArea>
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
