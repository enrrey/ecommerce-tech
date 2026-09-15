"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type CatalogPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function CatalogPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: CatalogPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Con una sola página el control no aporta nada y solo ocupa sitio.
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Paginación del catálogo"
      className="flex items-center justify-center gap-3"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeftIcon />
        Anterior
      </Button>

      <span className="text-sm text-muted-foreground tabular-nums">
        Página {page} de {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
        <ChevronRightIcon />
      </Button>
    </nav>
  );
}
