import "server-only";

import type {
  AuditLog,
  NewAuditLog,
} from "@/modules/audit/types/audit-log.types";
import { db, type Database } from "@/server/db";
import { auditLogs } from "@/server/db/schema/audit-log";

// El cliente transaccional se deriva de la propia firma de `db.transaction`
// para no depender de tipos internos de Drizzle ni recurrir a `any`.
type DbClient = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Inserta un evento en la bitácora. Append-only: este repositorio no expone
 * update, delete ni purge a propósito (SETUP 5.2 regla 1).
 *
 * No sanitiza `changes` ni `metadata`: enmascarar PII, tokens y secretos es
 * responsabilidad del llamador antes de invocar esta función (SETUP 5.2 regla 3).
 *
 * Pasar el `tx` de `db.transaction(...)` como `client` hace que el evento
 * revierta junto con la mutación que lo origina (SETUP 5.2 regla 2).
 */
export async function insertAuditLog(
  input: NewAuditLog,
  client: DbClient = db,
): Promise<AuditLog> {
  const [auditLog] = await client.insert(auditLogs).values(input).returning();

  return auditLog;
}
