import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import type {
  Subscription,
  SubscriptionGroup,
  SubscriptionInput,
  SubscriptionGroupInput,
  GroupedSubscriptions,
  SubscriptionSummary,
} from "@/types";

interface SubscriptionStore {
  subscriptions: Subscription[];
  groups: SubscriptionGroup[];

  // Subscription CRUD
  addSubscription: (input: SubscriptionInput) => Subscription;
  updateSubscription: (id: string, input: Partial<SubscriptionInput>) => void;
  deleteSubscription: (id: string) => void;
  toggleSubscriptionActive: (id: string) => void;

  // Group CRUD
  addGroup: (input: SubscriptionGroupInput) => SubscriptionGroup;
  updateGroup: (id: string, input: Partial<SubscriptionGroupInput>) => void;
  deleteGroup: (id: string) => void;
  reorderGroups: (groupIds: string[]) => void;

  // Queries
  getSubscriptionsByGroup: (groupId: string | null) => Subscription[];
  getGroupedSubscriptions: () => GroupedSubscriptions[];
  calculateSummary: () => SubscriptionSummary;

  // Utilities
  getFaviconUrl: (url: string) => string;
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      groups: [],

      addSubscription: (input) => {
        const now = Date.now();
        const subscription: Subscription = {
          id: uuid(),
          name: input.name,
          url: input.url ?? null,
          faviconUrl: input.faviconUrl ?? null,
          monthlyCost: input.monthlyCost,
          billingCycle: input.billingCycle ?? "monthly",
          currency: input.currency ?? "USD",
          groupId: input.groupId ?? null,
          notes: input.notes ?? null,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? get().subscriptions.length,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          subscriptions: [...state.subscriptions, subscription],
        }));

        return subscription;
      },

      updateSubscription: (id, input) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((sub) =>
            sub.id === id
              ? {
                  ...sub,
                  ...input,
                  updatedAt: Date.now(),
                }
              : sub
          ),
        }));
      },

      deleteSubscription: (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.filter((sub) => sub.id !== id),
        }));
      },

      toggleSubscriptionActive: (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((sub) =>
            sub.id === id
              ? { ...sub, isActive: !sub.isActive, updatedAt: Date.now() }
              : sub
          ),
        }));
      },

      addGroup: (input) => {
        const now = Date.now();
        const group: SubscriptionGroup = {
          id: uuid(),
          name: input.name,
          color: input.color ?? null,
          sortOrder: input.sortOrder ?? get().groups.length,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          groups: [...state.groups, group],
        }));

        return group;
      },

      updateGroup: (id, input) => {
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id
              ? {
                  ...group,
                  ...input,
                  updatedAt: Date.now(),
                }
              : group
          ),
        }));
      },

      deleteGroup: (id) => {
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== id),
          // Ungroup subscriptions that were in this group
          subscriptions: state.subscriptions.map((sub) =>
            sub.groupId === id ? { ...sub, groupId: null } : sub
          ),
        }));
      },

      reorderGroups: (groupIds) => {
        set((state) => ({
          groups: state.groups.map((group) => ({
            ...group,
            sortOrder: groupIds.indexOf(group.id),
          })),
        }));
      },

      getSubscriptionsByGroup: (groupId) => {
        return get()
          .subscriptions.filter((sub) => sub.groupId === groupId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },

      getGroupedSubscriptions: () => {
        const { subscriptions, groups } = get();
        const grouped: Map<string | null, Subscription[]> = new Map();

        // Initialize with null group for ungrouped
        grouped.set(null, []);
        groups.forEach((g) => grouped.set(g.id, []));

        // Sort subscriptions into groups
        subscriptions
          .filter((s) => s.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .forEach((sub) => {
            const list = grouped.get(sub.groupId) ?? grouped.get(null)!;
            list.push(sub);
          });

        // Build result with groups first, then ungrouped
        const result: GroupedSubscriptions[] = [];

        groups
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .forEach((group) => {
            const subs = grouped.get(group.id) ?? [];
            if (subs.length > 0) {
              result.push({
                group,
                subscriptions: subs,
                totalMonthlyCost: subs.reduce((sum, s) => sum + s.monthlyCost, 0),
              });
            }
          });

        // Add ungrouped at end
        const ungrouped = grouped.get(null) ?? [];
        if (ungrouped.length > 0) {
          result.push({
            group: null,
            subscriptions: ungrouped,
            totalMonthlyCost: ungrouped.reduce((sum, s) => sum + s.monthlyCost, 0),
          });
        }

        return result;
      },

      calculateSummary: () => {
        const { subscriptions } = get();
        const active = subscriptions.filter((s) => s.isActive);

        const totalMonthly = active.reduce((sum, s) => {
          // Normalize to monthly
          switch (s.billingCycle) {
            case "yearly":
              return sum + s.monthlyCost / 12;
            case "quarterly":
              return sum + s.monthlyCost / 3;
            case "weekly":
              return sum + s.monthlyCost * 4.33;
            case "one-time":
              return sum;
            default:
              return sum + s.monthlyCost;
          }
        }, 0);

        return {
          totalMonthly,
          totalYearly: totalMonthly * 12,
          activeCount: active.length,
          inactiveCount: subscriptions.length - active.length,
        };
      },

      getFaviconUrl: (url) => {
        try {
          const urlObj = new URL(url);
          return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
        } catch {
          return "";
        }
      },
    }),
    {
      name: "wynter-code-subscriptions",
    }
  )
);
