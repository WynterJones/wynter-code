export type BillingCycle = "monthly" | "yearly" | "quarterly" | "weekly" | "one-time";
export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

export interface SubscriptionCategory {
  id: string;
  workspaceId: string;
  name: string;
  color: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriptionCategoryInput {
  workspaceId: string;
  name: string;
  color?: string | null;
  sortOrder?: number;
}

export interface Subscription {
  id: string;
  workspaceId: string;
  name: string;
  url: string | null;
  faviconUrl: string | null;
  monthlyCost: number;
  billingCycle: BillingCycle;
  currency: CurrencyCode;
  categoryId: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriptionInput {
  workspaceId: string;
  name: string;
  url?: string | null;
  faviconUrl?: string | null;
  monthlyCost: number;
  billingCycle?: BillingCycle;
  currency?: CurrencyCode;
  categoryId?: string | null;
  notes?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CategorizedSubscriptions {
  category: SubscriptionCategory | null;
  subscriptions: Subscription[];
  totalMonthlyCost: number;
}

export interface SubscriptionSummary {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  inactiveCount: number;
}

export interface ShareableSubscriptionData {
  subscriptions: Omit<Subscription, "id" | "workspaceId" | "createdAt" | "updatedAt" | "sortOrder">[];
  categories: Omit<SubscriptionCategory, "id" | "workspaceId" | "createdAt" | "updatedAt" | "sortOrder">[];
  exportedAt: number;
  version: string;
}

// Legacy type aliases for migration
export type SubscriptionGroup = SubscriptionCategory;
export type SubscriptionGroupInput = SubscriptionCategoryInput;
export type GroupedSubscriptions = CategorizedSubscriptions;
