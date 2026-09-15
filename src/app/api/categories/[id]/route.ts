import { NextResponse } from "next/server";

import { handleApiError, NotFoundError } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth";
import {
  categoryIdSchema,
  updateCategorySchema,
} from "@/modules/categories/schemas/category.schema";
import {
  deleteCategory,
  findCategoryById,
  updateCategory,
} from "@/server/repositories/category.repository";

const SLUG_CONFLICT_MESSAGE = "Ya existe una categoría con ese slug";
const NOT_FOUND_MESSAGE = "La categoría no existe";
const IN_USE_MESSAGE = "No puedes eliminar una categoría con productos asociados";

type RouteContext = { params: Promise<{ id: string }> };

// TODO(spec-rbac): lectura pública hoy; si deja de serlo, requirePermission("categories.read").
export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = categoryIdSchema.parse((await context.params).id);
    const category = await findCategoryById(id);

    if (!category) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return NextResponse.json(category);
  } catch (error) {
    return handleApiError(error);
  }
}

// TODO(spec-rbac): reemplazar requireAuth() por requirePermission("categories.update").
export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAuth();

    const id = categoryIdSchema.parse((await context.params).id);
    const input = updateCategorySchema.parse(await request.json());
    const category = await updateCategory(id, input);

    if (!category) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return NextResponse.json(category);
  } catch (error) {
    return handleApiError(error, { conflictMessage: SLUG_CONFLICT_MESSAGE });
  }
}

// TODO(spec-rbac): reemplazar requireAuth() por requirePermission("categories.delete").
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAuth();

    const id = categoryIdSchema.parse((await context.params).id);
    const category = await deleteCategory(id);

    if (!category) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // La FK products.category_id es RESTRICT: borrar una categoría con
    // catálogo lanza 23503, que sin este mapeo sería un 500 genérico.
    return handleApiError(error, {
      foreignKey: { status: 409, message: IN_USE_MESSAGE },
    });
  }
}
