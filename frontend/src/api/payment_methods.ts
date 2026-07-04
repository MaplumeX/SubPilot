import api from "./client";
import type { PaymentMethod } from "./types";

export async function createPaymentMethod(name: string): Promise<PaymentMethod> {
  const { data } = await api.post<PaymentMethod>("/payment-methods", { name });
  return data;
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await api.get<PaymentMethod[]>("/payment-methods");
  return data;
}

export async function renamePaymentMethod(id: number, name: string): Promise<PaymentMethod> {
  const { data } = await api.patch<PaymentMethod>(`/payment-methods/${id}`, { name });
  return data;
}

export async function deletePaymentMethod(id: number): Promise<void> {
  await api.delete(`/payment-methods/${id}`);
}
