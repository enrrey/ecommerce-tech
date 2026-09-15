import { desc } from "drizzle-orm";
import {
  index,
  inet,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./user";

// Declarado aquí y no en el módulo para que la dependencia vaya en un solo
// sentido (módulo → schema) y `.$type<>()` no arrastre un ciclo de imports.
export type AuditChanges = {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

// Tipo Postgres real: añadir un valor más adelante exige su propia migración.
export const auditSeverity = pgEnum("audit_severity", [
  "info",
  "warning",
  "error",
]);

// Sin `server-only`: el módulo cliente deriva sus tipos de aquí con `import type`.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // SET NULL: la bitácora es append-only, dar de baja al actor no puede
    // borrar ni bloquear la traza que dejó.
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    changes: jsonb("changes").$type<AuditChanges>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    severity: auditSeverity("severity").notNull().default("info"),
    // mode "string": la API viaja en JSON, un solo tipo describe servidor y cliente.
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_actor_created_at_idx").on(
      table.actorId,
      desc(table.createdAt),
    ),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_created_at_idx").on(desc(table.createdAt)),
  ],
);
