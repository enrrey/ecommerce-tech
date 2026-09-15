import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError, NotFoundError } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import type { OrderReceiptResponse } from "@/modules/orders/types/order.types";
import { findOrderById } from "@/server/repositories/order.repository";
import { findActorByClerkId } from "@/server/repositories/user.repository";

type RouteContext = { params: Promise<{ id: string }> };

const NOT_FOUND_MESSAGE = "La compra no existe";

const NO_RECEIPT: OrderReceiptResponse = { receiptUrl: null };

/**
 * Boleta de Stripe resuelta en caliente. No se persiste el `receipt_url`: es un
 * enlace vivo que Stripe puede regenerar y una copia en base de datos envejece
 * (spec 014, "Datos").
 *
 * Endpoint aparte del listado a propósito: resolverlo por orden en
 * `/api/orders/mine` serían N llamadas a Stripe por render.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const clerkId = await requireAuth();
    const { id } = await context.params;

    // Un id que no es uuid haría fallar la consulta con un 500 de Postgres;
    // como recurso, sencillamente no existe.
    if (!z.uuid().safeParse(id).success) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    const actor = await findActorByClerkId(clerkId);

    if (!actor) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    const order = await findOrderById(id);

    // 404 y no 403: confirmar que la orden existe pero es de otro ya filtraría
    // información sobre compras ajenas.
    if (!order || order.userId !== actor.id) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    if (order.status !== "paid" || !order.stripePaymentIntentId) {
      return NextResponse.json(NO_RECEIPT);
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
      order.stripePaymentIntentId,
      { expand: ["latest_charge"] },
    );

    const latestCharge = paymentIntent.latest_charge;

    // `latest_charge` llega como id o como objeto según se haya expandido (y es
    // `null` mientras no exista el cargo): se comprueba antes de leerlo, sin
    // castear a ciegas.
    const body: OrderReceiptResponse =
      typeof latestCharge === "object" && latestCharge !== null
        ? { receiptUrl: latestCharge.receipt_url ?? null }
        : NO_RECEIPT;

    return NextResponse.json(body);
  } catch (error) {
    return handleApiError(error);
  }
}
