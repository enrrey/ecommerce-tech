import { api } from "@/lib/axios";

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../schemas/category.schema";
import type { Category } from "../types/category.types";

export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/categories");

  return data;
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<Category> {
  const { data } = await api.post<Category>("/categories", input);

  return data;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  const { data } = await api.patch<Category>(`/categories/${id}`, input);

  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}`);
}
