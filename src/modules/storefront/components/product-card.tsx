"use client";

import { ShoppingCartIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatPriceFromCents } from "@/lib/utils";
import { useCartStore } from "@/modules/cart/store/cart.store";

import { BRAND_BUTTON_CLASS } from "../constants";
import type { PublicProduct } from "../types/public-catalog.types";
import { ProductTile } from "./product-tile";

const NEW_PRODUCT_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * No existe columna de "destacado" ni de "novedad" en `products`: lo único real
 * que hay es la fecha de alta, así que la etiqueta se deriva de ella en vez de
 * inventar un dato.
 */
function isRecent(createdAt: string): boolean {
  // Postgres serializa "2026-08-29 13:04:44.51+00": el separador es un espacio,
  // no la "T" de ISO-8601, y no todos los motores de JS lo parsean.
  const timestamp = Date.parse(createdAt.replace(" ", "T"));

  return (
    Number.isFinite(timestamp) &&
    Date.now() - timestamp < NEW_PRODUCT_DAYS * DAY_MS
  );
}

/**
 * El importe anterior llega ya normalizado del repositorio (null si no supera
 * al precio), así que aquí solo queda pasarlo a porcentaje: es formato de vista,
 * no un dato que deba viajar por la API.
 */
function discountPercent(priceCents: number, compareAtPriceCents: number) {
  return Math.round((1 - priceCents / compareAtPriceCents) * 100);
}

export function ProductCard({ product }: { product: PublicProduct }) {
  const addItem = useCartStore((state) => state.addItem);
  const { compareAtPriceCents } = product;

  function handleAdd() {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
    });

    toast.success("Añadido al carrito", { description: product.name });
  }

  return (
    <Card className="hover:ring-brand/40 relative h-full gap-3 p-4 transition-all hover:-translate-y-1 hover:shadow-lg">
      {/*
        Una sola etiqueta por tarjeta, por prioridad: la disponibilidad manda
        sobre la oferta y la oferta sobre la novedad. Apilar las tres taparía la
        imagen y diluiría la que de verdad importa.
      */}
      <div className="absolute top-6 left-6 z-10 flex gap-1.5">
        {!product.inStock ? (
          <Badge variant="secondary">Sin stock</Badge>
        ) : compareAtPriceCents !== null ? (
          <Badge className="bg-deal text-deal-foreground">
            -{discountPercent(product.priceCents, compareAtPriceCents)}%
          </Badge>
        ) : isRecent(product.createdAt) ? (
          <Badge className="bg-brand-soft text-brand">Nuevo</Badge>
        ) : null}
      </div>

      <ProductTile
        name={product.name}
        imageUrl={product.imageUrl}
        className="aspect-[4/3] w-full rounded-xl"
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        fallbackClassName="text-5xl"
      />

      <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        {product.categoryName}
      </p>

      <h3 className="line-clamp-2 text-[0.95rem] leading-snug font-bold">
        {product.name}
      </h3>

      <div className="mt-auto flex flex-wrap items-baseline gap-2">
        <p className="text-xl font-extrabold tabular-nums">
          {formatPriceFromCents(product.priceCents)}
        </p>
        {compareAtPriceCents !== null ? (
          <p className="text-muted-foreground text-sm tabular-nums line-through">
            {formatPriceFromCents(compareAtPriceCents)}
          </p>
        ) : null}
      </div>

      <Button
        size="lg"
        className={cn("h-11 w-full", BRAND_BUTTON_CLASS)}
        disabled={!product.inStock}
        onClick={handleAdd}
      >
        <ShoppingCartIcon />
        {product.inStock ? "Añadir al carrito" : "Sin stock"}
      </Button>
    </Card>
  );
}
