import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Sin `server-only`: el módulo cliente deriva sus tipos de aquí con `import type`.
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 40 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    description: text("description"),
    // is_system = true: sembrado por `db:seed`, no borrable ni renombrable desde la UI.
    isSystem: boolean("is_system").notNull().default(false),
    // mode "string": la API viaja en JSON, un solo tipo describe servidor y cliente.
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => [uniqueIndex("roles_slug_unique").on(table.slug)],
);
