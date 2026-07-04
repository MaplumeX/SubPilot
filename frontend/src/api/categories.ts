import api from "./client";
import type { Category } from "./types";

export async function createCategory(name: string): Promise<Category> {
  const { data } = await api.post<Category>("/categories", { name });
  return data;
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/categories");
  return data;
}

export async function renameCategory(id: number, name: string): Promise<Category> {
  const { data } = await api.patch<Category>(`/categories/${id}`, { name });
  return data;
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categories/${id}`);
}
