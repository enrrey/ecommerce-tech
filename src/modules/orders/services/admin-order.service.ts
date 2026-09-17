import { api } from "@/lib/axios";

import type { AdminOrderListItem } from "../types/order.types";

/** Todas las órdenes del sistema. El filtrado vive en la tabla, no en la URL. */
export async function getAdminOrders(): Promise<AdminOrderListItem[]> {
  const { data } = await api.get<AdminOrderListItem[]>("/admin/orders");

  return data;
}
