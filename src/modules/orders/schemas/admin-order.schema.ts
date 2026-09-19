import { z } from "zod";

import { ORDER_STATUS_TARGETS } from "../lib/order-status-transitions";

export const orderIdParamSchema = z.object({
  id: z.uuid("Identificador de orden inválido"),
});

// Derivado de la máquina de transiciones, no escrito a mano: un destino nuevo
// queda aceptado sin tocar este archivo, y uno inexistente nunca llega al
// repositorio.
export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_TARGETS, {
    message: "El estado indicado no se puede asignar desde el panel",
  }),
});

export type OrderIdParam = z.output<typeof orderIdParamSchema>;
export type UpdateOrderStatusBody = z.output<typeof updateOrderStatusSchema>;
