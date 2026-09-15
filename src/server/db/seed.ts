import { Pool } from "@neondatabase/serverless";
import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

import { requireEnv } from "@/lib/env";
// Ruta relativa a propósito: `./index.ts` importa `server-only` y el seed corre
// con `tsx`, fuera del bundler. El seed abre su propia conexión.
import * as schema from "./schema";
import {
  CATEGORY_SEED,
  PERMISSION_SEED,
  PRODUCT_SEED,
  ROLE_SEED,
  SUPER_ADMIN_ROLE_SLUG,
  type PermissionCode,
} from "./seed-data";

config({ path: ".env.local" });

type SeedDatabase = ReturnType<typeof drizzle<typeof schema>>;

async function seedRbacCatalog(db: SeedDatabase): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.permissions)
      .values(
        PERMISSION_SEED.map((item) => ({
          code: item.code,
          resource: item.resource,
          action: item.action,
          description: item.description,
        })),
      )
      .onConflictDoNothing({ target: schema.permissions.code });

    await tx
      .insert(schema.roles)
      .values(
        ROLE_SEED.map((role) => ({
          slug: role.slug,
          name: role.name,
          description: role.description,
          isSystem: true,
        })),
      )
      .onConflictDoNothing({ target: schema.roles.slug });

    // Una consulta por tabla: los ids se resuelven en memoria, sin N+1.
    const permissionRows = await tx
      .select({ id: schema.permissions.id, code: schema.permissions.code })
      .from(schema.permissions)
      .where(
        inArray(
          schema.permissions.code,
          PERMISSION_SEED.map((item) => item.code),
        ),
      );

    const roleRows = await tx
      .select({ id: schema.roles.id, slug: schema.roles.slug })
      .from(schema.roles)
      .where(
        inArray(
          schema.roles.slug,
          ROLE_SEED.map((role) => role.slug),
        ),
      );

    const permissionIdByCode = new Map<string, string>(
      permissionRows.map((row) => [row.code, row.id]),
    );
    const roleIdBySlug = new Map<string, string>(
      roleRows.map((row) => [row.slug, row.id]),
    );

    const matrix = ROLE_SEED.flatMap((role) => {
      const roleId = roleIdBySlug.get(role.slug);

      if (!roleId) {
        throw new Error(`Rol sembrado no encontrado tras el insert: ${role.slug}`);
      }

      return role.permissions.map((code: PermissionCode) => {
        const permissionId = permissionIdByCode.get(code);

        if (!permissionId) {
          throw new Error(
            `Permiso sembrado no encontrado tras el insert: ${code}`,
          );
        }

        return { roleId, permissionId };
      });
    });

    if (matrix.length > 0) {
      await tx
        .insert(schema.rolePermissions)
        .values(matrix)
        .onConflictDoNothing();
    }

    console.info(
      `RBAC: ${PERMISSION_SEED.length} permisos, ${ROLE_SEED.length} roles de sistema y ${matrix.length} pares rol×permiso asegurados.`,
    );
  });
}

/**
 * Catálogo de demostración. `onConflictDoNothing` sobre las claves únicas hace
 * el seed reejecutable: lo que ya existe no se duplica ni se pisa, así que una
 * edición hecha desde el panel sobrevive a un `npm run db:seed`.
 */
async function seedCatalog(db: SeedDatabase): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.categories)
      .values(
        CATEGORY_SEED.map((category) => ({
          slug: category.slug,
          name: category.name,
          description: category.description,
        })),
      )
      .onConflictDoNothing({ target: schema.categories.slug });

    // Una consulta para todas las categorías: resolver el id producto a
    // producto sería N+1.
    const categoryRows = await tx
      .select({ id: schema.categories.id, slug: schema.categories.slug })
      .from(schema.categories)
      .where(
        inArray(
          schema.categories.slug,
          CATEGORY_SEED.map((category) => category.slug),
        ),
      );

    const categoryIdBySlug = new Map<string, string>(
      categoryRows.map((row) => [row.slug, row.id]),
    );

    const productValues = PRODUCT_SEED.map((product) => {
      const categoryId = categoryIdBySlug.get(product.categorySlug);

      if (!categoryId) {
        throw new Error(
          `Categoría sembrada no encontrada tras el insert: ${product.categorySlug}`,
        );
      }

      return {
        categoryId,
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        description: product.description,
        priceCents: product.priceCents,
        compareAtPriceCents: product.compareAtPriceCents,
        stock: product.stock,
        imageUrl: product.imageUrl,
      };
    });

    const inserted = await tx
      .insert(schema.products)
      .values(productValues)
      .onConflictDoNothing({ target: schema.products.sku })
      .returning({ sku: schema.products.sku });

    console.info(
      `Catálogo: ${CATEGORY_SEED.length} categorías y ${PRODUCT_SEED.length} productos asegurados (${inserted.length} nuevos).`,
    );
  });
}

// Único camino para que exista el primer administrador: sin él nadie podría
// asignar roles desde el panel. Fuera de la transacción del catálogo porque su
// ausencia no invalida el seed.
async function bootstrapSuperAdmin(db: SeedDatabase): Promise<void> {
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim();

  if (!email) {
    console.info(
      "Bootstrap omitido: BOOTSTRAP_SUPER_ADMIN_EMAIL no está definida.",
    );
    return;
  }

  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (!user) {
    console.info(
      `Bootstrap omitido: ningún usuario con email ${email}. Inicia sesión una vez para que el webhook cree la fila y vuelve a ejecutar el seed.`,
    );
    return;
  }

  const [role] = await db
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(eq(schema.roles.slug, SUPER_ADMIN_ROLE_SLUG))
    .limit(1);

  if (!role) {
    throw new Error(
      `Rol ${SUPER_ADMIN_ROLE_SLUG} ausente después de sembrar el catálogo.`,
    );
  }

  const assigned = await db
    .insert(schema.userRoles)
    // assigned_by null: la asignación la hace el seed, no una persona.
    .values({ userId: user.id, roleId: role.id })
    .onConflictDoNothing()
    .returning({ userId: schema.userRoles.userId });

  console.info(
    assigned.length > 0
      ? `Bootstrap: ${email} ahora tiene el rol ${SUPER_ADMIN_ROLE_SLUG}.`
      : `Bootstrap sin cambios: ${email} ya tenía el rol ${SUPER_ADMIN_ROLE_SLUG}.`,
  );
}

async function seed(): Promise<void> {
  const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
  const db = drizzle(pool, { schema });

  try {
    await seedRbacCatalog(db);
    await seedCatalog(db);
    await bootstrapSuperAdmin(db);
  } finally {
    await pool.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
