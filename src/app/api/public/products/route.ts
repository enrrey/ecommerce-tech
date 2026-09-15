import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-errors";
import { publicProductQuerySchema } from "@/modules/storefront/schemas/public-catalog.schema";
import { listPublicProducts } from "@/server/repositories/product.repository";

/**
 * Endpoint público de solo lectura: no exige sesión y no comparte código con
 * ningún mutador. El filtro de "solo activos" vive en el repositorio, no aquí,
 * para que no dependa de que el handler lo recuerde.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // fromEntries y no `.get()` campo a campo: las claves ausentes quedan fuera
    // del objeto y Zod aplica sus defaults en lugar de validar `null`.
    const query = publicProductQuerySchema.parse(
      Object.fromEntries(searchParams),
    );

    const page = await listPublicProducts(query);

    return NextResponse.json(page);
  } catch (error) {
    return handleApiError(error);
  }
}
