"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ALL_FILTER } from "@/modules/products/constants";

import { ORDER_STATUS_FILTERS } from "../constants";
import {
  DATE_RANGE_MESSAGE,
  type MyOrdersQueryInput,
} from "../schemas/order-history.schema";
import type { AdminOrderListItem } from "../types/order.types";
import { customerFilterFn, getAdminOrderColumns } from "./admin-order-columns";
import { PurchaseDateFilter } from "./purchase-date-filter";

type AdminOrdersTableProps = {
  orders: AdminOrderListItem[];
  onSelect: (order: AdminOrderListItem) => void;
};

/** Rango invertido: se avisa y no se filtra, en vez de devolver cero filas. */
function isInvertedRange(range: MyOrdersQueryInput): boolean {
  return range.from !== undefined && range.to !== undefined && range.from > range.to;
}

function hasBounds(range: MyOrdersQueryInput): boolean {
  return range.from !== undefined || range.to !== undefined;
}

export function AdminOrdersTable({ orders, onSelect }: AdminOrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  // Arranca sin rango: el panel debe abrir mostrando todas las órdenes, y el
  // recorte por fecha lo pide el administrador cuando lo necesita.
  const [range, setRange] = useState<MyOrdersQueryInput>({});

  const columns = useMemo(() => getAdminOrderColumns(), []);

  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: customerFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const statusColumn = table.getColumn("status");
  const dateColumn = table.getColumn("createdAt");
  const filteredCount = table.getFilteredRowModel().rows.length;
  const rangeIsInverted = isInvertedRange(range);

  function handleRangeChange(next: MyOrdersQueryInput) {
    setRange(next);
    dateColumn?.setFilterValue(
      isInvertedRange(next) || !hasBounds(next) ? undefined : next,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Buscar por cliente o email…"
          aria-label="Buscar por cliente o email"
          className="lg:max-w-xs"
        />

        <Select
          // El valor sale del propio filtro de la tabla: un solo origen de
          // verdad, sin estado duplicado que pueda desincronizarse.
          value={(statusColumn?.getFilterValue() as string | undefined) ?? ALL_FILTER}
          onValueChange={(value) =>
            statusColumn?.setFilterValue(
              value === ALL_FILTER ? undefined : value,
            )
          }
        >
          <SelectTrigger className="lg:w-56" aria-label="Filtrar por estado">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUS_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PurchaseDateFilter value={range} onChange={handleRangeChange} />

      {rangeIsInverted ? (
        <p role="alert" className="text-destructive text-sm">
          {DATE_RANGE_MESSAGE}
        </p>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  Sin órdenes para los filtros aplicados
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  // Fila interactiva: abrir el detalle es la única acción de la
                  // tabla, así que no se esconde tras un menú.
                  onClick={() => onSelect(row.original)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(row.original);
                    }
                  }}
                  className="hover:bg-muted cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          {filteredCount} de {orders.length} órdenes
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <span className="text-muted-foreground text-sm">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {Math.max(table.getPageCount(), 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
