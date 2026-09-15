import { z } from "zod";

import { ROLE_SEED } from "@/server/db/seed-data";

// Derivado de la semilla, no escrito a mano: un rol nuevo en `ROLE_SEED` queda
// aceptado sin tocar este archivo, y uno inexistente nunca llega al repositorio.
const ROLE_SLUGS = ROLE_SEED.map((role) => role.slug) as [string, ...string[]];

export const roleSlugSchema = z.enum(ROLE_SLUGS, {
  message: "El rol indicado no existe",
});

export const assignRoleSchema = z.object({
  roleSlug: roleSlugSchema,
});

export const userIdParamSchema = z.object({
  id: z.uuid("Identificador de usuario inválido"),
});

export const revokeRoleParamsSchema = userIdParamSchema.extend({
  roleSlug: roleSlugSchema,
});

export type AssignRoleInput = z.output<typeof assignRoleSchema>;
export type UserIdParam = z.output<typeof userIdParamSchema>;
export type RevokeRoleParams = z.output<typeof revokeRoleParamsSchema>;
