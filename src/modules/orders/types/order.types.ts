import type { InferSelectModel } from "drizzle-orm";

import type { orderItems } from "@/server/db/schema/order-item";
import type { orders } from "@/server/db/schema/order";

export type Order = InferSelectModel<typeof orders>;
export type OrderItem = InferSelectModel<typeof orderItems>;

// Composición sobre los tipos inferidos, nunca una copia manual: la orden y sus
// líneas viajan juntas porque ninguna vista de una orden tiene sentido sin ellas.
export type OrderWithItems = Order & { items: OrderItem[] };

/**
 * `null` cuando Stripe todavía no generó la boleta (orden sin `PaymentIntent`,
 * o cargo aún sin confirmar). No es un error: la orden puede estar pagada y el
 * recibo llegar segundos después.
 */
export type OrderReceiptResponse = { receiptUrl: string | null };
