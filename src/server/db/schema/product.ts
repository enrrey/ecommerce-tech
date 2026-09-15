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

import { categories } from "./category";

// Sin `server-only`: el módulo cliente deriva sus tipos de aquí con `import type`.
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // RESTRICT: borrar una categoría con catálogo debe fallar con un 409
    // explicable, nunca arrastrar en silencio los productos que la referencian.
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    sku: varchar("sku", { length: 40 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    // Nullable y sin default: las filas existentes no tienen marca real y un
    // `'Genérico'` inventaría el dato, ensuciando la faceta con un bucket falso.
    // `getPublicBrands()` descarta los NULL y la sección se oculta si va vacía.
    brand: varchar("brand", { length: 60 }),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    // Precio anterior para calcular el descuento mostrado. Nullable = sin oferta.
    // La regla `> price_cents` NO vive aquí a propósito: un check cruzado haría
    // fallar con 500 un PATCH que solo sube el precio de un producto en oferta.
    // Zod la aplica al escribir y la lectura pública normaliza a null al leer.
    compareAtPriceCents: integer("compare_at_price_cents"),
    stock: integer("stock").notNull().default(0),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
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
    uniqueIndex("products_sku_unique").on(table.sku),
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_category_id_idx").on(table.categoryId),
    index("products_name_idx").on(table.name),
    index("products_brand_idx").on(table.brand),
    // La BD es la última línea: un seed o un script que se salte Zod tampoco
    // debe poder escribir un precio o un stock negativo.
    check("products_price_cents_positive", sql`${table.priceCents} >= 0`),
    check("products_stock_positive", sql`${table.stock} >= 0`),
    check(
      "products_compare_at_price_cents_positive",
      sql`${table.compareAtPriceCents} IS NULL OR ${table.compareAtPriceCents} >= 0`,
    ),
  ],
);
