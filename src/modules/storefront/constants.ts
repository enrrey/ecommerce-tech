import type { PublicProductQueryInput } from "./schemas/public-catalog.schema";

export const storefrontKeys = {
  all: ["storefront"] as const,
  products: (query: PublicProductQueryInput) =>
    [...storefrontKeys.all, "products", query] as const,
  categories: () => [...storefrontKeys.all, "categories"] as const,
  brands: () => [...storefrontKeys.all, "brands"] as const,
};

/** Ancla del catálogo: el buscador del header hace scroll hasta aquí. */
export const CATALOG_SECTION_ID = "catalogo";

export const HERO_SLIDE_COUNT = 3;

export const DEALS_COUNT = 4;

export const FEATURED_PAGE_SIZE = 8;

/**
 * Degradados de la tarjeta sin imagen: utilidades reales en `globals.css`
 * (`.bg-tile-1`…`.bg-tile-4`), no arbitrary values de Tailwind — esas rompían
 * el parser CSS de Turbopack en dev. Los colores viven en `--tile-1`…`--tile-4`.
 */
export const TILE_GRADIENTS = [
  "bg-tile-1",
  "bg-tile-2",
  "bg-tile-3",
  "bg-tile-4",
] as const;

/**
 * CTA de marca. Se compone sobre el `Button` de shadcn en vez de añadir una
 * variante nueva al componente: la marca es del storefront, no del sistema de
 * diseño que también usa el panel de administración.
 */
export const BRAND_BUTTON_CLASS =
  "bg-brand text-brand-foreground hover:bg-brand-hover";

/** Reparto estable: el mismo producto siempre recibe el mismo degradado. */
export function tileGradient(seed: string): string {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index)) % TILE_GRADIENTS.length;
  }

  return TILE_GRADIENTS[hash];
}
