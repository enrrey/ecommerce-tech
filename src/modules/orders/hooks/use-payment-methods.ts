"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { paymentMethodKeys } from "../constants";
import { getPaymentMethods } from "../services/payment-method.service";
import type { PaymentMethod } from "../types/payment-method.types";

/** Tarjetas guardadas del usuario en sesión. */
export function usePaymentMethods(): UseQueryResult<PaymentMethod[], Error> {
  return useQuery({
    queryKey: paymentMethodKeys.mine(),
    queryFn: getPaymentMethods,
  });
}
