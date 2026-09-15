"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { paymentMethodKeys } from "../constants";
import {
  deletePaymentMethod,
  postSetupSession,
  setDefaultPaymentMethod,
} from "../services/payment-method.service";
import type { SetupSessionResponse } from "../types/payment-method.types";

export function useCreateSetupSession(): UseMutationResult<
  SetupSessionResponse,
  Error,
  void
> {
  return useMutation({
    mutationFn: postSetupSession,
    onSuccess: (data) => {
      // Redirect de página completa, no `router.push`: el destino es
      // checkout.stripe.com, fuera del router de Next.
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePaymentMethod(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: async () => {
      toast.success("Tarjeta eliminada");
      await queryClient.invalidateQueries({ queryKey: paymentMethodKeys.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useSetDefaultPaymentMethod(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setDefaultPaymentMethod,
    onSuccess: async () => {
      // El listado llega ordenado por `isDefault` desde el servidor: refetch en
      // vez de tocar la caché a mano.
      await queryClient.invalidateQueries({ queryKey: paymentMethodKeys.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
