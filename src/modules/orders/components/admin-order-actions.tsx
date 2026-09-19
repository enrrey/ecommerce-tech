"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { useUpdateAdminOrderStatus } from "../hooks/use-admin-order-mutations";
import { canTransition } from "../lib/order-status-transitions";

type AdminOrderActionsProps = {
  orderId: string;
  status: string;
  canUpdateStatus: boolean;
  canCancel: boolean;
};

/**
 * Acciones de estado del detalle del panel. Qué botón existe lo decide la misma
 * máquina de transiciones que usa el servidor, cruzada con los permisos que
 * resolvió la página: la UI no ofrece lo que la API va a rechazar.
 */
export function AdminOrderActions({
  orderId,
  status,
  canUpdateStatus,
  canCancel,
}: AdminOrderActionsProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const mutation = useUpdateAdminOrderStatus();

  const showPay = canUpdateStatus && canTransition(status, "paid");
  const showCancel = canCancel && canTransition(status, "canceled");

  if (!showPay && !showCancel) {
    return null;
  }

  // Confirmación en dos pasos dentro del mismo Dialog: un AlertDialog anidado
  // pondría dos portales modales de Radix a pelearse por el foco.
  if (confirmingCancel) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="text-muted-foreground text-sm">
          ¿Cancelar esta orden? La acción no se puede deshacer.
        </p>
        <Button
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => setConfirmingCancel(false)}
        >
          Volver
        </Button>
        <Button
          variant="destructive"
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate(
              { id: orderId, status: "canceled" },
              { onSuccess: () => setConfirmingCancel(false) },
            )
          }
        >
          {mutation.isPending ? "Cancelando…" : "Confirmar cancelación"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {showPay ? (
        <Button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ id: orderId, status: "paid" })}
        >
          {mutation.isPending ? "Guardando…" : "Marcar como pagada"}
        </Button>
      ) : null}

      {showCancel ? (
        <Button
          variant="destructive"
          disabled={mutation.isPending}
          onClick={() => setConfirmingCancel(true)}
        >
          Cancelar orden
        </Button>
      ) : null}
    </div>
  );
}
