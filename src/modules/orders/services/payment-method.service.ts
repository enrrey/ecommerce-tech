import { api } from "@/lib/axios";

import type {
  PaymentMethod,
  SetupSessionResponse,
} from "../types/payment-method.types";

/** Sin body: el Customer lo resuelve el servidor desde la sesión. */
export async function postSetupSession(): Promise<SetupSessionResponse> {
  const { data } = await api.post<SetupSessionResponse>(
    "/payment-methods/setup-session",
  );

  return data;
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await api.get<PaymentMethod[]>("/payment-methods");

  return data;
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await api.delete(`/payment-methods/${id}`);
}

/** Sin body: el dueño de la tarjeta lo resuelve el servidor desde la sesión. */
export async function setDefaultPaymentMethod(id: string): Promise<void> {
  await api.patch(`/payment-methods/${id}/default`);
}
