"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCartStore } from "@/modules/cart/store/cart.store";

import { postCheckoutSession } from "../services/checkout.service";
import type {
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResponse,
} from "../types/checkout.types";

export function useCreateCheckoutSession(): UseMutationResult<
  CreateCheckoutSessionResponse,
  Error,
  CreateCheckoutSessionInput
> {
  return useMutation({
    mutationFn: postCheckoutSession,
    onSuccess: (data) => {
      // La orden ya está persistida en servidor: el carrito de Zustand cumplió
      // su función y vaciarlo evita volver de Stripe y recomprar lo mismo.
      useCartStore.getState().clear();

      // Redirect de página completa, no `router.push`: el destino es
      // checkout.stripe.com, fuera del router de Next.
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
