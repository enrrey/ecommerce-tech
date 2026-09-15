"use client";

import Link from "next/link";
import { LayersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { usePublicCategories } from "../hooks/use-public-categories";
import { buildCatalogHref } from "../lib/catalog-url";

const STRIP_CLASS =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4";

export function CategoryStrip() {
  const categoriesQuery = usePublicCategories();

  if (categoriesQuery.isPending) {
    return (
      <div className={STRIP_CLASS} aria-busy="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-31 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (categoriesQuery.isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center"
      >
        <p className="font-medium">No pudimos cargar las categorías</p>
        <p className="text-muted-foreground text-sm">
          {categoriesQuery.error.message}
        </p>
        <Button variant="outline" onClick={() => categoriesQuery.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (categoriesQuery.data.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center">
        Todavía no hay categorías publicadas.
      </div>
    );
  }

  return (
    <div className={STRIP_CLASS}>
      {categoriesQuery.data.map((category) => (
        <Card
          key={category.id}
          className="hover:ring-brand/40 p-0 transition-all hover:-translate-y-1 hover:shadow-md"
        >
          {/* Navegación real al catálogo filtrado, no un filtro en memoria: la
              tarjeta es un enlace y la URL resultante se puede compartir. */}
          <Link
            href={buildCatalogHref({}, { category: category.slug })}
            className="flex h-full w-full flex-col items-start gap-3 p-5 text-left"
          >
            <span className="bg-brand-soft text-brand flex size-10 items-center justify-center rounded-lg">
              <LayersIcon className="size-5" />
            </span>
            <span className="text-sm font-bold">{category.name}</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {category.productCount}{" "}
              {category.productCount === 1 ? "producto" : "productos"}
            </span>
          </Link>
        </Card>
      ))}
    </div>
  );
}
