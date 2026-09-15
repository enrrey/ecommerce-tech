import { sql } from "drizzle-orm";
import {
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
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // RESTRICT: el historial de compra sobrevive a la cuenta. La baja de un
    // usuario es lógica (`users.is_active = false`), nunca un DELETE.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // pending | paid | canceled. Varchar y no enum: añadir un estado futuro
    // (refunded, disputed) no debe exigir un ALTER TYPE.
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // Centavos enteros, calculado siempre en servidor a partir de `products`.
    totalCents: integer("total_cents").notNull(),
    // Minúscula: es el código que espera `price_data.currency` de Stripe.
    // `CURRENCY` de lib/constants es "USD" y solo sirve para formatear la UI.
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    // Nullable: la fila nace antes de que exista la sesión de Stripe, dentro de
    // la transacción que congela precios. El UNIQUE evita que dos órdenes
    // acaben apuntando a la misma sesión.
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    // mode "string": la API viaja en JSON, un solo tipo describe servidor y cliente.
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => [
    uniqueIndex("orders_stripe_checkout_session_id_unique").on(
      table.stripeCheckoutSessionId,
    ),
    uniqueIndex("orders_stripe_payment_intent_id_unique").on(
      table.stripePaymentIntentId,
    ),
    index("orders_user_id_idx").on(table.userId),
    check("orders_total_cents_positive", sql`${table.totalCents} >= 0`),
  ],
);
