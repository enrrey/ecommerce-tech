import { NextResponse } from "next/server";

import { handleApiError, NotFoundError } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth";
import { listPaymentMethodsByUser } from "@/server/repositories/payment-method.repository";
import { findActorByClerkId } from "@/server/repositories/user.repository";

const ACTOR_NOT_FOUND_MESSAGE =
  "Tu cuenta todavía no está sincronizada; vuelve a intentarlo en unos segundos";

/**
 * Tarjetas del usuario en sesión. Sin parámetro de usuario a propósito: el dueño
 * se resuelve desde Clerk, así que no hay forma de pedir las tarjetas de otro.
 *
 * Lo que viaja es solo marca, últimos 4 y vencimiento — es todo lo que la tabla
 * guarda. El número completo no existe ni aquí ni en la base.
 */
export async function GET() {
  try {
    const clerkId = await requireAuth();

    const actor = await findActorByClerkId(clerkId);

    if (!actor) {
      throw new NotFoundError(ACTOR_NOT_FOUND_MESSAGE);
    }

    const paymentMethods = await listPaymentMethodsByUser(actor.id);

    return NextResponse.json(paymentMethods);
  } catch (error) {
    return handleApiError(error);
  }
}
