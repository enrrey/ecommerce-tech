// Módulo puro y compartido por UI y servidor: sin imports de `server-only`, de
// Drizzle ni de React. La misma tabla decide qué botón se pinta y qué UPDATE se
// permite, así que una regla nueva no puede quedar aplicada solo en un lado.

export const ORDER_STATUSES = ["pending", "paid", "canceled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Destinos alcanzables desde cada estado. `canceled` es terminal (lista vacía) y
 * nadie vuelve a `pending`: el pago y la cancelación no se deshacen desde el
 * panel.
 */
export const ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  pending: ["paid", "canceled"],
  paid: ["canceled"],
  canceled: [],
};

/**
 * Estados que un administrador puede pedir como destino. `pending` queda fuera
 * porque no es destino de ninguna transición: es el estado con el que nace la
 * orden.
 */
export const ORDER_STATUS_TARGETS = [
  "paid",
  "canceled",
] as const satisfies readonly OrderStatus[];

export type OrderStatusTarget = (typeof ORDER_STATUS_TARGETS)[number];

// `orders.status` es varchar: un valor desconocido en base no puede romper la
// comprobación, simplemente no habilita ninguna transición.
function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: string, to: string): boolean {
  if (!isOrderStatus(from) || !isOrderStatus(to)) {
    return false;
  }

  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}
