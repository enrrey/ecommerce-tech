import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Sin `server-only`: el módulo cliente deriva sus tipos de aquí con `import type`.
// Tabla semilla: los permisos nacen del código, no del panel.
export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 60 }).notNull(),
    resource: varchar("resource", { length: 30 }).notNull(),
    action: varchar("action", { length: 30 }).notNull(),
    description: text("description"),
    // mode "string": la API viaja en JSON, un solo tipo describe servidor y cliente.
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("permissions_code_unique").on(table.code),
    uniqueIndex("permissions_resource_action_unique").on(
      table.resource,
      table.action,
    ),
  ],
);
