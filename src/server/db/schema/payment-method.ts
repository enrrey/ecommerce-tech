import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./user";

// Sin `server-only`: el módulo cliente deriva sus tipos de aquí con `import type`.
//
// Solo se guarda lo que Stripe expone del `PaymentMethod` (marca, últimos 4 y
// vencimiento). El número completo y el BIN nunca tocan esta base: almacenarlos
// sacaría al comercio del alcance SAQ A.
export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // RESTRICT igual que en `orders`: la baja del usuario es lógica, nunca un
    // DELETE que arrastre filas.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    stripePaymentMethodId: text("stripe_payment_method_id").notNull(),
    // visa | mastercard | amex | … Varchar y no enum: Stripe añade marcas sin
    // avisar y una marca nueva no debe exigir un ALTER TYPE.
    brand: varchar("brand", { length: 20 }).notNull(),
    last4: varchar("last4", { length: 4 }).notNull(),
    expMonth: integer("exp_month").notNull(),
    expYear: integer("exp_year").notNull(),
    // Preferencia local del usuario, no un dato de Stripe: en `mode: "payment"`
    // Checkout prefilla la más reciente y no acepta forzar otra.
    isDefault: boolean("is_default").notNull().default(false),
    // mode "string": la API viaja en JSON, un solo tipo describe servidor y cliente.
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    // Sin `updated_at`: solo `is_default` se edita y nadie consume la fecha de
    // ese cambio.
  },
  (table) => [
    // El UNIQUE es lo que hace idempotente al webhook: Stripe reenvía el mismo
    // `checkout.session.completed` ante cualquier duda de entrega.
    uniqueIndex("payment_methods_stripe_payment_method_id_unique").on(
      table.stripePaymentMethodId,
    ),
    index("payment_methods_user_id_idx").on(table.userId),
    // UNIQUE parcial: es la base —no el código— la que garantiza como máximo una
    // predeterminada por usuario. Sin el filtro, un usuario no podría tener dos
    // tarjetas sin marcar.
    uniqueIndex("payment_methods_one_default_per_user")
      .on(table.userId)
      .where(sql`${table.isDefault} = true`),
    check(
      "payment_methods_exp_month_valid",
      sql`${table.expMonth} between 1 and 12`,
    ),
    check("payment_methods_last4_length", sql`char_length(${table.last4}) = 4`),
  ],
);
