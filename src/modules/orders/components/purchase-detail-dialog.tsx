"use client";

import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatPriceFromCents } from "@/lib/utils";

import { orderStatusPresentation } from "../constants";
import { useOrderReceipt } from "../hooks/use-order-receipt";
import type { OrderWithItems } from "../types/order.types";

const PAID_STATUS = "paid";

/**
 * La boleta se pide aquí y no en el listado: es una llamada a Stripe por orden y
 * resolverlas todas por render multiplicaría el coste de abrir el historial.
 */
function ReceiptAction({ order }: { order: OrderWithItems }) {
  const isPaid = order.status === PAID_STATUS;
  const receiptQuery = useOrderReceipt(order.id, isPaid);

  // Una compra pendiente o cancelada no tiene nada que descargar (AC7).
  if (!isPaid) {
    return null;
  }

  if (receiptQuery.isPending) {
    return (
      <Button variant="outline" disabled>
        Buscando la boleta…
      </Button>
    );
  }

  if (receiptQuery.isError) {
    return (
      <div className="flex flex-col items-stretch gap-2" role="alert">
        <p className="text-muted-foreground text-sm">
          {receiptQuery.error.message}
        </p>
        <Button variant="outline" onClick={() => receiptQuery.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  // Pagada pero sin `receipt_url`: el cargo aún no está confirmado en Stripe.
  if (!receiptQuery.data.receiptUrl) {
    return (
      <Button variant="outline" disabled>
        Stripe aún no generó la boleta
      </Button>
    );
  }

  return (
    <Button variant="outline" asChild>
      {/* Pestaña nueva: la boleta vive en el dominio de Stripe, no en la app. */}
      <a
        href={receiptQuery.data.receiptUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLinkIcon className="size-4" />
        Descargar boleta
      </a>
    </Button>
  );
}

/**
 * Quién compró. Solo lo pinta el panel: en `/profile` el comprador es quien
 * mira, así que las props llegan ausentes y el dialog queda idéntico.
 */
type CustomerProps = {
  customerName?: string;
  customerEmail?: string;
};

function PurchaseDetail({
  order,
  customerName,
  customerEmail,
}: { order: OrderWithItems } & CustomerProps) {
  const presentation = orderStatusPresentation(order.status);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-xl font-extrabold">
          Detalle de la compra
        </DialogTitle>
        <DialogDescription>
          Referencia{" "}
          <span className="font-mono text-xs break-all">{order.id}</span>
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-sm font-semibold">
            Estado
          </span>
          <Badge variant={presentation.variant}>{presentation.label}</Badge>
        </div>

        {customerName || customerEmail ? (
          <>
            <Separator />
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground text-sm font-semibold">
                Comprador
              </span>
              <div className="flex min-w-0 flex-col items-end">
                <span className="truncate text-sm font-bold">
                  {customerName}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {customerEmail}
                </span>
              </div>
            </div>
          </>
        ) : null}

        <Separator />

        <ul className="divide-y">
          {/* Nombre y precio congelados en la línea: el producto pudo borrarse
              del catálogo y `order_items.product_id` quedar en null. */}
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate text-sm font-bold">{item.productName}</p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {item.quantity} × {formatPriceFromCents(item.unitPriceCents)}
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
      </div>

      <DialogFooter>
        <ReceiptAction order={order} />
      </DialogFooter>
    </>
  );
}

/**
 * Recibe la orden ya cargada por el listado: no vuelve a pedirla al abrirse. Lo
 * único que consulta es la boleta, y solo mientras está montado.
 */
export function PurchaseDetailDialog({
  order,
  customerName,
  customerEmail,
  onClose,
}: {
  order: OrderWithItems | null;
  onClose: () => void;
} & CustomerProps) {
  return (
    <Dialog open={order !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {/* Montado solo con el dialog abierto: al cerrarse desmonta el hook de
            la boleta y la siguiente compra arranca su propia consulta. */}
        {order ? (
          <PurchaseDetail
            order={order}
            customerName={customerName}
            customerEmail={customerEmail}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
