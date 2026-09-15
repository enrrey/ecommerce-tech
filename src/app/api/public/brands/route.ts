import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-errors";
import { listPublicBrands } from "@/server/repositories/product.repository";

/** Sin query params: no hay entrada que validar, solo la faceta de marcas. */
export async function GET() {
  try {
    const brands = await listPublicBrands();

    return NextResponse.json(brands);
  } catch (error) {
    return handleApiError(error);
  }
}
