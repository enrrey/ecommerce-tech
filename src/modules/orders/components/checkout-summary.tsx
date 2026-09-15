"use client";

import Link from "next/link";
import { Loader2Icon, LockIcon, ShoppingCartIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn, formatPriceFromCents } from "@/lib/utils";
import {
  selectCartSubtotalCents,
  useCartStore,
} from "@/modules/cart/store/cart.store";
import { ProductTile } from "@/modules/storefront/components/product-tile";
import { BRAND_BUTTON_CLASS } from "@/modules/storefront/constants";

import { useCreateCheckoutSession } from "../hooks/use-create-checkout-session";
import { CheckoutSavedCards } from "./checkout-saved-cards";

/**
 * El carrito vive en Zustand (estado de UI, no dato de servidor), así que este
 * resumen tiene que ser cliente. Es la única frontera `"use client"` de
 * `/checkout`: la página que lo monta sigue siendo Server Component.
 */
export function CheckoutSummary() {
  const items = useCartStore((state) => state.items);
  const subtotalCents = useCartStore(selectCartSubtotalCents);
  const createSession = useCreateCheckoutSession();

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-4 py-16 text-center">
        <ShoppingCartIcon className="size-10" strokeWidth={1.5} />
        <p className="text-sm">
          Tu carrito está vacío.
          <br />
          Añade algo antes de pagar.
        </p>
        <Button variant="outline" asChild>
          <Link href="/products">Ir al catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="divide-y">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-4">
            <ProductTile
              name={item.name}
              imageUrl={item.imageUrl}
              className="size-16 shrink-0 rounded-lg"
              sizes="64px"
              fallbackClassName="text-xl"
            />

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-sm font-bold">{item.name}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {item.quantity} × {formatPriceFromCents(item.priceCents)}
              </p>
            </div>

            <span className="text-sm font-bold tabular-nums">
              {formatPriceFromCents(item.priceCents * item.quantity)}
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
          {formatPriceFromCents(subtotalCents)}
        </span>
      </div>

      <CheckoutSavedCards />

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className={cn("h-11 w-full", BRAND_BUTTON_CLASS)}
          // El importe que se cobra lo recalcula el servidor: este subtotal es
          // solo informativo y no viaja en el body.
          disabled={createSession.isPending}
          onClick={() =>
            createSession.mutate({
              items: items.map((item) => ({
                productId: item.id,
                quantity: item.quantity,
              })),
            })
          }
        >
          {createSession.isPending ? (
            <>
              <Loader2Icon className="animate-spin" />
              Redirigiendo a Stripe…
            </>
          ) : (
            "Pagar"
          )}
        </Button>

        {createSession.isError ? (
          <p role="alert" className="text-destructive text-center text-sm">
            {createSession.error.message}
          </p>
        ) : null}

        <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
          <LockIcon className="size-3.5" />
          El pago se completa en la página segura de Stripe.
        </p>
      </div>
    </div>
  );
}
