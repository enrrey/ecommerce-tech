import { ALL_FILTER } from "@/modules/products/constants";

import type { MyOrdersQueryInput } from "../schemas/order-history.schema";
import type { AdminOrderListItem } from "../types/order.types";

/**
 * Predicados puros de los tres filtros del panel. Piden lo mínimo de la orden
 * (no la orden entera) para poder probarse sin construir una fila completa, y
 * viven fuera de los componentes: TanStack Table solo los envuelve.
 */

/** Un término vacío no filtra: la tabla arranca sin búsqueda. */
export function matchesCustomer(
  order: Pick<AdminOrderListItem, "customerName" | "customerEmail">,
  term: string,
): boolean {
  const needle = term.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  return (
    order.customerName.toLowerCase().includes(needle) ||
    order.customerEmail.toLowerCase().includes(needle)
  );
}

export function matchesStatus(
  order: Pick<AdminOrderListItem, "status">,
  status: string,
): boolean {
  if (!status || status === ALL_FILTER) {
    return true;
  }

  return order.status === status;
}

/**
 * Compara el día UTC de `createdAt` contra los extremos `YYYY-MM-DD`: en ese
 * formato el orden lexicográfico coincide con el cronológico, así que no hace
 * falta parsear fechas. Ambos extremos son inclusive y el ausente no pone tope.
 */
export function isWithinRange(
  order: Pick<AdminOrderListItem, "createdAt">,
  range: MyOrdersQueryInput,
): boolean {
  const day = order.createdAt.slice(0, 10);

  if (range.from && day < range.from) {
    return false;
  }

  if (range.to && day > range.to) {
    return false;
  }

  return true;
}
