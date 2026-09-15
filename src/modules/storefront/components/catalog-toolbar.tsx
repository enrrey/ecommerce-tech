"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { hasActiveFilters } from "../lib/catalog-url";
import {
  PUBLIC_PRODUCT_SORTS,
  type PublicProductQuery,
  type PublicProductQueryInput,
  type PublicProductSort,
} from "../schemas/public-catalog.schema";

// El "mayor descuento" del catálogo es el orden `deals` que ya existía: ordena
// por oferta real y completa con lo más barato.
const SORT_LABELS: Record<PublicProductSort, string> = {
  newest: "Novedades",
  "price-asc": "Precio: de menor a mayor",
  "price-desc": "Precio: de mayor a menor",
  deals: "Mayor descuento",
};

type CatalogToolbarProps = {
  query: PublicProductQuery;
  total: number;
  isLoading: boolean;
  onPatch: (patch: Partial<PublicProductQueryInput>) => void;
  onClear: () => void;
};

export function CatalogToolbar({
  query,
  total,
  isLoading,
  onPatch,
  onClear,
}: CatalogToolbarProps) {
  const isFiltered = hasActiveFilters(query);

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          Catálogo
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground" aria-live="polite">
          {isLoading
            ? "Buscando productos…"
            : `${total} ${total === 1 ? "producto" : "productos"}`}
          {query.q ? ` para “${query.q}”` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isFiltered ? (
          <Button variant="ghost" onClick={onClear}>
            <XIcon />
            Limpiar filtros
          </Button>
        ) : null}

        <Select
          value={query.sort}
          onValueChange={(value) =>
            // El valor sale del propio `SelectItem`, así que ya es un orden
            // soportado; el 400 del endpoint cubre las URLs escritas a mano.
            onPatch({ sort: value as PublicProductSort })
          }
        >
          <SelectTrigger className="w-56" aria-label="Ordenar productos">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PUBLIC_PRODUCT_SORTS.map((sort) => (
              <SelectItem key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
