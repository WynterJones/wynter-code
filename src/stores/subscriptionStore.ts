import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import type {
  Subscription,
  SubscriptionCategory,
  SubscriptionInput,
  SubscriptionCategoryInput,
  CategorizedSubscriptions,
  SubscriptionSummary,
  ShareableSubscriptionData,
} from "@/types";

interface SubscriptionStore {
  subscriptions: Subscription[];
  categories: SubscriptionCategory[];

  // Subscription CRUD
  addSubscription: (input: SubscriptionInput) => Subscription;
  addSubscriptionWithId: (id: string, input: SubscriptionInput) => Subscription; // For mobile API
  updateSubscription: (id: string, input: Partial<SubscriptionInput>) => void;
  deleteSubscription: (id: string) => void;
  toggleSubscriptionActive: (id: string) => void;

  // Category CRUD
  addCategory: (input: SubscriptionCategoryInput) => SubscriptionCategory;
  addCategoryWithId: (id: string, input: SubscriptionCategoryInput) => SubscriptionCategory; // For mobile API
  updateCategory: (id: string, input: Partial<Omit<SubscriptionCategoryInput, "workspaceId">>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (workspaceId: string, categoryIds: string[]) => void;

  // Workspace-scoped queries
  getSubscriptionsByWorkspace: (workspaceId: string) => Subscription[];
  getSubscriptionsByCategory: (categoryId: string | null, workspaceId: string) => Subscription[];
  getCategorizedSubscriptions: (workspaceId: string) => CategorizedSubscriptions[];
  getCategoriesForWorkspace: (workspaceId: string) => SubscriptionCategory[];
  calculateSummary: (workspaceId?: string) => SubscriptionSummary;

  // Global queries (across all workspaces)
  getAllSubscriptions: () => Subscription[];
  getAllActiveSubscriptions: () => Subscription[];
  calculateGlobalSummary: () => SubscriptionSummary;
  getSubscriptionsByBillingCycle: () => Record<string, { count: number; monthlyCost: number }>;
  getSubscriptionsByCurrency: () => Record<string, { count: number; monthlyCost: number }>;
  getTopSubscriptions: (limit?: number) => (Subscription & { _normalizedMonthly: number })[];

  // Sharing
  exportSubscriptions: (workspaceId: string) => ShareableSubscriptionData;
  importSubscriptions: (workspaceId: string, data: ShareableSubscriptionData) => void;

  // Utilities
  getFaviconUrl: (url: string) => string;

  // Reset
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      categories: [],

      addSubscription: (input) => {
        const now = Date.now();
        const workspaceSubs = get().subscriptions.filter(s => s.workspaceId === input.workspaceId);
        const subscription: Subscription = {
          id: uuid(),
          workspaceId: input.workspaceId,
          name: input.name,
          url: input.url ?? null,
          faviconUrl: input.faviconUrl ?? null,
          monthlyCost: input.monthlyCost,
          billingCycle: input.billingCycle ?? "monthly",
          currency: input.currency ?? "USD",
          categoryId: input.categoryId ?? null,
          notes: input.notes ?? null,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? workspaceSubs.length,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          subscriptions: [...state.subscriptions, subscription],
        }));

        return subscription;
      },

      addSubscriptionWithId: (id, input) => {
        // Check if subscription with this ID already exists (prevent duplicates)
        const existing = get().subscriptions.find(s => s.id === id);
        if (existing) {
          return existing;
        }

        const now = Date.now();
        const workspaceSubs = get().subscriptions.filter(s => s.workspaceId === input.workspaceId);
        const subscription: Subscription = {
          id,
          workspaceId: input.workspaceId,
          name: input.name,
          url: input.url ?? null,
          faviconUrl: input.faviconUrl ?? null,
          monthlyCost: input.monthlyCost,
          billingCycle: input.billingCycle ?? "monthly",
          currency: input.currency ?? "USD",
          categoryId: input.categoryId ?? null,
          notes: input.notes ?? null,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? workspaceSubs.length,
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

      addCategory: (input) => {
        const now = Date.now();
        const workspaceCategories = get().categories.filter(c => c.workspaceId === input.workspaceId);
        const category: SubscriptionCategory = {
          id: uuid(),
          workspaceId: input.workspaceId,
          name: input.name,
          color: input.color ?? null,
          sortOrder: input.sortOrder ?? workspaceCategories.length,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          categories: [...state.categories, category],
        }));

        return category;
      },

      addCategoryWithId: (id, input) => {
        // Check if category with this ID already exists (prevent duplicates)
        const existing = get().categories.find(c => c.id === id);
        if (existing) {
          return existing;
        }

        const now = Date.now();
        const workspaceCategories = get().categories.filter(c => c.workspaceId === input.workspaceId);
        const category: SubscriptionCategory = {
          id,
          workspaceId: input.workspaceId,
          name: input.name,
          color: input.color ?? null,
          sortOrder: input.sortOrder ?? workspaceCategories.length,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          categories: [...state.categories, category],
        }));

        return category;
      },

      updateCategory: (id, input) => {
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === id
              ? {
                  ...category,
                  ...input,
                  updatedAt: Date.now(),
                }
              : category
          ),
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((category) => category.id !== id),
          // Uncategorize subscriptions that were in this category
          subscriptions: state.subscriptions.map((sub) =>
            sub.categoryId === id ? { ...sub, categoryId: null } : sub
          ),
        }));
      },

      reorderCategories: (workspaceId, categoryIds) => {
        set((state) => ({
          categories: state.categories.map((category) => {
            if (category.workspaceId !== workspaceId) return category;
            const newOrder = categoryIds.indexOf(category.id);
            return newOrder >= 0 ? { ...category, sortOrder: newOrder } : category;
          }),
        }));
      },

      getSubscriptionsByWorkspace: (workspaceId) => {
        return get()
          .subscriptions.filter((sub) => sub.workspaceId === workspaceId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },

      getSubscriptionsByCategory: (categoryId, workspaceId) => {
        return get()
          .subscriptions.filter((sub) => sub.workspaceId === workspaceId && sub.categoryId === categoryId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },

      getCategoriesForWorkspace: (workspaceId) => {
        return get()
          .categories.filter((cat) => cat.workspaceId === workspaceId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },

      getCategorizedSubscriptions: (workspaceId) => {
        const { subscriptions, categories } = get();
        const workspaceSubs = subscriptions.filter(s => s.workspaceId === workspaceId && s.isActive);
        const workspaceCategories = categories.filter(c => c.workspaceId === workspaceId);

        const categorized: Map<string | null, Subscription[]> = new Map();

        // Initialize with null category for uncategorized
        categorized.set(null, []);
        workspaceCategories.forEach((c) => categorized.set(c.id, []));

        // Sort subscriptions into categories
        workspaceSubs
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .forEach((sub) => {
            const list = categorized.get(sub.categoryId) ?? categorized.get(null)!;
            list.push(sub);
          });

        // Build result with categories first, then uncategorized
        const result: CategorizedSubscriptions[] = [];

        workspaceCategories
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .forEach((category) => {
            const subs = categorized.get(category.id) ?? [];
            if (subs.length > 0) {
              result.push({
                category,
                subscriptions: subs,
                totalMonthlyCost: subs.reduce((sum, s) => sum + s.monthlyCost, 0),
              });
            }
          });

        // Add uncategorized at end
        const uncategorized = categorized.get(null) ?? [];
        if (uncategorized.length > 0) {
          result.push({
            category: null,
            subscriptions: uncategorized,
            totalMonthlyCost: uncategorized.reduce((sum, s) => sum + s.monthlyCost, 0),
          });
        }

        return result;
      },

      calculateSummary: (workspaceId?: string) => {
        const { subscriptions } = get();
        const filtered = workspaceId
          ? subscriptions.filter((s) => s.workspaceId === workspaceId)
          : subscriptions;
        const active = filtered.filter((s) => s.isActive);

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
          inactiveCount: filtered.length - active.length,
        };
      },

      // Global queries
      getAllSubscriptions: () => {
        return get().subscriptions.sort((a, b) => a.sortOrder - b.sortOrder);
      },

      getAllActiveSubscriptions: () => {
        return get().subscriptions.filter((s) => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
      },

      calculateGlobalSummary: () => {
        return get().calculateSummary();
      },

      getSubscriptionsByBillingCycle: () => {
        const active = get().subscriptions.filter((s) => s.isActive);
        const result: Record<string, { count: number; monthlyCost: number }> = {};

        active.forEach((sub) => {
          if (!result[sub.billingCycle]) {
            result[sub.billingCycle] = { count: 0, monthlyCost: 0 };
          }
          result[sub.billingCycle].count++;
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
          result[sub.billingCycle].monthlyCost += monthly;
        });

        return result;
      },

      getSubscriptionsByCurrency: () => {
        const active = get().subscriptions.filter((s) => s.isActive);
        const result: Record<string, { count: number; monthlyCost: number }> = {};

        active.forEach((sub) => {
          if (!result[sub.currency]) {
            result[sub.currency] = { count: 0, monthlyCost: 0 };
          }
          result[sub.currency].count++;
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
          result[sub.currency].monthlyCost += monthly;
        });

        return result;
      },

      getTopSubscriptions: (limit = 5) => {
        return get()
          .subscriptions.filter((s) => s.isActive)
          .map((sub) => {
            // Normalize to monthly for comparison
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
            return { ...sub, _normalizedMonthly: monthly };
          })
          .sort((a, b) => b._normalizedMonthly - a._normalizedMonthly)
          .slice(0, limit);
      },

      exportSubscriptions: (workspaceId) => {
        const { subscriptions, categories } = get();
        const workspaceSubs = subscriptions.filter(s => s.workspaceId === workspaceId);
        const workspaceCategories = categories.filter(c => c.workspaceId === workspaceId);

        return {
          subscriptions: workspaceSubs.map(({ id: _id, workspaceId: _wid, createdAt: _createdAt, updatedAt: _updatedAt, sortOrder: _sortOrder, ...rest }) => rest),
          categories: workspaceCategories.map(({ id: _id, workspaceId: _wid, createdAt: _createdAt, updatedAt: _updatedAt, sortOrder: _sortOrder, ...rest }) => rest),
          exportedAt: Date.now(),
          version: "1.0",
        };
      },

      importSubscriptions: (workspaceId, data) => {
        const now = Date.now();

        // Create category mapping (old name -> new id)
        const categoryMap = new Map<string, string>();

        const newCategories: SubscriptionCategory[] = data.categories.map((cat, index) => {
          const newId = uuid();
          categoryMap.set(cat.name, newId);
          return {
            ...cat,
            id: newId,
            workspaceId,
            sortOrder: index,
            createdAt: now,
            updatedAt: now,
          };
        });

        const existingSubs = get().subscriptions.filter(s => s.workspaceId === workspaceId);
        const newSubscriptions: Subscription[] = data.subscriptions.map((sub, index) => ({
          ...sub,
          id: uuid(),
          workspaceId,
          categoryId: sub.categoryId ? categoryMap.get(sub.categoryId) ?? null : null,
          sortOrder: existingSubs.length + index,
          createdAt: now,
          updatedAt: now,
        }));

        set((state) => ({
          categories: [...state.categories, ...newCategories],
          subscriptions: [...state.subscriptions, ...newSubscriptions],
        }));
      },

      getFaviconUrl: (url) => {
        try {
          const urlObj = new URL(url);
          return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
        } catch (error) {
          return "";
        }
      },

      reset: () => {
        set({
          subscriptions: [],
          categories: [],
        });
      },
    }),
    {
      name: "wynter-code-subscriptions",
      version: 2,
      // Migration from old format (projectId -> workspaceId)
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as {
          subscriptions?: (Subscription & { projectId?: string })[];
          categories?: (SubscriptionCategory & { projectId?: string })[];
        };

        if (version < 2) {
          // Migrate projectId to workspaceId
          const migratedSubs = (state.subscriptions ?? []).map((sub) => {
            if ('projectId' in sub && sub.projectId !== undefined) {
              const { projectId, ...rest } = sub;
              return { ...rest, workspaceId: projectId };
            }
            return sub;
          });

          const migratedCategories = (state.categories ?? []).map((cat) => {
            if ('projectId' in cat && cat.projectId !== undefined) {
              const { projectId, ...rest } = cat;
              return { ...rest, workspaceId: projectId };
            }
            return cat;
          });

          return {
            subscriptions: migratedSubs,
            categories: migratedCategories,
          };
        }

        return state;
      },
    }
  )
);
