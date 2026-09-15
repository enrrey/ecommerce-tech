"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useCreateProduct,
  useDeleteProduct,
  useUpdateProduct,
} from "../hooks/use-product-mutations";
import { useProducts } from "../hooks/use-products";
import type { CreateProductInput } from "../schemas/product.schema";
import type { ProductListItem } from "../types/product.types";
import { DeleteProductDialog } from "./delete-product-dialog";
import { ProductFormDialog } from "./product-form-dialog";
import { ProductsTable } from "./products-table";

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

export function ProductsView() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [deleting, setDeleting] = useState<ProductListItem | null>(null);

  const productsQuery = useProducts();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((product: ProductListItem) => {
    setEditing(product);
    setFormOpen(true);
  }, []);

  const openDelete = useCallback((product: ProductListItem) => {
    setDeleting(product);
  }, []);

  function handleSubmit(values: CreateProductInput) {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, input: values },
        // El diálogo solo se cierra si la API respondió: un 409 de SKU debe
        // dejar el formulario abierto con lo escrito.
        { onSuccess: () => setFormOpen(false) },
      );

      return;
    }

    createMutation.mutate(values, { onSuccess: () => setFormOpen(false) });
  }

  function handleDelete() {
    if (!deleting) {
      return;
    }

    deleteMutation.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nuevo producto
        </Button>
      </div>

      {productsQuery.isPending ? (
        <TableSkeleton />
      ) : productsQuery.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No pudimos cargar los productos</p>
          <p className="text-muted-foreground text-sm">
            {productsQuery.error.message}
          </p>
          <Button variant="outline" onClick={() => productsQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : productsQuery.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Todavía no hay productos</p>
          <p className="text-muted-foreground text-sm">
            Crea el primero para empezar a poblar el catálogo.
          </p>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nuevo producto
          </Button>
        </div>
      ) : (
        <ProductsTable
          products={productsQuery.data}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      )}

      <ProductFormDialog
        open={formOpen}
        product={editing}
        isPending={isSaving}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
      />

      <DeleteProductDialog
        open={deleting !== null}
        product={deleting}
        isPending={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
