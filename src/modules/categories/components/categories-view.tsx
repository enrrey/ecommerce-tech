"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useCategories } from "../hooks/use-categories";
import {
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "../hooks/use-category-mutations";
import type { CreateCategoryInput } from "../schemas/category.schema";
import type { Category } from "../types/category.types";
import { CategoriesTable } from "./categories-table";
import { CategoryFormDialog } from "./category-form-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";

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

export function CategoriesView() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const categoriesQuery = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((category: Category) => {
    setEditing(category);
    setFormOpen(true);
  }, []);

  const openDelete = useCallback((category: Category) => {
    setDeleting(category);
  }, []);

  function handleSubmit(values: CreateCategoryInput) {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, input: values },
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
          Nueva categoría
        </Button>
      </div>

      {categoriesQuery.isPending ? (
        <TableSkeleton />
      ) : categoriesQuery.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No pudimos cargar las categorías</p>
          <p className="text-muted-foreground text-sm">
            {categoriesQuery.error.message}
          </p>
          <Button variant="outline" onClick={() => categoriesQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : categoriesQuery.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Todavía no hay categorías</p>
          <p className="text-muted-foreground text-sm">
            Crea la primera para empezar a clasificar productos.
          </p>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nueva categoría
          </Button>
        </div>
      ) : (
        <CategoriesTable
          categories={categoriesQuery.data}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      )}

      <CategoryFormDialog
        open={formOpen}
        category={editing}
        isPending={isSaving}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
      />

      <DeleteCategoryDialog
        open={deleting !== null}
        category={deleting}
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
