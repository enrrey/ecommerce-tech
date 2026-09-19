import { api } from "@/lib/axios";

import type { OrderStatusTarget } from "../lib/order-status-transitions";
import type { AdminOrderListItem, Order } from "../types/order.types";

/** Todas las órdenes del sistema. El filtrado vive en la tabla, no en la URL. */
export async function getAdminOrders(): Promise<AdminOrderListItem[]> {
  const { data } = await api.get<AdminOrderListItem[]>("/admin/orders");

  return data;
}

/**
 * Devuelve la cabecera actualizada, sin líneas ni comprador: quien la necesite
 * completa la refresca por el listado, que es su fuente de verdad.
 */
export async function updateAdminOrderStatus(
  id: string,
  status: OrderStatusTarget,
): Promise<Order> {
  const { data } = await api.patch<Order>(`/admin/orders/${id}/status`, {
    status,
  });

  return data;
}
