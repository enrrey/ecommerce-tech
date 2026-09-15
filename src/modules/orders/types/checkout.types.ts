import type { z } from "zod";

import type { createCheckoutSessionSchema } from "../schemas/checkout.schema";

export type CreateCheckoutSessionInput = z.output<
  typeof createCheckoutSessionSchema
>;

/** La página de pago vive en Stripe: la API solo devuelve a dónde redirigir. */
export type CreateCheckoutSessionResponse = { url: string };
