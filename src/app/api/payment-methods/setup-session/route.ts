import { NextResponse } from "next/server";

import { handleApiError, NotFoundError } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth";
import { APP_URL } from "@/lib/constants";
import { stripe } from "@/lib/stripe";
import type { SetupSessionResponse } from "@/modules/orders/types/payment-method.types";
import { getOrCreateStripeCustomer } from "@/server/services/stripe-customer.service";
import { findActorByClerkId } from "@/server/repositories/user.repository";

const ACTOR_NOT_FOUND_MESSAGE =
  "Tu cuenta todavía no está sincronizada; vuelve a intentarlo en unos segundos";

/**
 * Alta de tarjeta delegada por completo en Checkout: el formulario de tarjeta
 * vive en `checkout.stripe.com` y el número nunca pasa por nuestro servidor.
 *
 * Sin body y sin Zod sobre la entrada porque no hay entrada que validar: el
 * Customer sale del actor de la sesión, nunca de lo que mande el cliente. Aceptar
 * un `customerId` por body sería permitir guardar tarjetas en cuentas ajenas.
 *
 * La fuente de verdad es el webhook (igual que en 013): la vuelta del navegador
 * a `success_url` solo informa, no persiste nada.
 */
export async function POST() {
  try {
    const clerkId = await requireAuth();

    const actor = await findActorByClerkId(clerkId);

    if (!actor) {
      throw new NotFoundError(ACTOR_NOT_FOUND_MESSAGE);
    }

    const customerId = await getOrCreateStripeCustomer(actor.id);

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      // Obligatorio en modo `setup`: sin él, Stripe no puede resolver qué
      // métodos de pago dinámicos ofrecer.
      currency: "usd",
      // `customer` es lo que hace que Stripe adjunte el PaymentMethod resultante
      // al Customer: no hace falta un `attach` manual después.
      customer: customerId,
      success_url: `${APP_URL}/profile?tab=cards&setup=success`,
      cancel_url: `${APP_URL}/profile?tab=cards&setup=canceled`,
    });

    if (!session.url) {
      throw new Error("Stripe no devolvió una URL de checkout");
    }

    const body: SetupSessionResponse = { url: session.url };

    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
