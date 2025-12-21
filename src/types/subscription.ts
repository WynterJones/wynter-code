export type BillingCycle = "monthly" | "yearly" | "quarterly" | "weekly" | "one-time";
export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

export interface SubscriptionGroup {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriptionGroupInput {
  name: string;
  color?: string | null;
  sortOrder?: number;
}

export interface Subscription {
  id: string;
  name: string;
  url: string | null;
  faviconUrl: string | null;
  monthlyCost: number;
  billingCycle: BillingCycle;
  currency: CurrencyCode;
  groupId: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriptionInput {
  name: string;
  url?: string | null;
  faviconUrl?: string | null;
  monthlyCost: number;
  billingCycle?: BillingCycle;
  currency?: CurrencyCode;
  groupId?: string | null;
  notes?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface GroupedSubscriptions {
  group: SubscriptionGroup | null;
  subscriptions: Subscription[];
  totalMonthlyCost: number;
}

export interface SubscriptionSummary {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  inactiveCount: number;
}
