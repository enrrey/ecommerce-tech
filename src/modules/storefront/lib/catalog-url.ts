import { formatPriceFromCents } from "@/lib/utils";

import {
  DEFAULT_PUBLIC_PAGE_SIZE,
  PUBLIC_PRODUCT_SORTS,
  publicProductQuerySchema,
  type PublicProductQuery,
  type PublicProductQueryInput,
} from "../schemas/public-catalog.schema";

export const CATALOG_PATH = "/products";

/** Valores crudos de la URL, en las dos formas que los entrega Next. */
type RawSearchParams = Record<string, string | string[] | undefined>;

export type PriceBucket = {
  id: string;
  label: string;
  minPriceCents?: number;
  maxPriceCents?: number;
};

/**
 * Los buckets son **presentación**: al servidor solo viajan `minPriceCents` y
 * `maxPriceCents` sueltos, nunca el identificador del rango. Los límites son
 * cerrados y no se solapan (49 999 y no 50 000) para que un producto de 500
 * caiga en un único bucket.
 */
export const PRICE_BUCKETS: readonly PriceBucket[] = [
  {
    id: "under-500",
    label: `Menos de ${formatPriceFromCents(50_000)}`,
    maxPriceCents: 49_999,
  },
  {
    id: "500-1500",
    label: `${formatPriceFromCents(50_000)} – ${formatPriceFromCents(150_000)}`,
    minPriceCents: 50_000,
    maxPriceCents: 149_999,
  },
  {
    id: "1500-4000",
    label: `${formatPriceFromCents(150_000)} – ${formatPriceFromCents(400_000)}`,
    minPriceCents: 150_000,
    maxPriceCents: 399_999,
  },
  {
    id: "over-4000",
    label: `Más de ${formatPriceFromCents(400_000)}`,
    minPriceCents: 400_000,
  },
];

export function isActivePriceBucket(
  bucket: PriceBucket,
  query: PublicProductQueryInput,
): boolean {
  return (
    bucket.minPriceCents === query.minPriceCents &&
    bucket.maxPriceCents === query.maxPriceCents
  );
}

/** Query por defecto: la que ve un visitante que entra a `/products` a secas. */
const DEFAULT_CATALOG_QUERY: PublicProductQuery =
  publicProductQuerySchema.parse({});

/**
 * Claves repetidas: se conserva la última, igual que el `Object.fromEntries`
 * del Route Handler. Página y API deben leer la misma URL de la misma forma.
 */
function collapseRepeated(raw: RawSearchParams): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.at(-1) : value,
    ]),
  );
}

/**
 * Lectura tolerante de la URL de la página: un parámetro inválido (`sort=foo`,
 * `page=0`) no puede reventar el catálogo, así que se cae a los defaults y se
 * renderiza. El 400 es cosa del endpoint, que sí valida estrictamente.
 */
export function parseCatalogSearchParams(
  raw: RawSearchParams,
): PublicProductQuery {
  const parsed = publicProductQuerySchema.safeParse(collapseRepeated(raw));

  return parsed.success ? parsed.data : DEFAULT_CATALOG_QUERY;
}

/**
 * URL canónica del catálogo con `patch` aplicado sobre el estado actual. Los
 * valores por defecto no se serializan: `/products` y `/products?page=1` son la
 * misma vista y no deben tener dos direcciones.
 */
export function buildCatalogHref(
  current: PublicProductQueryInput,
  patch: Partial<PublicProductQueryInput> = {},
): string {
  const next: PublicProductQueryInput = {
    ...current,
    ...patch,
    // Cambiar un filtro devuelve a la primera página: la página 3 del resultado
    // anterior puede no existir en el nuevo.
    page: patch.page ?? 1,
  };

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  if (next.page === 1) {
    params.delete("page");
  }

  if (next.sort === undefined || next.sort === PUBLIC_PRODUCT_SORTS[0]) {
    params.delete("sort");
  }

  if (next.pageSize === DEFAULT_PUBLIC_PAGE_SIZE) {
    params.delete("pageSize");
  }

  const search = params.toString();

  return search ? `${CATALOG_PATH}?${search}` : CATALOG_PATH;
}

/** `true` si el visitante tiene algún filtro puesto sobre el catálogo completo. */
export function hasActiveFilters(query: PublicProductQueryInput): boolean {
  return (
    query.q !== undefined ||
    query.category !== undefined ||
    query.brand !== undefined ||
    query.minPriceCents !== undefined ||
    query.maxPriceCents !== undefined ||
    query.inStock !== undefined ||
    query.onSale !== undefined
  );
}
