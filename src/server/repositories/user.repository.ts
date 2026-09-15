import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import type {
  AuthorizedActor,
  ClerkUserSyncInput,
  User,
  UserWithRoles,
} from "@/modules/roles/types/user-role.types";
import { db } from "@/server/db";
import { permissions } from "@/server/db/schema/permission";
import { rolePermissions } from "@/server/db/schema/role-permission";
import { roles } from "@/server/db/schema/role";
import { userRoles } from "@/server/db/schema/user-role";
import { users } from "@/server/db/schema/user";
import type { PermissionCode } from "@/server/db/seed-data";

/**
 * Espejo idempotente de Clerk: Clerk reintenta los webhooks y los eventos
 * pueden llegar desordenados, así que `user.updated` sobre una fila inexistente
 * también inserta.
 *
 * `isActive` queda fuera del `set`: la baja es una decisión del panel
 * (`users.deactivate`) o de `user.deleted`, y un simple cambio de avatar en
 * Clerk no debe reactivar a nadie.
 */
export async function upsertUserFromClerk(
  input: ClerkUserSyncInput,
): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(input)
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        imageUrl: input.imageUrl,
        // $onUpdate solo aplica a `db.update`, no al DO UPDATE del upsert.
        updatedAt: new Date().toISOString(),
      },
    })
    .returning();

  return user;
}

/**
 * Baja lógica, nunca DELETE: `audit_logs.actor_id` y los pedidos del usuario
 * apuntan a esta fila y su historial debe sobrevivir a la cuenta.
 */
export async function deactivateUserByClerkId(
  clerkId: string,
): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set({ isActive: false })
    .where(eq(users.clerkId, clerkId))
    .returning();

  return user ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user ?? null;
}

/**
 * Persiste el Customer de Stripe recién creado. Se llama inmediatamente después
 * de `customers.create` y antes de la Checkout Session: sin la fila guardada,
 * el siguiente intento crearía otro Customer y dejaría el anterior huérfano.
 */
export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  await db
    .update(users)
    .set({ stripeCustomerId })
    .where(eq(users.id, userId));
}

/**
 * Camino inverso del webhook: el evento de Stripe solo trae el id del Customer,
 * que es lo único que enlaza `setup_intent` con un usuario nuestro.
 */
export async function findUserByStripeCustomerId(
  stripeCustomerId: string,
): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return user ?? null;
}

/**
 * Identidad y permisos efectivos del actor en una sola consulta.
 * `is_active = false` no devuelve fila: un usuario dado de baja pierde todos
 * sus permisos aunque conserve sus filas en `user_roles`.
 */
export async function findActorByClerkId(
  clerkId: string,
): Promise<AuthorizedActor | null> {
  const rows = await db
    .select({ id: users.id, code: permissions.code })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .leftJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(and(eq(users.clerkId, clerkId), eq(users.isActive, true)));

  const [first] = rows;

  if (!first) {
    return null;
  }

  // Los códigos nacen de PERMISSION_SEED, que es la fuente de `PermissionCode`.
  const permissionCodes = [
    ...new Set(
      rows
        .map((row) => row.code)
        .filter((code): code is PermissionCode => code !== null),
    ),
  ];

  return { id: first.id, permissionCodes };
}

/**
 * Una sola consulta agregada en lugar de un SELECT de roles por usuario:
 * el `array_agg` con `filter` deja `[]` en quien no tiene ningún rol.
 */
export async function listUsersWithRoles(): Promise<UserWithRoles[]> {
  return db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      imageUrl: users.imageUrl,
      isActive: users.isActive,
      createdAt: users.createdAt,
      roleSlugs: sql<
        string[]
      >`coalesce(array_agg(${roles.slug}) filter (where ${roles.slug} is not null), '{}')`,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .groupBy(users.id)
    .orderBy(asc(users.email));
}
