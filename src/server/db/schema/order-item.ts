import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { orders } from "./order";
import { products } from "./product";

// Sin `server-only`: el módulo cliente deriva sus tipos de aquí con `import type`.
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // CASCADE: una línea sin su orden no significa nada.
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // SET NULL y nullable: si el producto desaparece del catálogo, la línea
    // histórica del pedido se conserva con su nombre y precio congelados.
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    // Congelados en la fila: la orden histórica no cambia si el producto sí.
    productName: varchar("product_name", { length: 120 }).notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    // La BD es la última línea: un script que se salte Zod tampoco debe poder
    // escribir un precio negativo o una línea de cantidad cero.
    check(
      "order_items_unit_price_cents_positive",
      sql`${table.unitPriceCents} >= 0`,
    ),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);
