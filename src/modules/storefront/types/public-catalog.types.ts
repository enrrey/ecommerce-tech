import type { InferSelectModel } from "drizzle-orm";

import type { categories } from "@/server/db/schema/category";
import type { products } from "@/server/db/schema/product";

type ProductRow = InferSelectModel<typeof products>;
type CategoryRow = InferSelectModel<typeof categories>;

/**
 * Proyección pública del catálogo. Se construye con `Pick` sobre el tipo
 * inferido de Drizzle en vez de redeclarar campos: si el schema cambia el tipo
 * de `price_cents`, esto deja de compilar.
 *
 * Lo que NO viaja es tan importante como lo que sí: `stock`, `sku`, `isActive`
 * y `updatedAt` son datos de operación y quedan fuera del contrato. La
 * disponibilidad se expone como booleano derivado (`inStock`) para no filtrar
 * el inventario real a un visitante anónimo.
 *
 * `compareAtPriceCents` llega **ya normalizado** por el repositorio: es `null`
 * salvo que supere de verdad a `priceCents`. El consumidor no repite la regla,
 * solo pregunta si viene o no. El porcentaje de descuento es formato y se
 * calcula en la vista; por eso viaja el importe y no un `discountPercent`.
 */
export type PublicProduct = Pick<
  ProductRow,
  | "id"
  | "name"
  | "slug"
  | "brand"
  | "description"
  | "priceCents"
  | "compareAtPriceCents"
  | "imageUrl"
  | "createdAt"
> & {
  inStock: boolean;
  categorySlug: CategoryRow["slug"];
  categoryName: CategoryRow["name"];
};

export type PublicCategory = Pick<
  CategoryRow,
  "id" | "name" | "slug" | "description"
> & {
  /** Productos activos de la categoría, contados en el mismo join. */
  productCount: number;
};

export type PublicProductPage = {
  items: PublicProduct[];
  page: number;
  pageSize: number;
  total: number;
};
