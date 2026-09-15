"use client";

import Link from "next/link";
import { ArrowRightIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";

import { CATALOG_SECTION_ID, FEATURED_PAGE_SIZE } from "../constants";
import { CATALOG_PATH } from "../lib/catalog-url";
import type { PublicProductQueryInput } from "../schemas/public-catalog.schema";
import { useCatalogFiltersStore } from "../store/catalog-filters.store";
import { ProductGrid } from "./product-grid";

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Preview del catálogo en la home: solo búsqueda. El filtrado completo vive en
 * `/products`, con la URL como estado, y aquí se enlaza en vez de duplicarlo.
 */
export function FeaturedSection() {
  const term = useCatalogFiltersStore((state) => state.term);
  const reset = useCatalogFiltersStore((state) => state.reset);
  // El header escribe el término en cada pulsación; el retardo vive aquí, junto
  // al único consumidor que dispara peticiones.
  const debouncedTerm = useDebounce(term, SEARCH_DEBOUNCE_MS);

  const isFiltered = debouncedTerm.length > 0;

  const query: PublicProductQueryInput = {
    q: debouncedTerm || undefined,
    sort: "newest",
    pageSize: FEATURED_PAGE_SIZE,
  };

  return (
    <section
      id={CATALOG_SECTION_ID}
      className="bg-muted scroll-mt-24 border-y py-16"
    >
      <div className="mx-auto w-full max-w-[1200px] px-5">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-brand text-xs font-bold tracking-[0.08em] uppercase">
              {isFiltered ? "Resultados" : "Los favoritos de la tienda"}
            </p>
            <h2 className="font-display mt-1.5 text-2xl font-bold md:text-3xl">
              {isFiltered ? "Tu búsqueda" : "Destacados"}
            </h2>
            {isFiltered ? (
              <p className="text-muted-foreground mt-2 text-sm">
                “{debouncedTerm}”
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isFiltered ? (
              <Button variant="outline" onClick={reset}>
                <XIcon />
                Limpiar búsqueda
              </Button>
            ) : null}

            <Button asChild variant="ghost">
              <Link href={CATALOG_PATH}>
                Ver todo el catálogo
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>
        </div>

        <ProductGrid
          query={query}
          emptyMessage={
            isFiltered
              ? "Ningún producto coincide con tu búsqueda."
              : "Todavía no hay productos publicados."
          }
        />
      </div>
    </section>
  );
}
