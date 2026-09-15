import { z } from "zod";

import { MAX_QUANTITY } from "@/modules/cart/store/cart.store";

/**
 * Contrato de entrada de `POST /api/checkout/session`. El cliente solo declara
 * **qué** y **cuánto**: ni `priceCents` ni `name` viajan en el body. El
 * repositorio resuelve ambos desde `products` en el servidor, así que un body
 * manipulado no puede alterar el importe cobrado.
 *
 * `MAX_QUANTITY` se reutiliza del store del carrito: el tope de la UI y el de la
 * API son el mismo número, no dos constantes que se desincronizan.
 */
export const createCheckoutSessionSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.uuid("Identificador de producto inválido"),
        quantity: z.coerce
          .number("La cantidad debe ser un número")
          .int("La cantidad debe ser entera")
          .min(1, "La cantidad mínima es 1")
          .max(MAX_QUANTITY, `La cantidad máxima es ${MAX_QUANTITY}`),
      }),
    )
    .min(1, "El carrito está vacío"),
});
