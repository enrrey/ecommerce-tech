import { auth } from "@clerk/nextjs/server";

import { UnauthorizedError } from "./api-errors";

/**
 * `/api/categories(.*)` es pública en `middleware.ts`, así que esta comprobación
 * no es defensa en profundidad: es la única protección real de los métodos
 * mutadores. Provisional hasta el spec de RBAC (`requirePermission`).
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new UnauthorizedError();
  }

  return userId;
}
