import { index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { roles } from "./role";
import { users } from "./user";

// Sin `server-only`: el módulo cliente deriva sus tipos de aquí con `import type`.
export const userRoles = pgTable(
  "user_roles",
  {
    // CASCADE: al desaparecer el usuario o el rol, la asignación deja de tener sentido.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    // SET NULL: la traza de quién asignó no debe impedir dar de baja a ese actor.
    assignedBy: uuid("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    // mode "string": la API viaja en JSON, un solo tipo describe servidor y cliente.
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: "user_roles_pk", columns: [table.userId, table.roleId] }),
    index("user_roles_role_id_idx").on(table.roleId),
  ],
);
