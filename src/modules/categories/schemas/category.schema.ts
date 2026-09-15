import { z } from "zod";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const categoryFields = {
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre no puede superar 80 caracteres"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(80, "El slug no puede superar 80 caracteres")
    .regex(SLUG_PATTERN, "Usa solo minúsculas, números y guiones"),
  description: z
    .string()
    .trim()
    .max(500, "La descripción no puede superar 500 caracteres")
    .nullish()
    .transform((value) => (value ? value : null)),
  isActive: z.boolean(),
};

export const createCategorySchema = z.object({
  ...categoryFields,
  isActive: categoryFields.isActive.default(true),
});

// Sin `.default()` en isActive: en un PATCH el default reaparecería como campo
// enviado y reactivaría la categoría al editar solo el nombre.
export const updateCategorySchema = z
  .object(categoryFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

export const categoryIdSchema = z.uuid("Identificador de categoría inválido");

export type CreateCategoryInput = z.output<typeof createCategorySchema>;
export type UpdateCategoryInput = z.output<typeof updateCategorySchema>;
export type CategoryFormValues = z.input<typeof createCategorySchema>;
