import { index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { permissions } from "./permission";
import { roles } from "./role";

// Sin `server-only`: el módulo cliente deriva sus tipos de aquí con `import type`.
export const rolePermissions = pgTable(
  "role_permissions",
  {
    // CASCADE: borrar un rol o un permiso no debe dejar filas huérfanas en la matriz.
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    // mode "string": la API viaja en JSON, un solo tipo describe servidor y cliente.
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "role_permissions_pk",
      columns: [table.roleId, table.permissionId],
    }),
    index("role_permissions_permission_id_idx").on(table.permissionId),
  ],
);
