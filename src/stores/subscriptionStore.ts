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
  updateSubscription: (id: string, input: Partial<SubscriptionInput>) => void;
  deleteSubscription: (id: string) => void;
  toggleSubscriptionActive: (id: string) => void;

  // Category CRUD
  addCategory: (input: SubscriptionCategoryInput) => SubscriptionCategory;
  updateCategory: (id: string, input: Partial<Omit<SubscriptionCategoryInput, "projectId">>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (projectId: string, categoryIds: string[]) => void;

  // Project-scoped queries
  getSubscriptionsByProject: (projectId: string) => Subscription[];
  getSubscriptionsByCategory: (categoryId: string | null, projectId: string) => Subscription[];
  getCategorizedSubscriptions: (projectId: string) => CategorizedSubscriptions[];
  getCategoriesForProject: (projectId: string) => SubscriptionCategory[];
  calculateSummary: (projectId?: string) => SubscriptionSummary;

  // Sharing
  exportSubscriptions: (projectId: string) => ShareableSubscriptionData;
  importSubscriptions: (projectId: string, data: ShareableSubscriptionData) => void;

  // Utilities
  getFaviconUrl: (url: string) => string;

  // Legacy aliases (for gradual migration)
  groups: SubscriptionCategory[];
  addGroup: (input: SubscriptionCategoryInput) => SubscriptionCategory;
  updateGroup: (id: string, input: Partial<Omit<SubscriptionCategoryInput, "projectId">>) => void;
  deleteGroup: (id: string) => void;
  reorderGroups: (groupIds: string[]) => void;
  getSubscriptionsByGroup: (groupId: string | null) => Subscription[];
  getGroupedSubscriptions: () => CategorizedSubscriptions[];
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      categories: [],

      // Legacy alias
      get groups() {
        return get().categories;
      },

      addSubscription: (input) => {
        const now = Date.now();
        const projectSubs = get().subscriptions.filter(s => s.projectId === input.projectId);
        const subscription: Subscription = {
          id: uuid(),
          projectId: input.projectId,
          name: input.name,
          url: input.url ?? null,
          faviconUrl: input.faviconUrl ?? null,
          monthlyCost: input.monthlyCost,
          billingCycle: input.billingCycle ?? "monthly",
          currency: input.currency ?? "USD",
          categoryId: input.categoryId ?? null,
          notes: input.notes ?? null,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? projectSubs.length,
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
        const projectCategories = get().categories.filter(c => c.projectId === input.projectId);
        const category: SubscriptionCategory = {
          id: uuid(),
          projectId: input.projectId,
          name: input.name,
          color: input.color ?? null,
          sortOrder: input.sortOrder ?? projectCategories.length,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          categories: [...state.categories, category],
        }));

        return category;
      },

      // Legacy alias
      addGroup: (input) => get().addCategory(input),

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

      // Legacy alias
      updateGroup: (id, input) => get().updateCategory(id, input),

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((category) => category.id !== id),
          // Uncategorize subscriptions that were in this category
          subscriptions: state.subscriptions.map((sub) =>
            sub.categoryId === id ? { ...sub, categoryId: null } : sub
          ),
        }));
      },

      // Legacy alias
      deleteGroup: (id) => get().deleteCategory(id),

      reorderCategories: (projectId, categoryIds) => {
        set((state) => ({
          categories: state.categories.map((category) => {
            if (category.projectId !== projectId) return category;
            const newOrder = categoryIds.indexOf(category.id);
            return newOrder >= 0 ? { ...category, sortOrder: newOrder } : category;
          }),
        }));
      },

      // Legacy alias (uses first project's categories)
      reorderGroups: (groupIds) => {
        const firstProjectId = get().categories[0]?.projectId;
        if (firstProjectId) {
          get().reorderCategories(firstProjectId, groupIds);
        }
      },

      getSubscriptionsByProject: (projectId) => {
        return get()
          .subscriptions.filter((sub) => sub.projectId === projectId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },

      getSubscriptionsByCategory: (categoryId, projectId) => {
        return get()
          .subscriptions.filter((sub) => sub.projectId === projectId && sub.categoryId === categoryId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },

      // Legacy alias
      getSubscriptionsByGroup: (groupId) => {
        return get()
          .subscriptions.filter((sub) => sub.categoryId === groupId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },

      getCategoriesForProject: (projectId) => {
        return get()
          .categories.filter((cat) => cat.projectId === projectId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },

      getCategorizedSubscriptions: (projectId) => {
        const { subscriptions, categories } = get();
        const projectSubs = subscriptions.filter(s => s.projectId === projectId && s.isActive);
        const projectCategories = categories.filter(c => c.projectId === projectId);

        const categorized: Map<string | null, Subscription[]> = new Map();

        // Initialize with null category for uncategorized
        categorized.set(null, []);
        projectCategories.forEach((c) => categorized.set(c.id, []));

        // Sort subscriptions into categories
        projectSubs
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .forEach((sub) => {
            const list = categorized.get(sub.categoryId) ?? categorized.get(null)!;
            list.push(sub);
          });

        // Build result with categories first, then uncategorized
        const result: CategorizedSubscriptions[] = [];

        projectCategories
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

      // Legacy alias (returns all subscriptions grouped)
      getGroupedSubscriptions: () => {
        const { subscriptions, categories } = get();
        const grouped: Map<string | null, Subscription[]> = new Map();

        grouped.set(null, []);
        categories.forEach((c) => grouped.set(c.id, []));

        subscriptions
          .filter((s) => s.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .forEach((sub) => {
            const list = grouped.get(sub.categoryId) ?? grouped.get(null)!;
            list.push(sub);
          });

        const result: CategorizedSubscriptions[] = [];

        categories
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .forEach((category) => {
            const subs = grouped.get(category.id) ?? [];
            if (subs.length > 0) {
              result.push({
                category,
                subscriptions: subs,
                totalMonthlyCost: subs.reduce((sum, s) => sum + s.monthlyCost, 0),
              });
            }
          });

        const ungrouped = grouped.get(null) ?? [];
        if (ungrouped.length > 0) {
          result.push({
            category: null,
            subscriptions: ungrouped,
            totalMonthlyCost: ungrouped.reduce((sum, s) => sum + s.monthlyCost, 0),
          });
        }

        return result;
      },

      calculateSummary: (projectId?: string) => {
        const { subscriptions } = get();
        const filtered = projectId
          ? subscriptions.filter((s) => s.projectId === projectId)
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

      exportSubscriptions: (projectId) => {
        const { subscriptions, categories } = get();
        const projectSubs = subscriptions.filter(s => s.projectId === projectId);
        const projectCategories = categories.filter(c => c.projectId === projectId);

        return {
          subscriptions: projectSubs.map(({ id, projectId, createdAt, updatedAt, sortOrder, ...rest }) => rest),
          categories: projectCategories.map(({ id, projectId, createdAt, updatedAt, sortOrder, ...rest }) => rest),
          exportedAt: Date.now(),
          version: "1.0",
        };
      },

      importSubscriptions: (projectId, data) => {
        const now = Date.now();

        // Create category mapping (old name -> new id)
        const categoryMap = new Map<string, string>();

        const newCategories: SubscriptionCategory[] = data.categories.map((cat, index) => {
          const newId = uuid();
          categoryMap.set(cat.name, newId);
          return {
            ...cat,
            id: newId,
            projectId,
            sortOrder: index,
            createdAt: now,
            updatedAt: now,
          };
        });

        const existingSubs = get().subscriptions.filter(s => s.projectId === projectId);
        const newSubscriptions: Subscription[] = data.subscriptions.map((sub, index) => ({
          ...sub,
          id: uuid(),
          projectId,
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
        } catch {
          return "";
        }
      },
    }),
    {
      name: "wynter-code-subscriptions",
      // Migration from old format
      migrate: (persistedState: unknown, _version: number) => {
        const state = persistedState as {
          subscriptions?: (Subscription & { groupId?: string })[];
          groups?: SubscriptionCategory[];
          categories?: SubscriptionCategory[];
        };

        // Migrate groups to categories if needed
        if (state.groups && !state.categories) {
          return {
            ...state,
            categories: state.groups,
            groups: undefined,
          };
        }

        // Migrate subscriptions that have groupId but not categoryId
        if (state.subscriptions) {
          const migratedSubs = state.subscriptions.map((sub) => {
            if ('groupId' in sub && sub.groupId !== undefined) {
              const { groupId, ...rest } = sub;
              return { ...rest, categoryId: groupId ?? null };
            }
            return sub;
          });
          return {
            ...state,
            subscriptions: migratedSubs,
          };
        }

        return state;
      },
      version: 1,
    }
  )
);
