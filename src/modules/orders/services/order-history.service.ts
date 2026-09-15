import { api } from "@/lib/axios";

import type { MyOrdersQueryInput } from "../schemas/order-history.schema";
import type {
  OrderReceiptResponse,
  OrderWithItems,
} from "../types/order.types";

export async function getMyOrders(
  query: MyOrdersQueryInput = {},
): Promise<OrderWithItems[]> {
  // Axios omite del querystring las claves con valor `undefined`: sin rango, la
  // petición viaja sin parámetros y el historial no se filtra por fecha.
  const { data } = await api.get<OrderWithItems[]>("/orders/mine", {
    params: query,
  });

  return data;
}

export async function getOrderReceipt(
  orderId: string,
): Promise<OrderReceiptResponse> {
  const { data } = await api.get<OrderReceiptResponse>(
    `/orders/${orderId}/receipt`,
  );

  return data;
}
