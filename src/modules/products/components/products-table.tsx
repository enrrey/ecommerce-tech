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

import {
  ALL_FILTER,
  PRODUCT_STATUS_FILTERS,
  PRODUCT_STOCK_FILTERS,
} from "../constants";
import type { ProductListItem } from "../types/product.types";
import { getProductColumns, nameOrSkuFilterFn } from "./product-columns";

type ProductsTableProps = {
  products: ProductListItem[];
  onEdit: (product: ProductListItem) => void;
  onDelete: (product: ProductListItem) => void;
};

type CategoryOption = { id: string; name: string };

function toCategoryOptions(products: ProductListItem[]): CategoryOption[] {
  const byId = new Map<string, string>();

  for (const product of products) {
    byId.set(product.categoryId, product.categoryName);
  }

  return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function ProductsTable({
  products,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(
    () => getProductColumns({ onEdit, onDelete }),
    [onEdit, onDelete],
  );

  const categoryOptions = useMemo(
    () => toCategoryOptions(products),
    [products],
  );

  const table = useReactTable({
    data: products,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    // La búsqueda es global (nombre + SKU); los tres Select son filtros de
    // columna. TanStack los combina en AND sin trabajo extra.
    globalFilterFn: nameOrSkuFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const categoryColumn = table.getColumn("categoryName");
  const statusColumn = table.getColumn("isActive");
  const stockColumn = table.getColumn("stock");
  const filteredCount = table.getFilteredRowModel().rows.length;

  // El valor del Select se lee del propio filtro de la tabla: un solo origen de
  // verdad, sin estado duplicado que pueda desincronizarse.
  function filterValueOf(value: unknown): string {
    return (value as string | undefined) ?? ALL_FILTER;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Buscar por nombre o SKU…"
          aria-label="Buscar por nombre o SKU"
          className="lg:max-w-xs"
        />

        <Select
          value={filterValueOf(categoryColumn?.getFilterValue())}
          onValueChange={(value) =>
            categoryColumn?.setFilterValue(
              value === ALL_FILTER ? undefined : value,
            )
          }
        >
          <SelectTrigger className="lg:w-48" aria-label="Filtrar por categoría">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>Todas las categorías</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterValueOf(statusColumn?.getFilterValue())}
          onValueChange={(value) =>
            statusColumn?.setFilterValue(
              value === ALL_FILTER ? undefined : value,
            )
          }
        >
          <SelectTrigger className="lg:w-40" aria-label="Filtrar por estado">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_STATUS_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterValueOf(stockColumn?.getFilterValue())}
          onValueChange={(value) =>
            stockColumn?.setFilterValue(value === ALL_FILTER ? undefined : value)
          }
        >
          <SelectTrigger className="lg:w-44" aria-label="Filtrar por stock">
            <SelectValue placeholder="Stock" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_STOCK_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                  className="h-24 text-center text-muted-foreground"
                >
                  Sin resultados para la búsqueda
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
        <p className="text-sm text-muted-foreground">
          {filteredCount} de {products.length} productos
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
          <span className="text-sm text-muted-foreground">
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
