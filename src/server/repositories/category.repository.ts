import "server-only";

import { and, asc, count, eq } from "drizzle-orm";

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/modules/categories/schemas/category.schema";
import type { Category } from "@/modules/categories/types/category.types";
import type { PublicCategory } from "@/modules/storefront/types/public-catalog.types";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema/category";
import { products } from "@/server/db/schema/product";

export async function listCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function findCategoryById(id: string): Promise<Category | null> {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  return category ?? null;
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<Category> {
  const [category] = await db.insert(categories).values(input).returning();

  return category;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<Category | null> {
  const [category] = await db
    .update(categories)
    .set(input)
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
}

export async function deleteCategory(id: string): Promise<Category | null> {
  const [category] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
}

/**
 * Categorías activas con su número de productos activos, en una sola consulta.
 * Contar por fila desde el handler sería N+1.
 *
 * El filtro de `products.is_active` va en el ON del LEFT JOIN y no en el WHERE:
 * en el WHERE convertiría el LEFT en un INNER y las categorías sin catálogo
 * activo desaparecerían en vez de mostrarse con contador 0. `count(products.id)`
 * ignora los NULL que deja el join vacío.
 */
export async function listPublicCategoriesWithCount(): Promise<
  PublicCategory[]
> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(
      products,
      and(
        eq(products.categoryId, categories.id),
        eq(products.isActive, true),
      ),
    )
    .where(eq(categories.isActive, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
}
