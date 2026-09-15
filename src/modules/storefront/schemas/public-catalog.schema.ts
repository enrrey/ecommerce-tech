import { z } from "zod";

import { SLUG_PATTERN } from "@/modules/categories/schemas/category.schema";

// `deals` va al final a propósito: el default es `PUBLIC_PRODUCT_SORTS[0]`.
export const PUBLIC_PRODUCT_SORTS = [
  "newest",
  "price-asc",
  "price-desc",
  "deals",
] as const;

export const MAX_PUBLIC_PAGE_SIZE = 48;

export const DEFAULT_PUBLIC_PAGE_SIZE = 12;

/**
 * `?q=` es un parámetro presente y vacío: significa "sin filtro", no "buscar la
 * cadena vacía". Se normaliza antes de validar para que el default y el
 * `optional` de cada campo se apliquen igual que si el parámetro no viniera.
 */
function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

/** Mismo techo que el precio del admin: 200 000 unidades monetarias. */
export const MAX_PUBLIC_PRICE_CENTS = 20_000_000;

export const PRICE_RANGE_MESSAGE =
  "El precio mínimo no puede superar al precio máximo";

/**
 * `z.coerce.boolean()` está prohibido aquí: en un query string `"false"` es una
 * cadena no vacía y la coerción la convertiría en `true`. El enum obliga a que
 * el valor sea uno de los dos literales y el transform hace la conversión real.
 */
const booleanFlag = z.preprocess(
  emptyToUndefined,
  z
    .enum(["true", "false"], "El valor debe ser true o false")
    .transform((value) => value === "true")
    .optional(),
);

export const publicProductQuerySchema = z.object({
  q: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(80, "La búsqueda no puede superar 80 caracteres")
      .optional(),
  ),
  category: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .toLowerCase()
      .max(80, "La categoría no puede superar 80 caracteres")
      .regex(SLUG_PATTERN, "Categoría inválida")
      .optional(),
  ),
  // Sin `toLowerCase()` ni slug: la marca se compara por igualdad exacta contra
  // los valores que devuelve `/api/public/brands`, tal y como se guardaron.
  brand: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(60, "La marca no puede superar 60 caracteres")
      .optional(),
  ),
  minPriceCents: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number("El precio mínimo debe ser un número")
      .int("El precio mínimo debe ser entero")
      .min(0, "El precio mínimo no puede ser negativo")
      .max(
        MAX_PUBLIC_PRICE_CENTS,
        "El precio mínimo supera el máximo permitido",
      )
      .optional(),
  ),
  maxPriceCents: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number("El precio máximo debe ser un número")
      .int("El precio máximo debe ser entero")
      .min(0, "El precio máximo no puede ser negativo")
      .max(
        MAX_PUBLIC_PRICE_CENTS,
        "El precio máximo supera el máximo permitido",
      )
      .optional(),
  ),
  inStock: booleanFlag,
  onSale: booleanFlag,
  sort: z.preprocess(
    emptyToUndefined,
    z
      .enum(PUBLIC_PRODUCT_SORTS, "Orden no soportado")
      .default(PUBLIC_PRODUCT_SORTS[0]),
  ),
  page: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number("La página debe ser un número")
      .int("La página debe ser entera")
      .min(1, "La página empieza en 1")
      .default(1),
  ),
  pageSize: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number("El tamaño de página debe ser un número")
      .int("El tamaño de página debe ser entero")
      .min(1, "El tamaño de página mínimo es 1")
      .max(
        MAX_PUBLIC_PAGE_SIZE,
        `El tamaño de página máximo es ${MAX_PUBLIC_PAGE_SIZE}`,
      )
      .default(DEFAULT_PUBLIC_PAGE_SIZE),
  ),
})
  // Un rango invertido no es "sin resultados", es una URL mal formada: se
  // rechaza aquí y no se traduce a un `BETWEEN` que siempre daría vacío.
  .refine(
    (value) =>
      value.minPriceCents === undefined ||
      value.maxPriceCents === undefined ||
      value.minPriceCents <= value.maxPriceCents,
    { message: PRICE_RANGE_MESSAGE, path: ["minPriceCents"] },
  );

export type PublicProductSort = (typeof PUBLIC_PRODUCT_SORTS)[number];

/** Query ya validada: lo que consume el repositorio. */
export type PublicProductQuery = z.output<typeof publicProductQuerySchema>;

/** Query tal y como la escribe el cliente, con todo opcional. */
export type PublicProductQueryInput = {
  q?: string;
  category?: string;
  brand?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  onSale?: boolean;
  sort?: PublicProductSort;
  page?: number;
  pageSize?: number;
};
