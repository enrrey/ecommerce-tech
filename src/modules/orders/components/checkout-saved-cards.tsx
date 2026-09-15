"use client";

import { CheckIcon, CreditCardIcon, Loader2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { cardBrandLabel, formatCardExpiry } from "../constants";
import { useSetDefaultPaymentMethod } from "../hooks/use-payment-method-mutations";
import { usePaymentMethods } from "../hooks/use-payment-methods";
import type { PaymentMethod } from "../types/payment-method.types";

function CheckoutCardsSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

function SavedCardOption({
  card,
  isPending,
  onSelect,
}: {
  card: PaymentMethod;
  isPending: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="radio"
        aria-checked={card.isDefault}
        disabled={isPending}
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
          "hover:bg-accent focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          "disabled:pointer-events-none disabled:opacity-60",
          card.isDefault && "border-foreground bg-accent/40",
        )}
      >
        <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
          <CreditCardIcon className="size-4" />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-bold">
            {cardBrandLabel(card.brand)} •••• {card.last4}
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            Vence {formatCardExpiry(card)}
          </span>
        </span>

        {card.isDefault ? (
          <Badge className="shrink-0">
            <CheckIcon className="size-3" />
            Predeterminada
          </Badge>
        ) : null}
      </button>
    </li>
  );
}

/**
 * Tarjetas guardadas justo encima del botón "Pagar". Es un atajo, no un paso
 * obligatorio: el cobro sigue ocurriendo en Stripe, así que si la query falla o
 * el usuario no tiene tarjetas la sección desaparece y el checkout queda como
 * estaba.
 *
 * Marcar una predeterminada es una preferencia local: en `mode: "payment"`
 * Checkout prefilla la más reciente y no acepta forzar otra. El copy no promete
 * lo contrario.
 */
export function CheckoutSavedCards() {
  const cardsQuery = usePaymentMethods();
  const setDefault = useSetDefaultPaymentMethod();

  if (cardsQuery.isPending) {
    return <CheckoutCardsSkeleton />;
  }

  const cards = cardsQuery.data;

  if (cardsQuery.isError || !cards || cards.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Tus tarjetas guardadas</h2>
        {setDefault.isPending ? (
          <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
        ) : null}
      </div>

      <ul
        role="radiogroup"
        aria-label="Tarjeta predeterminada"
        className="flex flex-col gap-2"
      >
        {cards.map((card) => (
          <SavedCardOption
            key={card.id}
            card={card}
            isPending={setDefault.isPending}
            onSelect={() => {
              if (card.isDefault) {
                return;
              }

              setDefault.mutate(card.id);
            }}
          />
        ))}
      </ul>

      <p className="text-muted-foreground text-xs">
        Elige la que uses más para tenerla marcada aquí. Podrás confirmarla o
        cambiarla en Stripe al pagar.
      </p>
    </section>
  );
}
