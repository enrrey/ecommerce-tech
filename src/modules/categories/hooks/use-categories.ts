"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { categoryKeys } from "../constants";
import { getCategories } from "../services/category.service";
import type { Category } from "../types/category.types";

export function useCategories(): UseQueryResult<Category[], Error> {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: getCategories,
  });
}
