import { z } from "zod";

import { SLUG_PATTERN } from "@/modules/categories/schemas/category.schema";

export const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/**
 * El formulario trabaja en unidades monetarias (1299.90) y el dominio en
 * centavos (129990). La conversión vive aquí, en un solo sitio compartido por
 * cliente y servidor.
 *
 * El parámetro de tipo fija la entrada en `string | number`: sin él la entrada
 * inferida sería `unknown` y React Hook Form no podría tiparse con `z.input`.
 */
export const priceToCents = z.coerce
  .number<string | number>("El precio debe ser un número")
  .nonnegative("El precio no puede ser negativo")
  .max(200_000, "El precio supera el máximo permitido")
  // 1299.905 no es un importe representable en centavos: se rechaza antes de
  // redondear, para no cobrar un centavo distinto del que se escribió.
  .refine((value) => Number(value.toFixed(2)) === value, "Máximo 2 decimales")
  // Math.round y no Number: 1299.90 * 100 da 129989.99… en coma flotante.
  .transform((value) => Math.round(value * 100));

const productFields = {
  categoryId: z.uuid("Selecciona una categoría"),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "El SKU debe tener al menos 3 caracteres")
    .max(40, "El SKU no puede superar 40 caracteres")
    .regex(SKU_PATTERN, "Usa mayúsculas, números y guiones"),
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "El nombre no puede superar 120 caracteres"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(140, "El slug no puede superar 140 caracteres")
    .regex(SLUG_PATTERN, "Usa solo minúsculas, números y guiones"),
  // Mismo patrón que `imageUrl`: el campo vacío del formulario llega como "" y
  // significa "sin marca", no la cadena vacía guardada en la columna.
  brand: z
    .string()
    .trim()
    .max(60, "La marca no puede superar 60 caracteres")
    .nullish()
    .transform((value) => (value ? value : null)),
  description: z
    .string()
    .trim()
    .max(2000, "La descripción no puede superar 2000 caracteres")
    .nullish()
    .transform((value) => (value ? value : null)),
  priceCents: priceToCents,
  // Precio anterior opcional. El campo vacío del formulario llega como "" y
  // significa "sin oferta", igual que `imageUrl`. Se resuelve con una unión y
  // no con `z.preprocess`, que dejaría la entrada en `unknown` y rompería el
  // tipado de React Hook Form.
  compareAtPriceCents: z
    .literal("")
    .or(z.null())
    .or(priceToCents)
    .optional()
    .transform((value) => (typeof value === "number" ? value : null)),
  stock: z.coerce
    .number<string | number>("El stock debe ser un número")
    .int("El stock debe ser entero")
    .min(0, "El stock no puede ser negativo")
    .max(1_000_000, "El stock supera el máximo permitido"),
  imageUrl: z
    .url("URL de imagen inválida")
    // El campo vacío del formulario llega como "" y debe significar "sin
    // imagen", no "URL inválida".
    .or(z.literal(""))
    .nullish()
    .transform((value) => (value ? value : null)),
  isActive: z.boolean(),
};

/**
 * La regla "el precio anterior debe superar al actual" vive en Zod y no en un
 * check de la BD: un check cruzado convertiría en 500 un PATCH que solo sube el
 * precio de un producto en oferta. La BD solo garantiza el no-negativo.
 */
export const COMPARE_AT_PRICE_MESSAGE =
  "El precio anterior debe ser mayor que el precio";

const COMPARE_AT_PRICE_ISSUE = {
  message: COMPARE_AT_PRICE_MESSAGE,
  path: ["compareAtPriceCents"],
};

export function hasValidCompareAtPrice(value: {
  priceCents: number;
  compareAtPriceCents: number | null;
}): boolean {
  return (
    value.compareAtPriceCents === null ||
    value.compareAtPriceCents > value.priceCents
  );
}

export const createProductSchema = z
  .object({
    ...productFields,
    isActive: productFields.isActive.default(true),
  })
  .refine(hasValidCompareAtPrice, COMPARE_AT_PRICE_ISSUE);

// Sin `.default()` en isActive: en un PATCH el default reaparecería como campo
// enviado y reactivaría el producto al editar solo el nombre.
// Nadie llama `.parse()` sobre este schema hoy (el formulario de edición valida
// con `createProductSchema`, igual que el de creación): se mantiene solo para
// derivar `UpdateProductInput`, en paralelo a `updateProductApiSchema` abajo.
export const updateProductSchema = z
  .object(productFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

// El formulario valida con `createProductSchema` vía zodResolver, que ya
// transforma `priceCents` de unidades monetarias a centavos antes de llamar a
// `onSubmit` (`CreateProductInput` es el tipo de salida). El body HTTP que
// llega a la API ya trae ese entero: si el handler re-parsea con
// `createProductSchema`, `priceToCents` lo interpreta otra vez como unidades
// monetarias y multiplica por 100 dos veces. Estos esquemas validan el
// contrato real de la API (§6): `priceCents` ya es centavos.
const apiProductFields = {
  ...productFields,
  priceCents: z
    .number()
    .int()
    .nonnegative("El precio no puede ser negativo")
    // Mismo techo que `priceToCents` (200_000 unidades = 20_000_000 centavos):
    // un POST/PATCH directo a la API no debe poder saltárselo.
    .max(20_000_000, "El precio supera el máximo permitido"),
  compareAtPriceCents: z
    .number()
    .int()
    .nonnegative("El precio anterior no puede ser negativo")
    .max(20_000_000, "El precio anterior supera el máximo permitido")
    .nullable(),
};

export const createProductApiSchema = z
  .object({
    ...apiProductFields,
    isActive: apiProductFields.isActive.default(true),
    // Igual que `isActive`: omitir la clave en el POST significa "sin oferta",
    // no un 400.
    compareAtPriceCents: apiProductFields.compareAtPriceCents.default(null),
  })
  .refine(hasValidCompareAtPrice, COMPARE_AT_PRICE_ISSUE);

export const updateProductApiSchema = z
  .object(apiProductFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  })
  // Solo se comparan cuando el PATCH trae ambas claves: con `price_cents`
  // ausente no hay contra qué comparar y la fila puede quedar incoherente, que
  // es justo lo que la lectura pública neutraliza al normalizar a null.
  .refine(
    (value) =>
      value.priceCents === undefined ||
      value.compareAtPriceCents === undefined ||
      value.compareAtPriceCents === null ||
      value.compareAtPriceCents > value.priceCents,
    COMPARE_AT_PRICE_ISSUE,
  );

export const productIdSchema = z.uuid("Identificador de producto inválido");

export type CreateProductInput = z.output<typeof createProductSchema>;
export type UpdateProductInput = z.output<typeof updateProductSchema>;
export type ProductFormValues = z.input<typeof createProductSchema>;
