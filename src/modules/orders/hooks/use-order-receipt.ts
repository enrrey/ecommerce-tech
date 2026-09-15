"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { orderKeys } from "../constants";
import { getOrderReceipt } from "../services/order-history.service";
import type { OrderReceiptResponse } from "../types/order.types";

/**
 * Boleta de una compra. Cada consulta es una llamada a Stripe, así que solo se
 * dispara con el dialog abierto sobre una orden `paid`: por eso `enabled` lo
 * decide quien la usa y no el propio hook.
 */
export function useOrderReceipt(
  orderId: string,
  enabled: boolean,
): UseQueryResult<OrderReceiptResponse, Error> {
  return useQuery({
    queryKey: orderKeys.receipt(orderId),
    queryFn: () => getOrderReceipt(orderId),
    enabled,
  });
}
