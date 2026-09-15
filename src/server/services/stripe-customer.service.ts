import "server-only";

import { NotFoundError } from "@/lib/api-errors";
import { stripe } from "@/lib/stripe";
import {
  findUserById,
  setStripeCustomerId,
} from "@/server/repositories/user.repository";

const USER_NOT_FOUND_MESSAGE =
  "Tu cuenta todavía no está sincronizada; vuelve a intentarlo en unos segundos";

/**
 * Customer de Stripe del usuario, creándolo la primera vez. Cruza el repositorio
 * de usuarios con la API de Stripe, así que vive en `server/services` y no en el
 * repositorio: allí solo hay acceso a datos.
 *
 * El id se persiste **inmediatamente** después de crearlo y antes de que el
 * handler abra la Checkout Session. Un `customers.create` que no se guarda no
 * deja rastro local, y el siguiente intento crearía otro Customer: así cada
 * reintento fallido dejaría un huérfano en Stripe (AC2).
 */
export async function getOrCreateStripeCustomer(
  actorId: string,
): Promise<string> {
  const user = await findUserById(actorId);

  if (!user) {
    throw new NotFoundError(USER_NOT_FOUND_MESSAGE);
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    // Enlace de vuelta para depurar desde el Dashboard. `users.id` es interno y
    // no identifica a nadie por sí solo: no es PII.
    metadata: { userId: user.id },
  });

  await setStripeCustomerId(user.id, customer.id);

  return customer.id;
}
