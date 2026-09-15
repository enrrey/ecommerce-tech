import { api } from "@/lib/axios";

import type {
  CreateProductInput,
  UpdateProductInput,
} from "../schemas/product.schema";
import type { Product, ProductListItem } from "../types/product.types";

export async function getProducts(): Promise<ProductListItem[]> {
  const { data } = await api.get<ProductListItem[]>("/products");

  return data;
}

export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  const { data } = await api.post<Product>("/products", input);

  return data;
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<Product> {
  const { data } = await api.patch<Product>(`/products/${id}`, input);

  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}
