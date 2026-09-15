"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCardIcon, Loader2Icon, PlusIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BRAND_BUTTON_CLASS } from "@/modules/storefront/constants";

import {
  cardBrandLabel,
  formatCardExpiry,
  paymentMethodKeys,
} from "../constants";
import { usePaymentMethods } from "../hooks/use-payment-methods";
import {
  useCreateSetupSession,
  useDeletePaymentMethod,
  useSetDefaultPaymentMethod,
} from "../hooks/use-payment-method-mutations";
import type { PaymentMethod } from "../types/payment-method.types";

type SavedCardsProps = {
  /** `?setup=` con el que Stripe devuelve al usuario: `success` o `canceled`. */
  setupStatus?: string;
};

function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: 2 }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

function CardRow({
  card,
  isSettingDefault,
  onSetDefault,
  onDelete,
}: {
  card: PaymentMethod;
  isSettingDefault: boolean;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-xl border p-4">
      <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
        <CreditCardIcon className="size-5" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-bold">
            {cardBrandLabel(card.brand)} •••• {card.last4}
          </span>
          {card.isDefault ? <Badge>Predeterminada</Badge> : null}
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          Vence {formatCardExpiry(card)}
        </span>
      </span>

      {card.isDefault ? null : (
        <Button
          variant="outline"
          size="sm"
          disabled={isSettingDefault}
          onClick={onSetDefault}
        >
          Hacer predeterminada
        </Button>
      )}

      <Button variant="ghost" size="sm" onClick={onDelete}>
        Eliminar
      </Button>
    </li>
  );
}

/**
 * Tarjetas guardadas del usuario. El alta no ocurre aquí: se abre una Checkout
 * Session en modo `setup` y es el webhook quien persiste la tarjeta, así que al
 * volver de Stripe solo se invalida la query.
 *
 * Ningún dato sensible pasa por este componente: la API solo devuelve marca,
 * últimos 4 y vencimiento.
 */
export function SavedCards({ setupStatus }: SavedCardsProps) {
  const queryClient = useQueryClient();
  const [pendingCard, setPendingCard] = useState<PaymentMethod | null>(null);

  const cardsQuery = usePaymentMethods();
  const createSetupSession = useCreateSetupSession();
  const deleteCard = useDeletePaymentMethod();
  const setDefaultCard = useSetDefaultPaymentMethod();

  // El usuario puede volver de Stripe antes de que llegue el webhook. Se refresca
  // una vez al aterrizar; sin polling agresivo, que solo castigaría a la API para
  // ganar unos segundos.
  useEffect(() => {
    if (setupStatus === "success") {
      void queryClient.invalidateQueries({ queryKey: paymentMethodKeys.all });
    }
  }, [setupStatus, queryClient]);

  const cards = cardsQuery.data;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Guarda una tarjeta con Stripe para tenerla a mano. Nunca almacenamos su
          número completo.
        </p>

        <Button
          className={cn(BRAND_BUTTON_CLASS, "shrink-0")}
          disabled={createSetupSession.isPending}
          onClick={() => createSetupSession.mutate()}
        >
          {createSetupSession.isPending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <PlusIcon />
          )}
          Agregar tarjeta
        </Button>
      </div>

      {setupStatus === "success" ? (
        <p
          role="status"
          className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm"
        >
          Estamos registrando tu tarjeta. Puede tardar unos segundos en aparecer
          en la lista.
        </p>
      ) : null}

      {cardsQuery.isPending ? <CardsSkeleton /> : null}

      {cardsQuery.isError ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center"
        >
          <p className="font-medium">No pudimos cargar tus tarjetas</p>
          <p className="text-muted-foreground text-sm">
            {cardsQuery.error.message}
          </p>
          <Button variant="outline" onClick={() => cardsQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {cards && !cardsQuery.isError ? (
        cards.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
            <p>Todavía no tienes tarjetas guardadas.</p>
            <p className="text-sm">
              Agrega una para identificarla más rápido la próxima vez.
            </p>
          </div>
        ) : (
          <ul
            className="flex flex-col gap-3"
            aria-busy={cardsQuery.isFetching || undefined}
          >
            {cards.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                isSettingDefault={setDefaultCard.isPending}
                onSetDefault={() => setDefaultCard.mutate(card.id)}
                onDelete={() => setPendingCard(card)}
              />
            ))}
          </ul>
        )
      ) : null}

      <AlertDialog
        open={pendingCard !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingCard(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarjeta?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCard ? (
                <>
                  Se desvinculará la tarjeta{" "}
                  <strong>
                    {cardBrandLabel(pendingCard.brand)} •••• {pendingCard.last4}
                  </strong>{" "}
                  de tu cuenta. Podrás volver a guardarla cuando quieras.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCard.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={deleteCard.isPending}
              onClick={(event) => {
                // El AlertDialog cierra por defecto al accionar; la vista lo
                // cierra solo cuando la mutación responde.
                event.preventDefault();

                if (!pendingCard) {
                  return;
                }

                deleteCard.mutate(pendingCard.id, {
                  onSuccess: () => setPendingCard(null),
                });
              }}
            >
              {deleteCard.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
