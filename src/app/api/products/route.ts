import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth";
import { createProductApiSchema } from "@/modules/products/schemas/product.schema";
import {
  createProduct,
  listProducts,
} from "@/server/repositories/product.repository";

const CONFLICT_MESSAGE = "Ya existe un producto con ese SKU o slug";
const CATEGORY_NOT_FOUND_MESSAGE = "La categoría seleccionada no existe";

// TODO(spec-rbac): lectura pública hoy; si deja de serlo, requirePermission("products.read").
export async function GET() {
  try {
    const products = await listProducts();

    return NextResponse.json(products);
  } catch (error) {
    return handleApiError(error);
  }
}

// TODO(spec-rbac): reemplazar requireAuth() por requirePermission("products.create").
export async function POST(request: Request) {
  try {
    // `/api/products(.*)` es pública en el middleware: esta línea es la única
    // protección real del método mutador.
    await requireAuth();

    const input = createProductApiSchema.parse(await request.json());
    const product = await createProduct(input);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return handleApiError(error, {
      conflictMessage: CONFLICT_MESSAGE,
      // 400 y no 409: al insertar, la FK rota significa que el cliente eligió
      // una categoría inexistente, no que haya un conflicto de estado.
      foreignKey: { status: 400, message: CATEGORY_NOT_FOUND_MESSAGE },
    });
  }
}
