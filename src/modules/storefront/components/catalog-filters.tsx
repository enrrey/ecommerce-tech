"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { BRAND_BUTTON_CLASS } from "../constants";
import { usePublicBrands } from "../hooks/use-public-brands";
import { usePublicCategories } from "../hooks/use-public-categories";
import { isActivePriceBucket, PRICE_BUCKETS } from "../lib/catalog-url";
import type {
  PublicProductQuery,
  PublicProductQueryInput,
} from "../schemas/public-catalog.schema";

type CatalogFiltersProps = {
  query: PublicProductQuery;
  onPatch: (patch: Partial<PublicProductQueryInput>) => void;
};

function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={isActive ? "default" : "outline"}
      aria-pressed={isActive}
      onClick={onClick}
      className={cn("rounded-full", isActive && BRAND_BUTTON_CLASS)}
    >
      {label}
    </Button>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-bold tracking-[0.08em] uppercase">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function ChipsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-8 w-24 rounded-full" />
      ))}
    </div>
  );
}

function LoadError({
  message,
  detail,
  onRetry,
}: {
  message: string;
  detail: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2">
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

/**
 * Cuerpo compartido por el panel de escritorio y el `Sheet` de móvil: el mismo
 * árbol montado dos veces, nunca dos copias del marcado.
 *
 * Cada chip alterna: volver a pulsar el valor activo lo quita. Es el único gesto
 * de deselección, igual que en la tira de categorías de la home.
 */
function FiltersBody({ query, onPatch }: CatalogFiltersProps) {
  const categoriesQuery = usePublicCategories();
  const brandsQuery = usePublicBrands();

  return (
    <div className="flex flex-col gap-6">
      <FilterSection title="Categoría">
        {categoriesQuery.isPending ? (
          <ChipsSkeleton />
        ) : categoriesQuery.isError ? (
          <LoadError
            message="No pudimos cargar las categorías"
            detail={categoriesQuery.error.message}
            onRetry={() => categoriesQuery.refetch()}
          />
        ) : categoriesQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay categorías publicadas.
          </p>
        ) : (
          categoriesQuery.data.map((category) => {
            const isActive = query.category === category.slug;

            return (
              <FilterChip
                key={category.id}
                label={category.name}
                isActive={isActive}
                onClick={() =>
                  onPatch({ category: isActive ? undefined : category.slug })
                }
              />
            );
          })
        )}
      </FilterSection>

      <Separator />

      <FilterSection title="Precio">
        {PRICE_BUCKETS.map((bucket) => {
          const isActive = isActivePriceBucket(bucket, query);

          return (
            <FilterChip
              key={bucket.id}
              label={bucket.label}
              isActive={isActive}
              onClick={() =>
                onPatch(
                  isActive
                    ? { minPriceCents: undefined, maxPriceCents: undefined }
                    : {
                        minPriceCents: bucket.minPriceCents,
                        maxPriceCents: bucket.maxPriceCents,
                      },
                )
              }
            />
          );
        })}
      </FilterSection>

      {/* La marca es nullable y sin backfill: si ningún producto activo la tiene,
          la sección entera se oculta en vez de mostrar una lista vacía. */}
      {brandsQuery.isPending ? (
        <>
          <Separator />
          <FilterSection title="Marca">
            <ChipsSkeleton />
          </FilterSection>
        </>
      ) : brandsQuery.isError ? (
        <>
          <Separator />
          <FilterSection title="Marca">
            <LoadError
              message="No pudimos cargar las marcas"
              detail={brandsQuery.error.message}
              onRetry={() => brandsQuery.refetch()}
            />
          </FilterSection>
        </>
      ) : brandsQuery.data.length > 0 ? (
        <>
          <Separator />
          <FilterSection title="Marca">
            {brandsQuery.data.map((brand) => {
              const isActive = query.brand === brand;

              return (
                <FilterChip
                  key={brand}
                  label={brand}
                  isActive={isActive}
                  onClick={() =>
                    onPatch({ brand: isActive ? undefined : brand })
                  }
                />
              );
            })}
          </FilterSection>
        </>
      ) : null}

      <Separator />

      <FilterSection title="Disponibilidad">
        <FilterChip
          label="Solo disponibles"
          isActive={query.inStock === true}
          onClick={() =>
            onPatch({ inStock: query.inStock === true ? undefined : true })
          }
        />
        <FilterChip
          label="En oferta"
          isActive={query.onSale === true}
          onClick={() =>
            onPatch({ onSale: query.onSale === true ? undefined : true })
          }
        />
      </FilterSection>
    </div>
  );
}

export function CatalogFilters({ query, onPatch }: CatalogFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <aside
        aria-label="Filtros del catálogo"
        className="hidden lg:sticky lg:top-24 lg:block lg:h-fit"
      >
        <FiltersBody query={query} onPatch={onPatch} />
      </aside>

      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <SlidersHorizontalIcon />
              Filtros
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-85 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">
              <FiltersBody
                query={query}
                // Aplicar un filtro cierra el panel: en móvil tapa la grilla y
                // el usuario no vería el efecto de lo que acaba de pulsar.
                onPatch={(patch) => {
                  onPatch(patch);
                  setIsOpen(false);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
