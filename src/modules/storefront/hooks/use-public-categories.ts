"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { storefrontKeys } from "../constants";
import { getPublicCategories } from "../services/public-catalog.service";
import type { PublicCategory } from "../types/public-catalog.types";

export function usePublicCategories(): UseQueryResult<
  PublicCategory[],
  Error
> {
  return useQuery({
    queryKey: storefrontKeys.categories(),
    queryFn: getPublicCategories,
  });
}
