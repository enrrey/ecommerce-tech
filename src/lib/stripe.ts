import "server-only";

import Stripe from "stripe";

import { requireEnv } from "./env";

/**
 * Instancia única server-only, mismo patrón que `src/server/db/index.ts`.
 * Nunca el patrón global deprecado (`Stripe.setApiKey`): la clave viaja en el
 * constructor y los métodos se llaman siempre sobre esta instancia.
 */
export const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  typescript: true,
});
