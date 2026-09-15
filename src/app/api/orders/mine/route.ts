import { NextResponse } from "next/server";

import { handleApiError, NotFoundError } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth";
import { myOrdersQuerySchema } from "@/modules/orders/schemas/order-history.schema";
import { listOrdersByUser } from "@/server/repositories/order.repository";
import { findActorByClerkId } from "@/server/repositories/user.repository";

const ACTOR_NOT_FOUND_MESSAGE =
  "Tu cuenta todavía no está sincronizada; vuelve a intentarlo en unos segundos";

/**
 * Historial del usuario en sesión. La ruta es `/mine` y no `/api/orders?userId=`:
 * el dueño se resuelve desde la sesión de Clerk, nunca desde la query, así que
 * no hay parámetro con el que pedir las compras de otro.
 */
export async function GET(request: Request) {
  try {
    const clerkId = await requireAuth();
    const actor = await findActorByClerkId(clerkId);

    if (!actor) {
      throw new NotFoundError(ACTOR_NOT_FOUND_MESSAGE);
    }

    const { searchParams } = new URL(request.url);
    // fromEntries y no `.get()` campo a campo: las claves ausentes quedan fuera
    // del objeto y Zod las trata como opcionales en vez de validar `null`.
    const range = myOrdersQuerySchema.parse(Object.fromEntries(searchParams));

    const orders = await listOrdersByUser(actor.id, range);

    return NextResponse.json(orders);
  } catch (error) {
    return handleApiError(error);
  }
}
