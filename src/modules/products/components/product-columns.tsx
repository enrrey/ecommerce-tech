"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPriceFromCents } from "@/lib/utils";

import { ALL_FILTER, type ProductStatusFilter, type ProductStockFilter } from "../constants";
import type { ProductListItem } from "../types/product.types";

export const statusFilterFn: FilterFn<ProductListItem> = (
  row,
  columnId,
  value,
) => {
  const filter = value as Exclude<ProductStatusFilter, typeof ALL_FILTER>;

  return row.getValue<boolean>(columnId) === (filter === "active");
};

export const stockFilterFn: FilterFn<ProductListItem> = (
  row,
  columnId,
  value,
) => {
  const filter = value as Exclude<ProductStockFilter, typeof ALL_FILTER>;

  return row.getValue<number>(columnId) > 0 === (filter === "in-stock");
};

// El Select ofrece categorías por id, pero la columna muestra y ordena por
// nombre: el filtro compara contra la fila original, no contra la celda.
export const categoryFilterFn: FilterFn<ProductListItem> = (
  row,
  _columnId,
  value,
) => row.original.categoryId === (value as string);

// Un solo input para inventario: quien busca teclea "LAP-001" o "Laptop"
// indistintamente.
export const nameOrSkuFilterFn: FilterFn<ProductListItem> = (
  row,
  _columnId,
  value,
) => {
  const term = String(value).trim().toLowerCase();

  if (!term) {
    return true;
  }

  return (
    row.original.name.toLowerCase().includes(term) ||
    row.original.sku.toLowerCase().includes(term)
  );
};

type ProductColumnActions = {
  onEdit: (product: ProductListItem) => void;
  onDelete: (product: ProductListItem) => void;
};

export function getProductColumns({
  onEdit,
  onDelete,
}: ProductColumnActions): ColumnDef<ProductListItem>[] {
  return [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.sku}</span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombre
          <ArrowUpDown className="size-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "categoryName",
      header: "Categoría",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.categoryName}
        </span>
      ),
      filterFn: categoryFilterFn,
    },
    {
      accessorKey: "brand",
      header: "Marca",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {/* La columna es nullable y sin backfill: el guion marca "sin marca",
              no una marca llamada "—". */}
          {row.original.brand ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "priceCents",
      header: ({ column }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="-mr-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Precio
            <ArrowUpDown className="size-3.5" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const { priceCents, compareAtPriceCents } = row.original;
        // El listado lee la fila cruda, sin pasar por la normalización de la
        // lectura pública: un anterior que ya no supera al precio no es oferta.
        const isOnSale =
          compareAtPriceCents !== null && compareAtPriceCents > priceCents;

        return (
          <div className="text-right tabular-nums">
            {formatPriceFromCents(priceCents)}
            {isOnSale ? (
              <span className="text-muted-foreground block text-xs line-through">
                {formatPriceFromCents(compareAtPriceCents)}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "stock",
      header: "Stock",
      cell: ({ row }) => (
        <Badge
          variant={row.original.stock === 0 ? "destructive" : "secondary"}
          className="tabular-nums"
        >
          {row.original.stock === 0 ? "Sin stock" : row.original.stock}
        </Badge>
      ),
      filterFn: stockFilterFn,
    },
    {
      accessorKey: "isActive",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "outline"}>
          {row.original.isActive ? "Activo" : "Inactivo"}
        </Badge>
      ),
      filterFn: statusFilterFn,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir acciones">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => onEdit(row.original)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onDelete(row.original)}
              >
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}
