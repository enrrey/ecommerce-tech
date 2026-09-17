"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { formatPriceFromCents } from "@/lib/utils";

import { orderStatusPresentation } from "../constants";
import {
  isWithinRange,
  matchesCustomer,
  matchesStatus,
} from "../lib/admin-order-filters";
import type { MyOrdersQueryInput } from "../schemas/order-history.schema";
import type { AdminOrderListItem } from "../types/order.types";

// Instanciado una sola vez: crear un Intl.DateTimeFormat por fila es el coste
// dominante al pintar listados largos.
const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// La búsqueda es global (nombre + email) y los otros dos son filtros de
// columna: TanStack los combina en AND sin trabajo extra.
export const customerFilterFn: FilterFn<AdminOrderListItem> = (
  row,
  _columnId,
  value,
) => matchesCustomer(row.original, String(value));

export const statusFilterFn: FilterFn<AdminOrderListItem> = (
  row,
  _columnId,
  value,
) => matchesStatus(row.original, String(value));

export const dateRangeFilterFn: FilterFn<AdminOrderListItem> = (
  row,
  _columnId,
  value,
) => isWithinRange(row.original, value as MyOrdersQueryInput);

export function getAdminOrderColumns(): ColumnDef<AdminOrderListItem>[] {
  return [
    {
      accessorKey: "id",
      header: "Orden",
      cell: ({ row }) => (
        // Los primeros caracteres del uuid bastan para reconocer la fila; el id
        // completo vive en el detalle.
        <span className="font-mono text-xs">
          {row.original.id.slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Cliente",
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">
            {row.original.customerName}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {row.original.customerEmail}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {dateFormatter.format(new Date(row.original.createdAt))}
        </span>
      ),
      filterFn: dateRangeFilterFn,
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const presentation = orderStatusPresentation(row.original.status);

        return <Badge variant={presentation.variant}>{presentation.label}</Badge>;
      },
      filterFn: statusFilterFn,
    },
    {
      accessorKey: "totalCents",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => (
        <div className="text-right font-semibold tabular-nums">
          {formatPriceFromCents(row.original.totalCents)}
        </div>
      ),
    },
  ];
}
