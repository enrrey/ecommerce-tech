"use client";

import { useMemo, useState } from "react";
import { ChevronRightIcon, PackageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPriceFromCents } from "@/lib/utils";

import { orderStatusPresentation } from "../constants";
import { useMyOrders } from "../hooks/use-my-orders";
import type { MyOrdersQueryInput } from "../schemas/order-history.schema";
import type { OrderWithItems } from "../types/order.types";
import { currentMonthRange, PurchaseDateFilter } from "./purchase-date-filter";
import { PurchaseDetailDialog } from "./purchase-detail-dialog";

// Instanciados una sola vez: crear un Intl.DateTimeFormat por fila es el coste
// dominante al pintar historiales largos.
const dayFormatter = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
});

type PurchaseGroup = {
  key: string;
  label: string;
  orders: OrderWithItems[];
};

/**
 * Agrupa por día en la zona del navegador: es formato de presentación, no un
 * contrato de datos, así que no viaja resuelto desde la API. El orden de los
 * grupos lo hereda del listado, que ya llega descendente por fecha.
 */
function groupByDay(orders: OrderWithItems[]): PurchaseGroup[] {
  const groups = new Map<string, PurchaseGroup>();

  for (const order of orders) {
    const date = new Date(order.createdAt);
    // La clave es la etiqueta ya formateada: misma zona y mismo calendario que
    // el encabezado, sin una segunda conversión que pueda discrepar.
    const label = dayFormatter.format(date);
    const group = groups.get(label);

    if (group) {
      group.orders.push(order);
    } else {
      groups.set(label, { key: label, label, orders: [order] });
    }
  }

  return [...groups.values()];
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-4 w-56" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

function PurchaseRow({
  order,
  onSelect,
}: {
  order: OrderWithItems;
  onSelect: () => void;
}) {
  const presentation = orderStatusPresentation(order.status);
  const unitCount = order.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="hover:bg-muted flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors"
      >
        <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
          <PackageIcon className="size-5" />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-bold">
            {order.items.map((item) => item.productName).join(", ") ||
              "Compra sin líneas"}
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {timeFormatter.format(new Date(order.createdAt))} ·{" "}
            {unitCount === 1 ? "1 artículo" : `${unitCount} artículos`}
          </span>
        </span>

        <Badge variant={presentation.variant}>{presentation.label}</Badge>

        <span className="text-sm font-extrabold tabular-nums">
          {formatPriceFromCents(order.totalCents)}
        </span>

        <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
      </button>
    </li>
  );
}

/**
 * Contenedor del historial: es el único que consulta. El filtro y el dialog son
 * presentacionales y reciben lo que necesitan por props.
 */
export function PurchaseHistory() {
  // Estado inicial calculado una sola vez: recalcularlo en cada render daría un
  // objeto nuevo por render y la clave de TanStack Query no pararía de cambiar.
  const [range, setRange] = useState<MyOrdersQueryInput>(currentMonthRange);
  const [selected, setSelected] = useState<OrderWithItems | null>(null);

  const ordersQuery = useMyOrders(range);
  const orders = ordersQuery.data;

  const groups = useMemo(() => groupByDay(orders ?? []), [orders]);

  return (
    <section className="flex flex-col gap-6">
      <PurchaseDateFilter value={range} onChange={setRange} />

      {ordersQuery.isPending ? <HistorySkeleton /> : null}

      {ordersQuery.isError ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center"
        >
          <p className="font-medium">No pudimos cargar tus compras</p>
          <p className="text-muted-foreground text-sm">
            {ordersQuery.error.message}
          </p>
          <Button variant="outline" onClick={() => ordersQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {orders && !ordersQuery.isError ? (
        groups.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
            <p>No hay compras en el periodo seleccionado.</p>
            <p className="text-sm">Prueba con otro rango de fechas.</p>
          </div>
        ) : (
          <div
            className="flex flex-col gap-8"
            // La lista conserva los resultados previos mientras recarga con otro
            // rango; el atributo lo comunica a lectores de pantalla.
            aria-busy={ordersQuery.isFetching || undefined}
          >
            {groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-3">
                <h3 className="text-muted-foreground text-sm font-semibold first-letter:uppercase">
                  {group.label}
                </h3>
                <ul className="flex flex-col gap-3">
                  {group.orders.map((order) => (
                    <PurchaseRow
                      key={order.id}
                      order={order}
                      onSelect={() => setSelected(order)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : null}

      <PurchaseDetailDialog
        order={selected}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
