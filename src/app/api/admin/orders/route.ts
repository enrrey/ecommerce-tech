import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-errors";
import { requirePermission } from "@/lib/permissions";
import { listAllOrders } from "@/server/repositories/order.repository";

// Sin Zod: el endpoint no recibe body ni query. Los filtros del panel son de
// cliente; añadir parámetros aquí obligaría a añadir su schema.
export async function GET() {
  try {
    await requirePermission("orders.read");

    const orders = await listAllOrders();

    return NextResponse.json(orders);
  } catch (error) {
    return handleApiError(error);
  }
}
