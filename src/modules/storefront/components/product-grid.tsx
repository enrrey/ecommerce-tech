"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { usePublicProducts } from "../hooks/use-public-products";
import type { PublicProductQueryInput } from "../schemas/public-catalog.schema";
import type { PublicProductPage } from "../types/public-catalog.types";
import { ProductCard } from "./product-card";

type ProductGridProps = {
  query: PublicProductQueryInput;
  emptyMessage: string;
  /** Acción opcional bajo el estado vacío, p. ej. "Limpiar filtros". */
  emptyAction?: ReactNode;
  /** Página ya resuelta en servidor para esta misma query. */
  initialData?: PublicProductPage;
  className?: string;
};

const GRID_CLASS = "grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6";

function GridSkeleton({ count }: { count: number }) {
  return (
    <div className={GRID_CLASS} aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Grilla de catálogo con sus tres estados. Vive aparte de las secciones porque
 * "Ofertas" y "Destacados" solo se diferencian en la query y en el encabezado.
 */
export function ProductGrid({
  query,
  emptyMessage,
  emptyAction,
  initialData,
  className,
}: ProductGridProps) {
  const productsQuery = usePublicProducts(query, initialData);

  if (productsQuery.isPending) {
    return (
      <div className={className}>
        <GridSkeleton count={query.pageSize ?? 4} />
      </div>
    );
  }

  if (productsQuery.isError) {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center",
          className,
        )}
      >
        <p className="font-medium">No pudimos cargar los productos</p>
        <p className="text-muted-foreground text-sm">
          {productsQuery.error.message}
        </p>
        <Button variant="outline" onClick={() => productsQuery.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (productsQuery.data.items.length === 0) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center",
          className,
        )}
      >
        <p>{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div
      className={cn(GRID_CLASS, className)}
      // La grilla conserva los resultados previos mientras refetchea con un
      // término nuevo; el atributo lo comunica a lectores de pantalla.
      aria-busy={productsQuery.isFetching || undefined}
    >
      {productsQuery.data.items.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
