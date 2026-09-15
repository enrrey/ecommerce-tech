"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { productKeys } from "../constants";
import { getProducts } from "../services/product.service";
import type { ProductListItem } from "../types/product.types";

export function useProducts(): UseQueryResult<ProductListItem[], Error> {
  return useQuery({
    queryKey: productKeys.list(),
    queryFn: getProducts,
  });
}
