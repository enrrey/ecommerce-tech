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
// Espejo local de Clerk: Clerk manda en autenticación, Postgres en autorización.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: varchar("clerk_id", { length: 64 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 80 }),
    lastName: varchar("last_name", { length: 80 }),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    // Nullable: el Customer de Stripe se crea perezosamente, la primera vez que
    // el usuario guarda una tarjeta. Persistirlo es imprescindible porque Stripe
    // no sabe buscar un Customer por nuestro `users.id`.
    stripeCustomerId: text("stripe_customer_id"),
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
    uniqueIndex("users_clerk_id_unique").on(table.clerkId),
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_stripe_customer_id_unique").on(table.stripeCustomerId),
  ],
);
