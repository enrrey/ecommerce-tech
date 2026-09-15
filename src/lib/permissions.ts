import "server-only";

import { cache } from "react";
import { auth } from "@clerk/nextjs/server";

import { ForbiddenError, UnauthorizedError } from "@/lib/api-errors";
import type { AuthorizedActor } from "@/modules/roles/types/user-role.types";
import { findActorByClerkId } from "@/server/repositories/user.repository";
import type { PermissionCode } from "@/server/db/seed-data";

/**
 * `cache()` deduplica el join dentro de una misma request (un handler puede
 * comprobar varios permisos). No hay caché entre requests a propósito: revocar
 * un rol tiene que surtir efecto en la petición siguiente.
 */
const loadActor = cache(
  async (clerkId: string): Promise<AuthorizedActor | null> =>
    findActorByClerkId(clerkId),
);

export async function getPermissionCodes(
  clerkId: string,
): Promise<PermissionCode[]> {
  const actor = await loadActor(clerkId);

  return actor?.permissionCodes ?? [];
}

/** Comprobación sin efectos para decidir qué mostrar; no protege nada por sí sola. */
export async function can(code: PermissionCode): Promise<boolean> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return false;
  }

  return (await getPermissionCodes(clerkId)).includes(code);
}

/**
 * Única puerta de autorización de la API. Devuelve el `users.id` del actor, que
 * es lo que alimenta `assigned_by` y `audit_logs.actor_id`.
 *
 * Autoriza por código de permiso, nunca por slug de rol: `super_admin` puede
 * porque tiene el permiso en `role_permissions`, no porque el código lo mire.
 */
export async function requirePermission(
  code: PermissionCode,
): Promise<string> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    throw new UnauthorizedError();
  }

  const actor = await loadActor(clerkId);

  // Sin fila en `users` o dada de baja: la sesión es válida, la autorización no.
  if (!actor || !actor.permissionCodes.includes(code)) {
    throw new ForbiddenError();
  }

  return actor.id;
}
