import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckoutSummary } from "@/modules/orders/components/checkout-summary";

export const metadata: Metadata = {
  title: "Checkout — VOLT",
  description: "Revisa tu pedido y completa el pago de forma segura.",
};

/**
 * Server Component: no hay nada que leer del servidor todavía (el carrito vive
 * en Zustand), así que la única frontera de cliente es `CheckoutSummary`.
 *
 * La sesión la exige `middleware.ts`: `/checkout` no está en `isPublicRoute`,
 * así que un visitante anónimo llega a Clerk antes que a esta página.
 */
export default function CheckoutPage() {
  return (
    <div className="mx-auto w-full max-w-[560px] px-5 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl font-extrabold">
            Resumen del pedido
          </CardTitle>
          <CardDescription>
            Confirma los productos y continúa al pago.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CheckoutSummary />
        </CardContent>
      </Card>
    </div>
  );
}
