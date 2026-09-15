import { NextResponse } from "next/server";

import { handleApiError, NotFoundError } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth";
import { APP_URL } from "@/lib/constants";
import { stripe } from "@/lib/stripe";
import { createCheckoutSessionSchema } from "@/modules/orders/schemas/checkout.schema";
import type { CreateCheckoutSessionResponse } from "@/modules/orders/types/checkout.types";
import {
  attachCheckoutSessionToOrder,
  createPendingOrder,
} from "@/server/repositories/order.repository";
import { findActorByClerkId } from "@/server/repositories/user.repository";
import { getOrCreateStripeCustomer } from "@/server/services/stripe-customer.service";

const ACTOR_NOT_FOUND_MESSAGE =
  "Tu cuenta todavía no está sincronizada; vuelve a intentarlo en unos segundos";

/**
 * Ruta separada de `/api/orders` a propósito: desacopla "crear una orden" de
 * "cobrar con un proveedor concreto", así que añadir otro método de pago no
 * obliga a tocar el recurso `orders`.
 *
 * `/checkout(.*)` no es pública en `middleware.ts`, pero `requireAuth()` no es
 * decorativo: el borde solo garantiza sesión, y aquí hace falta el `users.id`
 * local para dueño de la orden.
 */
export async function POST(request: Request) {
  try {
    const clerkId = await requireAuth();

    const actor = await findActorByClerkId(clerkId);

    if (!actor) {
      throw new NotFoundError(ACTOR_NOT_FOUND_MESSAGE);
    }

    const input = createCheckoutSessionSchema.parse(await request.json());

    // Precio, nombre y total salen del catálogo dentro de la transacción: lo
    // único que el cliente aportó son ids y cantidades.
    const order = await createPendingOrder({
      userId: actor.id,
      items: input.items,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Del actor autenticado, nunca de un id del body: es lo que hace que
      // Checkout ofrezca las tarjetas ya guardadas. Un Customer recién creado sin
      // tarjetas se comporta igual que antes de pasar este campo.
      customer: await getOrCreateStripeCustomer(actor.id),
      saved_payment_method_options: {
        // El default de `allow_redisplay` es "unspecified" y Stripe solo muestra
        // "always" salvo que se pida lo contrario: sin este filtro una tarjeta
        // guardada en /profile podría no aparecer al pagar. El consentimiento se
        // recogió allí, al guardarla.
        allow_redisplay_filters: ["always", "limited", "unspecified"],
        // `payment_method_save` y `payment_method_remove` se quedan en su default
        // (disabled): el webhook de 015 solo persiste `mode: "setup"` y activarlas
        // desincronizaría `payment_methods`. El alta y la baja siguen en /profile.
      },
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        // `price_data` inline: el catálogo no se sincroniza con Stripe, cada
        // sesión se arma con el precio congelado en la orden.
        price_data: {
          currency: order.currency,
          unit_amount: item.unitPriceCents,
          product_data: { name: item.productName },
        },
      })),
      // Sin `payment_method_types`: los métodos de pago dinámicos son el
      // comportamiento por defecto y se configuran desde el Dashboard.
      success_url: `${APP_URL}/orders/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/checkout`,
    });

    if (!session.url) {
      throw new Error("Stripe no devolvió una URL de checkout");
    }

    await attachCheckoutSessionToOrder(order.id, session.id);

    const body: CreateCheckoutSessionResponse = { url: session.url };

    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
