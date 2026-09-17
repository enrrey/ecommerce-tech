"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { adminOrderKeys } from "../constants";
import { getAdminOrders } from "../services/admin-order.service";
import type { AdminOrderListItem } from "../types/order.types";

export function useAdminOrders(): UseQueryResult<AdminOrderListItem[], Error> {
  return useQuery({
    queryKey: adminOrderKeys.list(),
    queryFn: getAdminOrders,
  });
}
