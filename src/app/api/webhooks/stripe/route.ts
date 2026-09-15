import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { handleApiError } from "@/lib/api-errors";
import { requireEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { markOrderAsPaid } from "@/server/repositories/order.repository";
import { savePaymentMethod } from "@/server/repositories/payment-method.repository";
import { findUserByStripeCustomerId } from "@/server/repositories/user.repository";

/**
 * Las referencias de Stripe (`payment_intent`, `setup_intent`, `customer`)
 * viajan como id, como objeto expandido o `null` según cómo se haya creado la
 * sesión. Se normalizan aquí en vez de forzar el tipo con un `as string` que
 * mentiría cuando de verdad llega vacío.
 */
function toStripeId(
  reference: string | { id: string } | null | undefined,
): string | null {
  return typeof reference === "string" ? reference : (reference?.id ?? null);
}

async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<void> {
  // "unpaid" es un pago asíncrono todavía sin acreditar: la orden se queda
  // `pending` y se confirmará con `checkout.session.async_payment_succeeded`.
  if (session.payment_status === "unpaid") {
    return;
  }

  const updated = await markOrderAsPaid(
    session.id,
    toStripeId(session.payment_intent),
  );

  if (!updated) {
    console.info(
      `Sesión ${session.id} sin orden pendiente: evento repetido o sesión ajena.`,
    );
  }
}

/**
 * Cierre del alta de tarjeta (`mode: "setup"`): es aquí, y no en la vuelta del
 * navegador a `/profile`, donde la tarjeta queda guardada.
 *
 * Solo se persiste lo que Stripe expone del `PaymentMethod` — marca, últimos 4 y
 * vencimiento. El número completo nunca llega a este servidor, y tampoco se
 * escribe en los logs.
 */
async function savePaymentMethodFromSetupSession(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const setupIntentId = toStripeId(session.setup_intent);
  const customerId = toStripeId(session.customer);

  if (!setupIntentId || !customerId) {
    console.info(
      `Sesión de setup ${session.id} sin setup_intent o sin customer: nada que guardar.`,
    );
    return;
  }

  // El Customer es el único enlace entre el evento y un usuario nuestro: Stripe
  // no conoce `users.id`.
  const user = await findUserByStripeCustomerId(customerId);

  if (!user) {
    console.info(
      `Sesión de setup ${session.id} de un customer que no es nuestro: ignorada.`,
    );
    return;
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
    expand: ["payment_method"],
  });

  const paymentMethod = setupIntent.payment_method;

  // Sin expandir llegaría como id: se comprueba antes de leer sus campos, sin
  // castear a ciegas.
  if (typeof paymentMethod !== "object" || paymentMethod === null) {
    console.info(
      `SetupIntent ${setupIntentId} sin PaymentMethod resuelto: ignorado.`,
    );
    return;
  }

  const card = paymentMethod.card;

  // Un método que no es tarjeta (wallet u otro que Checkout ofrezca) no tiene
  // `brand` ni `last4`: se ignora antes que insertar una fila mentirosa.
  if (!card) {
    console.info(
      `PaymentMethod ${paymentMethod.id} no es una tarjeta: no se guarda.`,
    );
    return;
  }

  await savePaymentMethod({
    userId: user.id,
    stripePaymentMethodId: paymentMethod.id,
    brand: card.brand,
    last4: card.last4,
    expMonth: card.exp_month,
    expYear: card.exp_year,
  });
}

/**
 * Cierre del ciclo de pago: es aquí, y no en `/orders/[id]`, donde una orden
 * pasa a `paid`. La página de confirmación solo es la URL a la que Stripe
 * redirige, y volver a ella no prueba que el cobro haya cuajado.
 *
 * Ruta pública (`/api/webhooks(.*)` en `middleware.ts`): la firma HMAC del
 * header `stripe-signature` es la única autenticación y también la validación
 * de entrada, igual que `verifyWebhook` en el webhook de Clerk. Por eso el
 * cuerpo se lee crudo con `request.text()`: cualquier reserialización
 * (`request.json()`) rompería el HMAC.
 *
 * Un fallo de base de datos sale como 5xx a propósito para que Stripe reintente.
 * Los eventos que no manejamos se responden 200: reintentarlos no cambiaría nada.
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { message: "Falta la firma del webhook" },
        { status: 400 },
      );
    }

    const payload = await request.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        requireEnv("STRIPE_WEBHOOK_SIGNING_SECRET"),
      );
    } catch (error) {
      console.error("Firma de webhook de Stripe inválida", error);

      return NextResponse.json(
        { message: "Firma de webhook inválida" },
        { status: 400 },
      );
    }

    switch (event.type) {
      // Ambos eventos significan lo mismo para nosotros: hay dinero cobrado
      // sobre esa sesión. `markOrderAsPaid` absorbe el duplicado.
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;

        // La misma sesión completada significa dos cosas distintas según su
        // modo: `payment` es una compra, `setup` es una tarjeta guardada. El
        // pago sigue exactamente el mismo camino que en 013.
        // `async_payment_succeeded` solo existe en `mode: "payment"`, así que la
        // rama de setup nunca lo alcanza.
        if (session.mode === "setup") {
          await savePaymentMethodFromSetupSession(session);
          break;
        }

        await fulfillCheckoutSession(session);
        break;
      }

      // El pago asíncrono no cuajó: la orden ya está `pending`, no hay nada que
      // deshacer. Cancelarla es otro alcance (spec 013 lo deja fuera).
      case "checkout.session.async_payment_failed":
        break;

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return handleApiError(error);
  }
}
