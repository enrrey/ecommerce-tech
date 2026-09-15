import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import type { products } from "@/server/db/schema/product";

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

// Fila del listado: producto + nombre de su categoría, resuelto con el join del
// repositorio. Composición sobre el tipo inferido, nunca una copia manual.
export type ProductListItem = Product & { categoryName: string };
