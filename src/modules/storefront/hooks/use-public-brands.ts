"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { storefrontKeys } from "../constants";
import { getPublicBrands } from "../services/public-catalog.service";

export function usePublicBrands(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: storefrontKeys.brands(),
    queryFn: getPublicBrands,
  });
}
