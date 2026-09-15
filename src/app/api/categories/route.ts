import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth";
import { createCategorySchema } from "@/modules/categories/schemas/category.schema";
import {
  createCategory,
  listCategories,
} from "@/server/repositories/category.repository";

const SLUG_CONFLICT_MESSAGE = "Ya existe una categoría con ese slug";

// TODO(spec-rbac): lectura pública hoy; si deja de serlo, requirePermission("categories.read").
export async function GET() {
  try {
    const categories = await listCategories();

    return NextResponse.json(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

// TODO(spec-rbac): reemplazar requireAuth() por requirePermission("categories.create").
export async function POST(request: Request) {
  try {
    await requireAuth();

    const input = createCategorySchema.parse(await request.json());
    const category = await createCategory(input);

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return handleApiError(error, { conflictMessage: SLUG_CONFLICT_MESSAGE });
  }
}
