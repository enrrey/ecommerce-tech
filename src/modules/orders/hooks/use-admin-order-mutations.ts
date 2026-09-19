"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { adminOrderKeys } from "../constants";
import type { OrderStatusTarget } from "../lib/order-status-transitions";
import { updateAdminOrderStatus } from "../services/admin-order.service";
import type { Order } from "../types/order.types";

export type UpdateAdminOrderStatusVariables = {
  id: string;
  status: OrderStatusTarget;
};

const SUCCESS_MESSAGE: Record<OrderStatusTarget, string> = {
  paid: "Orden marcada como pagada",
  canceled: "Orden cancelada",
};

export function useUpdateAdminOrderStatus(): UseMutationResult<
  Order,
  Error,
  UpdateAdminOrderStatusVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: UpdateAdminOrderStatusVariables) =>
      updateAdminOrderStatus(id, status),
    onSuccess: async (_order, variables) => {
      toast.success(SUCCESS_MESSAGE[variables.status]);
      // Refetch del listado en vez de parchear la caché: la fila del panel trae
      // comprador y líneas, que esta respuesta no incluye.
      await queryClient.invalidateQueries({ queryKey: adminOrderKeys.list() });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
