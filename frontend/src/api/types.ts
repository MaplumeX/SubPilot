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
  base_currency: string;
  created_at: string;
}

export interface AuthError {
  detail: string;
}

export type CycleUnit = "day" | "week" | "month" | "year";
export type SubscriptionStatus = "active" | "cancelled" | "trial";

export interface Category {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
}

export interface PaymentMethod {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
}

export interface CategoryBrief {
  id: number;
  name: string;
}

export interface PaymentMethodBrief {
  id: number;
  name: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  name: string;
  price: number;
  currency: string;
  cycle_count: number;
  cycle_unit: CycleUnit;
  category: CategoryBrief | null;
  payment_method: PaymentMethodBrief;
  status: SubscriptionStatus;
  start_date: string;
  next_billing_date: string | null;
  acknowledged_billing_date: string | null;
  auto_renew: boolean;
  reminder_enabled: boolean;
  reminder_mode: "default" | "custom";
  reminder_days: number | null;
  notes: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string | null;
  converted_price: number | null;
}

export interface SubscriptionCreate {
  name: string;
  price: number;
  currency?: string;
  cycle_count: number;
  cycle_unit: CycleUnit;
  category_id?: number | null;
  payment_method_id: number;
  status?: SubscriptionStatus;
  start_date: string;
  auto_renew?: boolean;
  reminder_enabled?: boolean;
  reminder_mode?: "default" | "custom";
  reminder_days?: number | null;
  notes?: string | null;
  logo_url?: string | null;
}

export interface SubscriptionUpdate {
  name?: string;
  price?: number;
  currency?: string;
  cycle_count?: number;
  cycle_unit?: CycleUnit;
  category_id?: number | null;
  payment_method_id?: number;
  status?: SubscriptionStatus;
  start_date?: string;
  auto_renew?: boolean;
  reminder_enabled?: boolean;
  reminder_mode?: "default" | "custom";
  reminder_days?: number | null;
  notes?: string | null;
  logo_url?: string | null;
}

export interface SubscriptionBrief {
  name: string;
  amount: number;
}

export interface SubscriptionStats {
  total_monthly: number;
  total_yearly: number;
  by_category: Record<string, number>;
  count: number;
  due_soon: Subscription[];
  base_currency: string;
  avg_monthly: number;
  most_expensive: SubscriptionBrief | null;
  cheapest: SubscriptionBrief | null;
  top3_percentage: number;
  monthly_prices: SubscriptionBrief[];
}

export interface ForecastChargeItem {
  subscription_id: number;
  name: string;
  billing_date: string;
  amount: number;
}

export interface MonthlyForecast {
  year_month: string;
  total: number;
  items: ForecastChargeItem[];
}

export interface SubscriptionForecast {
  base_currency: string;
  months: MonthlyForecast[];
  next_30_days_total: number;
}

export interface LogoCandidate {
  thumbnail: string;
  image: string;
  width: number | null;
  height: number | null;
}

export interface NotificationSettings {
  reminders_enabled: boolean;
  reminder_days: number;
  reminder_time: string;
  timezone: string;
  reminder_email_enabled: boolean;
  reminder_telegram_enabled: boolean;
  telegram_chat_id: string | null;
  telegram_bot_token: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password: string | null;
}

export type NotificationSettingsUpdate = Partial<NotificationSettings>;
