export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  email: string;
  is_active: boolean;
  locale: string;
  created_at: string;
}

export interface AuthError {
  detail: string;
}

export type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly";
export type SubscriptionStatus = "active" | "cancelled" | "trial";

export interface Subscription {
  id: number;
  user_id: number;
  name: string;
  price: number;
  currency: string;
  billing_cycle: BillingCycle;
  category: string | null;
  status: SubscriptionStatus;
  start_date: string;
  next_billing_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface SubscriptionCreate {
  name: string;
  price: number;
  currency?: string;
  billing_cycle: BillingCycle;
  category?: string | null;
  status?: SubscriptionStatus;
  start_date: string;
  next_billing_date?: string | null;
  notes?: string | null;
}

export interface SubscriptionUpdate {
  name?: string;
  price?: number;
  currency?: string;
  billing_cycle?: BillingCycle;
  category?: string | null;
  status?: SubscriptionStatus;
  start_date?: string;
  next_billing_date?: string | null;
  notes?: string | null;
}

export interface SubscriptionStats {
  total_monthly: number;
  total_yearly: number;
  by_category: Record<string, number>;
  count: number;
  due_soon: Subscription[];
}
