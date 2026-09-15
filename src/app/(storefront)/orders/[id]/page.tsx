import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PackageIcon } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireAuth } from "@/lib/auth";
import { formatPriceFromCents } from "@/lib/utils";
import { orderStatusPresentation } from "@/modules/orders/constants";
import { findOrderById } from "@/server/repositories/order.repository";
import { findActorByClerkId } from "@/server/repositories/user.repository";

export const metadata: Metadata = {
  title: "Tu pedido — VOLT",
  description: "Detalle del pedido y su estado.",
};

/**
 * Confirmación tras volver de Stripe. Server Component sin Route Handler
 * propio: lee del repositorio en el mismo render, igual que el resto de páginas
 * del storefront que muestran datos de servidor.
 *
 * El pago no se confirma aquí, sino en `/api/webhooks/stripe`: Stripe redirige
 * a esta URL tanto si el cobro cuajó como si el cliente cerró la pestaña. La
 * página solo refleja el `status` que ya tiene la orden en base de datos, así
 * que puede seguir `pending` unos segundos hasta que llegue el webhook.
 *
 * `session_id` llega en la query por convención de `success_url`; no se lee,
 * porque un identificador que viaja en la URL no prueba nada.
 */
export default async function OrderConfirmationPage(
  props: PageProps<"/orders/[id]">,
) {
  const { id } = await props.params;

  // Un id que no es uuid haría fallar la consulta con un 500 de Postgres;
  // como recurso, sencillamente no existe.
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  const clerkId = await requireAuth();
  const actor = await findActorByClerkId(clerkId);

  if (!actor) {
    notFound();
  }

  const order = await findOrderById(id);

  // 404 y no 403: confirmar que la orden existe pero es de otro ya filtraría
  // información sobre pedidos ajenos.
  if (!order || order.userId !== actor.id) {
    notFound();
  }

  const presentation = orderStatusPresentation(order.status);

  return (
    <div className="mx-auto w-full max-w-[640px] px-5 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-2xl font-extrabold">
            <PackageIcon className="size-6" />
            Pedido recibido
          </CardTitle>
          <CardDescription>
            Referencia{" "}
            <span className="font-mono text-xs break-all">{order.id}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-sm font-semibold">
              Estado
            </span>
            <Badge variant={presentation.variant}>{presentation.label}</Badge>
          </div>

          {presentation.notice ? (
            <p className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg p-3 text-sm">
              <presentation.notice.Icon className="mt-0.5 size-4 shrink-0" />
              {presentation.notice.text}
            </p>
          ) : null}

          <Separator />

          <ul className="divide-y">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-sm font-bold">
                    {item.productName}
                  </p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {item.quantity} ×{" "}
                    {formatPriceFromCents(item.unitPriceCents)}
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {formatPriceFromCents(item.unitPriceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm font-semibold">
              Total
            </span>
            <span className="text-2xl font-extrabold tabular-nums">
              {formatPriceFromCents(order.totalCents)}
            </span>
          </div>

          <Button variant="outline" asChild>
            <Link href="/products">Seguir comprando</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
