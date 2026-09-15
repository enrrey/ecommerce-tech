import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import type { PermissionCode } from "@/server/db/seed-data";
import type { userRoles } from "@/server/db/schema/user-role";
import type { users } from "@/server/db/schema/user";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type UserRole = InferSelectModel<typeof userRoles>;
export type NewUserRole = InferInsertModel<typeof userRoles>;

/** Campos del espejo de Clerk que el webhook sincroniza; el resto los pone la BD. */
export type ClerkUserSyncInput = Pick<
  NewUser,
  "clerkId" | "email" | "firstName" | "lastName" | "imageUrl"
>;

/** Fila de `GET /api/admin/users`. Sin `clerkId`: el panel no lo necesita. */
export type UserWithRoles = Pick<
  User,
  "id" | "email" | "firstName" | "lastName" | "imageUrl" | "isActive" | "createdAt"
> & {
  roleSlugs: string[];
};

/**
 * Identidad del actor resuelta para autorizar: el `users.id` (no el `clerkId`,
 * que no es FK de nada) y los códigos de permiso que le dan sus roles.
 */
export type AuthorizedActor = {
  id: string;
  permissionCodes: PermissionCode[];
};
