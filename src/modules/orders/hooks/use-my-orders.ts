"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";

import { orderKeys } from "../constants";
import type { MyOrdersQueryInput } from "../schemas/order-history.schema";
import { getMyOrders } from "../services/order-history.service";
import type { OrderWithItems } from "../types/order.types";

/**
 * Historial del usuario en sesión. `keepPreviousData` mantiene la lista visible
 * mientras se recarga con otro rango, en lugar de vaciarla a esqueletos en cada
 * cambio de fecha.
 */
export function useMyOrders(
  query: MyOrdersQueryInput = {},
): UseQueryResult<OrderWithItems[], Error> {
  return useQuery({
    queryKey: orderKeys.mine(query),
    queryFn: () => getMyOrders(query),
    placeholderData: keepPreviousData,
  });
}
