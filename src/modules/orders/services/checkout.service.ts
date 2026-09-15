import { api } from "@/lib/axios";

import type {
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResponse,
} from "../types/checkout.types";

export async function postCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionResponse> {
  const { data } = await api.post<CreateCheckoutSessionResponse>(
    "/checkout/session",
    input,
  );

  return data;
}
