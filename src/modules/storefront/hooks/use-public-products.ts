"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";

import { storefrontKeys } from "../constants";
import type { PublicProductQueryInput } from "../schemas/public-catalog.schema";
import { getPublicProducts } from "../services/public-catalog.service";
import type { PublicProductPage } from "../types/public-catalog.types";

/**
 * `initialData` es la página que ya resolvió el Server Component: hidrata la
 * primera clave sin pedir de nuevo lo que viene en el HTML. Solo debe pasarse
 * cuando corresponde a *esta* query; con otra clave mostraría datos ajenos.
 *
 * Sin `initialDataUpdatedAt` a propósito: con el `staleTime` de 60 s la primera
 * clave no refetchea y ahí está el ahorro del SSR. Cualquier cambio de filtro
 * genera clave nueva y sí va al servidor.
 */
export function usePublicProducts(
  query: PublicProductQueryInput = {},
  initialData?: PublicProductPage,
): UseQueryResult<PublicProductPage, Error> {
  return useQuery({
    queryKey: storefrontKeys.products(query),
    queryFn: () => getPublicProducts(query),
    initialData,
    // Al teclear en el buscador la grilla mantiene los resultados anteriores en
    // lugar de vaciarse en cada pulsación.
    placeholderData: keepPreviousData,
  });
}
