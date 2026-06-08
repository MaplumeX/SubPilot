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

export async function getStats(): Promise<SubscriptionStats> {
  const { data } = await api.get<SubscriptionStats>("/subscriptions/stats");
  return data;
}
