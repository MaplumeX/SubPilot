import api from "./client";
import type {
  Subscription,
  SubscriptionCreate,
  SubscriptionStats,
  SubscriptionUpdate,
} from "./types";

export async function createSubscription(
  data: SubscriptionCreate
): Promise<Subscription> {
  const { data: sub } = await api.post<Subscription>("/subscriptions", data);
  return sub;
}

export async function listSubscriptions(params?: {
  category?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
}): Promise<Subscription[]> {
  const { data } = await api.get<Subscription[]>("/subscriptions", { params });
  return data;
}

export async function getSubscription(id: number): Promise<Subscription> {
  const { data } = await api.get<Subscription>(`/subscriptions/${id}`);
  return data;
}

export async function updateSubscription(
  id: number,
  data: SubscriptionUpdate
): Promise<Subscription> {
  const { data: sub } = await api.put<Subscription>(
    `/subscriptions/${id}`,
    data
  );
  return sub;
}

export async function deleteSubscription(id: number): Promise<void> {
  await api.delete(`/subscriptions/${id}`);
}

export async function acknowledgeSubscription(id: number): Promise<Subscription> {
  const { data } = await api.post<Subscription>(`/subscriptions/${id}/acknowledge`);
  return data;
}

export async function uploadLogo(file: File): Promise<{ logo_url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<{ logo_url: string }>(
    "/subscriptions/upload-logo",
    formData
  );
  return data;
}

export async function getStats(): Promise<SubscriptionStats> {
  const { data } = await api.get<SubscriptionStats>("/subscriptions/stats");
  return data;
}

export async function listCategories(): Promise<string[]> {
  const { data } = await api.get<string[]>("/subscriptions/categories");
  return data;
}

export async function listPaymentMethods(): Promise<string[]> {
  const { data } = await api.get<string[]>("/subscriptions/payment-methods");
  return data;
}
