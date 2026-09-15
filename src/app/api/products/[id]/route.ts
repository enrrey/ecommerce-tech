import { NextResponse } from "next/server";

import { handleApiError, NotFoundError } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth";
import {
  productIdSchema,
  updateProductApiSchema,
} from "@/modules/products/schemas/product.schema";
import {
  deleteProduct,
  findProductById,
  updateProduct,
} from "@/server/repositories/product.repository";

const CONFLICT_MESSAGE = "Ya existe un producto con ese SKU o slug";
const CATEGORY_NOT_FOUND_MESSAGE = "La categoría seleccionada no existe";
const NOT_FOUND_MESSAGE = "El producto no existe";

type RouteContext = { params: Promise<{ id: string }> };

// TODO(spec-rbac): lectura pública hoy; si deja de serlo, requirePermission("products.read").
export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = productIdSchema.parse((await context.params).id);
    const product = await findProductById(id);

    if (!product) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return NextResponse.json(product);
  } catch (error) {
    return handleApiError(error);
  }
}

// TODO(spec-rbac): reemplazar requireAuth() por requirePermission("products.update").
export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAuth();

    const id = productIdSchema.parse((await context.params).id);
    const input = updateProductApiSchema.parse(await request.json());
    const product = await updateProduct(id, input);

    if (!product) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return NextResponse.json(product);
  } catch (error) {
    return handleApiError(error, {
      conflictMessage: CONFLICT_MESSAGE,
      foreignKey: { status: 400, message: CATEGORY_NOT_FOUND_MESSAGE },
    });
  }
}

// TODO(spec-rbac): reemplazar requireAuth() por requirePermission("products.delete").
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAuth();

    const id = productIdSchema.parse((await context.params).id);
    const product = await deleteProduct(id);

    if (!product) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
