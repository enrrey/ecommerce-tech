import "server-only";

import { and, eq } from "drizzle-orm";

import { NotFoundError } from "@/lib/api-errors";
import type { UserRole } from "@/modules/roles/types/user-role.types";
import { db, type Database } from "@/server/db";
import { roles } from "@/server/db/schema/role";
import { userRoles } from "@/server/db/schema/user-role";
import { insertAuditLog } from "@/server/repositories/audit-log.repository";

type DbClient = Parameters<Parameters<Database["transaction"]>[0]>[0];

type RoleAssignmentInput = {
  userId: string;
  roleSlug: string;
  /** `users.id` del actor devuelto por `requirePermission`. */
  actorId: string;
};

const AUDIT_ENTITY_TYPE = "user";

async function findRoleIdBySlug(
  client: DbClient,
  slug: string,
): Promise<string> {
  const [role] = await client
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.slug, slug))
    .limit(1);

  if (!role) {
    throw new NotFoundError("El rol indicado no existe");
  }

  return role.id;
}

/**
 * La asignación y su rastro viajan en la misma transacción: si la bitácora
 * falla, el permiso no queda concedido a espaldas de la auditoría.
 *
 * Duplicar la asignación viola la PK (userId, roleId) y sale como 409 desde
 * `handleApiError`; comprobarlo antes solo abriría una carrera.
 */
export async function assignRoleToUser(
  input: RoleAssignmentInput,
): Promise<UserRole> {
  return db.transaction(async (tx) => {
    const roleId = await findRoleIdBySlug(tx, input.roleSlug);

    const [assignment] = await tx
      .insert(userRoles)
      .values({ userId: input.userId, roleId, assignedBy: input.actorId })
      .returning();

    await insertAuditLog(
      {
        actorId: input.actorId,
        action: "user.role_assigned",
        entityType: AUDIT_ENTITY_TYPE,
        entityId: input.userId,
        // Solo uuid y slug: ni email, ni clerk_id, ni nombre (SETUP 5.2 regla 3).
        changes: { after: { roleSlug: input.roleSlug } },
        metadata: { roleSlug: input.roleSlug },
        severity: "warning",
      },
      tx,
    );

    return assignment;
  });
}

/** Devuelve `null` cuando el usuario no tenía ese rol: no hay nada que auditar. */
export async function revokeRoleFromUser(
  input: RoleAssignmentInput,
): Promise<UserRole | null> {
  return db.transaction(async (tx) => {
    const roleId = await findRoleIdBySlug(tx, input.roleSlug);

    const [revoked] = await tx
      .delete(userRoles)
      .where(
        and(eq(userRoles.userId, input.userId), eq(userRoles.roleId, roleId)),
      )
      .returning();

    if (!revoked) {
      return null;
    }

    await insertAuditLog(
      {
        actorId: input.actorId,
        action: "user.role_revoked",
        entityType: AUDIT_ENTITY_TYPE,
        entityId: input.userId,
        changes: { before: { roleSlug: input.roleSlug } },
        metadata: { roleSlug: input.roleSlug },
        severity: "warning",
      },
      tx,
    );

    return revoked;
  });
}
