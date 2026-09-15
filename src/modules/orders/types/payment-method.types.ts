import type { InferSelectModel } from "drizzle-orm";

import type { paymentMethods } from "@/server/db/schema/payment-method";

export type PaymentMethod = InferSelectModel<typeof paymentMethods>;

/** Enlace de Stripe al que redirigir para guardar la tarjeta (`mode: "setup"`). */
export type SetupSessionResponse = { url: string };

export type SetDefaultPaymentMethodResponse = { updated: true };
