import { NextResponse } from "next/server";

import { handleApiError, NotFoundError } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth";
import { paymentMethodIdParamSchema } from "@/modules/orders/schemas/payment-method.schema";
import type { SetDefaultPaymentMethodResponse } from "@/modules/orders/types/payment-method.types";
import {
  findPaymentMethodById,
  setDefaultPaymentMethod,
} from "@/server/repositories/payment-method.repository";
import { findActorByClerkId } from "@/server/repositories/user.repository";

type RouteContext = { params: Promise<{ id: string }> };

const NOT_FOUND_MESSAGE = "La tarjeta no existe";

/**
 * Marca la tarjeta como predeterminada. Sin body: el único dato variable es el
 * `id` de la ruta y el usuario sale siempre de la sesión, nunca del cliente.
 *
 * No toca Stripe: la preferencia es local. En `mode: "payment"` Checkout prefilla
 * la más reciente y no acepta forzar otra, así que no hay nada que sincronizar.
 */
export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const clerkId = await requireAuth();
    const { id } = await context.params;

    const parsedId = paymentMethodIdParamSchema.safeParse(id);

    if (!parsedId.success) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    const actor = await findActorByClerkId(clerkId);

    if (!actor) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    const paymentMethod = await findPaymentMethodById(parsedId.data);

    // 404 y no 403: confirmar que la tarjeta existe pero es de otro ya filtraría
    // información sobre cuentas ajenas (mismo criterio que 012, 014 y 015).
    if (!paymentMethod || paymentMethod.userId !== actor.id) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    await setDefaultPaymentMethod(actor.id, paymentMethod.id);

    const body: SetDefaultPaymentMethodResponse = { updated: true };

    return NextResponse.json(body);
  } catch (error) {
    return handleApiError(error);
  }
}
