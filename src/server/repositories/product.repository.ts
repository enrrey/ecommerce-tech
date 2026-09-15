import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  isNotNull,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";

import type {
  CreateProductInput,
  UpdateProductInput,
} from "@/modules/products/schemas/product.schema";
import type {
  Product,
  ProductListItem,
} from "@/modules/products/types/product.types";
import type {
  PublicProductQuery,
  PublicProductSort,
} from "@/modules/storefront/schemas/public-catalog.schema";
import type {
  PublicProduct,
  PublicProductPage,
} from "@/modules/storefront/types/public-catalog.types";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema/category";
import { products } from "@/server/db/schema/product";

/**
 * Selección explícita: un `select()` con join devolvería `{ products, categories }`
 * anidado. Aquí la fila sale ya con la forma de `ProductListItem`, y el nombre de
 * la categoría llega en el mismo viaje: un solo join, nunca una consulta por fila.
 */
const productListSelection = {
  id: products.id,
  categoryId: products.categoryId,
  sku: products.sku,
  name: products.name,
  slug: products.slug,
  brand: products.brand,
  description: products.description,
  priceCents: products.priceCents,
  compareAtPriceCents: products.compareAtPriceCents,
  stock: products.stock,
  imageUrl: products.imageUrl,
  isActive: products.isActive,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
  categoryName: categories.name,
};

export async function listProducts(): Promise<ProductListItem[]> {
  return db
    .select(productListSelection)
    .from(products)
    // INNER y no LEFT: category_id es NOT NULL con FK, así que no existen
    // productos huérfanos que un LEFT JOIN pudiera rescatar.
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.name));
}

export async function findProductById(
  id: string,
): Promise<ProductListItem | null> {
  const [product] = await db
    .select(productListSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .limit(1);

  return product ?? null;
}

export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  const [product] = await db.insert(products).values(input).returning();

  return product;
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<Product | null> {
  // Zod omite las claves ausentes del PATCH, así que `.set()` solo escribe los
  // campos enviados: un update sin precio no lo pone a 0.
  const [product] = await db
    .update(products)
    .set(input)
    .where(eq(products.id, id))
    .returning();

  return product ?? null;
}

export async function deleteProduct(id: string): Promise<Product | null> {
  const [product] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning();

  return product ?? null;
}

/**
 * `%` y `_` son comodines de LIKE. El valor viaja como parámetro (no hay
 * inyección SQL posible), pero sin escaparlos una búsqueda de "50%" devolvería
 * cualquier cosa que empiece por "50".
 */
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

/**
 * `coalesce` y no el `>` a secas: con `compare_at_price_cents` NULL la
 * comparación da NULL, y un `ORDER BY … DESC` en Postgres pone los NULL
 * primero, justo al revés de lo que pide "ofertas primero".
 */
const IS_ON_SALE = sql<boolean>`coalesce(${products.compareAtPriceCents} > ${products.priceCents}, false)`;

// Lista y no criterio único: `deals` necesita dos niveles (oferta, luego
// precio) antes del desempate por id que añade la consulta.
const PUBLIC_PRODUCT_ORDER: Record<PublicProductSort, SQL[]> = {
  newest: [desc(products.createdAt)],
  "price-asc": [asc(products.priceCents)],
  "price-desc": [desc(products.priceCents)],
  // Ordena, no filtra: la sección "Ofertas del día" es ancla de navegación y no
  // puede quedar vacía, así que las ofertas reales encabezan y lo más barato
  // completa la grilla.
  deals: [desc(IS_ON_SALE), asc(products.priceCents)],
};

/**
 * Catálogo visible para un visitante anónimo. Dos invariantes de seguridad:
 *
 * 1. El `where` fija `products.is_active` y `categories.is_active`; ningún
 *    filtro de la query puede relajarlos porque se concatenan con AND.
 * 2. La selección es explícita y omite `stock`, `sku`, `is_active` y
 *    `updated_at`. El inventario solo sale como booleano derivado.
 *
 * El total viaja en la misma consulta con `count(*) over()`: un `SELECT count`
 * aparte serían dos viajes y dos planes sobre el mismo filtro.
 */
export async function listPublicProducts(
  query: PublicProductQuery,
): Promise<PublicProductPage> {
  const conditions: SQL[] = [
    eq(products.isActive, true),
    eq(categories.isActive, true),
  ];

  if (query.q) {
    conditions.push(ilike(products.name, `%${escapeLikePattern(query.q)}%`));
  }

  if (query.category) {
    conditions.push(eq(categories.slug, query.category));
  }

  // Igualdad exacta y no ILIKE: la marca se elige de la lista que devuelve
  // `listPublicBrands()`, así que no hay término libre que escapar.
  if (query.brand) {
    conditions.push(eq(products.brand, query.brand));
  }

  if (query.minPriceCents !== undefined) {
    conditions.push(gte(products.priceCents, query.minPriceCents));
  }

  if (query.maxPriceCents !== undefined) {
    conditions.push(lte(products.priceCents, query.maxPriceCents));
  }

  // `!== undefined` y no truthy: `inStock=false` es un filtro válido ("solo sin
  // stock"), no la ausencia del filtro. El booleano ya viaja derivado en cada
  // item, así que la rama no expone inventario que no fuera público.
  if (query.inStock !== undefined) {
    conditions.push(
      query.inStock ? gt(products.stock, 0) : eq(products.stock, 0),
    );
  }

  if (query.onSale !== undefined) {
    conditions.push(query.onSale ? IS_ON_SALE : sql`not ${IS_ON_SALE}`);
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      brand: products.brand,
      description: products.description,
      priceCents: products.priceCents,
      compareAtPriceCents: products.compareAtPriceCents,
      imageUrl: products.imageUrl,
      inStock: sql<boolean>`${products.stock} > 0`.mapWith(Boolean),
      createdAt: products.createdAt,
      categorySlug: categories.slug,
      categoryName: categories.name,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    // `products.id` como desempate: sin él, dos productos con el mismo precio
    // pueden intercambiarse entre páginas y repetirse o desaparecer.
    .orderBy(...PUBLIC_PRODUCT_ORDER[query.sort], asc(products.id))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  // `total` se repite en cada fila por ser una window function: no forma parte
  // del item y se lee una sola vez más abajo.
  const items: PublicProduct[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand,
    description: row.description,
    priceCents: row.priceCents,
    // Se normaliza aquí y no en cada cliente: un precio anterior heredado o
    // dejado atrás por una subida de precio sale como `null` y la tarjeta lo
    // trata como "sin oferta" sin tener que repetir la regla.
    compareAtPriceCents:
      row.compareAtPriceCents !== null &&
      row.compareAtPriceCents > row.priceCents
        ? row.compareAtPriceCents
        : null,
    imageUrl: row.imageUrl,
    inStock: row.inStock,
    createdAt: row.createdAt,
    categorySlug: row.categorySlug,
    categoryName: row.categoryName,
  }));

  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total: rows[0]?.total ?? 0,
  };
}

/**
 * Marcas con catálogo visible, para la faceta del filtro. Mismas invariantes que
 * `listPublicProducts`: solo productos y categorías activos, así que una marca
 * que solo tenga inventario oculto no aparece en la lista.
 *
 * `selectDistinct` en una sola consulta: pedir la marca producto a producto
 * dentro de un map sería N+1. Los `NULL` se descartan en SQL, no en memoria.
 */
export async function listPublicBrands(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ brand: products.brand })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.isActive, true),
        eq(categories.isActive, true),
        isNotNull(products.brand),
      ),
    )
    .orderBy(asc(products.brand));

  // `isNotNull` ya los excluyó en la consulta; el tipo inferido de la columna
  // sigue admitiendo null y el flatMap lo estrecha sin castear.
  return rows.flatMap((row) => (row.brand === null ? [] : [row.brand]));
}
