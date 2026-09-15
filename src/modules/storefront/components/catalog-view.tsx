"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

import { usePublicProducts } from "../hooks/use-public-products";
import {
  buildCatalogHref,
  CATALOG_PATH,
  parseCatalogSearchParams,
} from "../lib/catalog-url";
import type { PublicProductQueryInput } from "../schemas/public-catalog.schema";
import type { PublicProductPage } from "../types/public-catalog.types";
import { CatalogFilters } from "./catalog-filters";
import { CatalogPagination } from "./catalog-pagination";
import { CatalogToolbar } from "./catalog-toolbar";
import { ProductGrid } from "./product-grid";

/**
 * La URL es el **único** estado de esta página: no se lee ni se escribe
 * `useCatalogFiltersStore`, que sigue siendo del preview de la home. Duplicar el
 * estado en Zustand desincronizaría el botón "atrás" del navegador.
 */
export function CatalogView({
  initialPage,
}: {
  initialPage: PublicProductPage;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = useMemo(
    () => parseCatalogSearchParams(Object.fromEntries(searchParams)),
    [searchParams],
  );

  const href = buildCatalogHref(query, { page: query.page });
  // `initialPage` corresponde a la URL con la que entró el visitante, congelada
  // al montar. En cuanto cambia un filtro la clave de la query es otra y pasar
  // esos datos mostraría el resultado de una búsqueda distinta.
  const [initialHref] = useState(href);
  const initialData = href === initialHref ? initialPage : undefined;

  const productsQuery = usePublicProducts(query, initialData);

  function navigate(patch: Partial<PublicProductQueryInput>) {
    // `replace` y no `push`: filtrar es refinar la misma vista, no un salto de
    // navegación que el "atrás" deba deshacer paso a paso. `scroll: false`
    // mantiene la vista donde está al pulsar un chip.
    router.replace(buildCatalogHref(query, patch), { scroll: false });
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-10">
      <CatalogToolbar
        query={query}
        total={productsQuery.data?.total ?? 0}
        isLoading={productsQuery.isPending}
        onPatch={navigate}
        onClear={() => router.replace(CATALOG_PATH, { scroll: false })}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <CatalogFilters query={query} onPatch={navigate} />

        <div className="flex flex-col gap-8">
          <ProductGrid
            query={query}
            initialData={initialData}
            // La grilla del catálogo es de 3 columnas en escritorio, no de 4
            // como en la home: aquí convive con la columna de filtros.
            className="lg:grid-cols-3"
            emptyMessage="Ningún producto coincide con los filtros aplicados."
            emptyAction={
              <Button
                variant="outline"
                onClick={() => router.replace(CATALOG_PATH, { scroll: false })}
              >
                Limpiar filtros
              </Button>
            }
          />

          <CatalogPagination
            page={query.page}
            pageSize={query.pageSize}
            total={productsQuery.data?.total ?? 0}
            onPageChange={(page) => navigate({ page })}
          />
        </div>
      </div>
    </div>
  );
}
