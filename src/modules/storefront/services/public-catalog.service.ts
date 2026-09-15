import { api } from "@/lib/axios";

import type { PublicProductQueryInput } from "../schemas/public-catalog.schema";
import type {
  PublicCategory,
  PublicProductPage,
} from "../types/public-catalog.types";

export async function getPublicProducts(
  query: PublicProductQueryInput = {},
): Promise<PublicProductPage> {
  // Axios omite del querystring las claves con valor `undefined`: los filtros
  // sin usar no llegan al servidor y Zod aplica sus defaults.
  const { data } = await api.get<PublicProductPage>("/public/products", {
    params: query,
  });

  return data;
}

export async function getPublicCategories(): Promise<PublicCategory[]> {
  const { data } = await api.get<PublicCategory[]>("/public/categories");

  return data;
}

export async function getPublicBrands(): Promise<string[]> {
  const { data } = await api.get<string[]>("/public/brands");

  return data;
}
