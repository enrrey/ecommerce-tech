import { NextResponse } from "next/server";
import Stripe from "stripe";

import { handleApiError, NotFoundError } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { paymentMethodIdParamSchema } from "@/modules/orders/schemas/payment-method.schema";
import {
  deletePaymentMethodById,
  findPaymentMethodById,
} from "@/server/repositories/payment-method.repository";
import { findActorByClerkId } from "@/server/repositories/user.repository";

type RouteContext = { params: Promise<{ id: string }> };

const NOT_FOUND_MESSAGE = "La tarjeta no existe";

/**
 * Stripe ya no conoce ese PaymentMethod: o se desvinculó en un intento anterior
 * que falló al borrar la fila local, o se eliminó desde el Dashboard. El objetivo
 * (que deje de estar adjunta) ya se cumplió, así que el borrado local continúa.
 */
function isResourceMissing(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeError &&
    error.code === "resource_missing"
  );
}

/**
 * Desvincula la tarjeta en Stripe y borra la fila local. El `detach` va primero:
 * si falla por algo que no sea "ya no existe", la fila se conserva y el usuario
 * puede reintentar, en vez de quedarse sin registro local de una tarjeta que
 * Stripe seguiría ofreciendo en el próximo Checkout.
 */
export async function DELETE(_request: Request, context: RouteContext) {
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
    // información sobre cuentas ajenas (mismo criterio que 012 y 014).
    if (!paymentMethod || paymentMethod.userId !== actor.id) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    try {
      await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
    } catch (error) {
      if (!isResourceMissing(error)) {
        throw error;
      }
    }

    await deletePaymentMethodById(paymentMethod.id);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
