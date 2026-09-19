"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useAdminOrders } from "../hooks/use-admin-orders";
import { AdminOrderActions } from "./admin-order-actions";
import { AdminOrdersTable } from "./admin-orders-table";
import { PurchaseDetailDialog } from "./purchase-detail-dialog";

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-9 w-full max-w-xs" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

type AdminOrdersViewProps = {
  canUpdateStatus: boolean;
  canCancel: boolean;
};

/**
 * Contenedor del listado del panel: el único que consulta. La tabla y el dialog
 * son presentacionales y reciben lo que necesitan por props.
 */
export function AdminOrdersView({
  canUpdateStatus,
  canCancel,
}: AdminOrdersViewProps) {
  // Se guarda el id y no la fila: tras cambiar el estado, el detalle abierto
  // sale del listado ya refrescado en vez de quedarse mostrando una copia vieja.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ordersQuery = useAdminOrders();

  if (ordersQuery.isPending) {
    return <TableSkeleton />;
  }

  if (ordersQuery.isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center"
      >
        <p className="font-medium">No pudimos cargar las órdenes</p>
        <p className="text-muted-foreground text-sm">
          {ordersQuery.error.message}
        </p>
        <Button variant="outline" onClick={() => ordersQuery.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const selected =
    ordersQuery.data.find((order) => order.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {ordersQuery.data.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center">
          <p className="text-foreground font-medium">Todavía no hay órdenes</p>
          <p className="text-sm">
            Las compras aparecerán aquí en cuanto un cliente complete el
            checkout.
          </p>
        </div>
      ) : (
        <AdminOrdersTable
          orders={ordersQuery.data}
          onSelect={(order) => setSelectedId(order.id)}
        />
      )}

      <PurchaseDetailDialog
        order={selected}
        customerName={selected?.customerName}
        customerEmail={selected?.customerEmail}
        actions={
          selected ? (
            <AdminOrderActions
              orderId={selected.id}
              status={selected.status}
              canUpdateStatus={canUpdateStatus}
              canCancel={canCancel}
            />
          ) : null
        }
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
