import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-errors";
import { listPublicCategoriesWithCount } from "@/server/repositories/category.repository";

/** Sin query params: no hay entrada que validar, solo la proyección pública. */
export async function GET() {
  try {
    const categories = await listPublicCategoriesWithCount();

    return NextResponse.json(categories);
  } catch (error) {
    return handleApiError(error);
  }
}
