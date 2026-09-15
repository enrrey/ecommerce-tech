"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";

import {
  createCategorySchema,
  type CategoryFormValues,
  type CreateCategoryInput,
} from "../schemas/category.schema";
import type { Category } from "../types/category.types";

const EMPTY_FORM: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  isActive: true,
};

function toFormValues(category: Category | null): CategoryFormValues {
  if (!category) {
    return EMPTY_FORM;
  }

  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    isActive: category.isActive,
  };
}

type CategoryFormDialogProps = {
  open: boolean;
  category: Category | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateCategoryInput) => void;
};

export function CategoryFormDialog({
  open,
  category,
  isPending,
  onOpenChange,
  onSubmit,
}: CategoryFormDialogProps) {
  const isEditing = category !== null;

  const form = useForm<CategoryFormValues, unknown, CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: EMPTY_FORM,
  });

  const { control, formState, handleSubmit, register, reset, setValue } = form;

  useEffect(() => {
    if (open) {
      reset(toFormValues(category));
    }
  }, [open, category, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos de la categoría."
              : "Crea una categoría para organizar el catálogo."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="category-form"
          className="py-2"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <FieldGroup>
            <Field data-invalid={Boolean(formState.errors.name)}>
              <FieldLabel htmlFor="category-name">Nombre</FieldLabel>
              <Input
                id="category-name"
                placeholder="Laptops"
                aria-invalid={Boolean(formState.errors.name)}
                {...register("name", {
                  // El slug solo se sugiere al crear: regenerarlo al renombrar
                  // rompería URLs públicas ya indexadas.
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                    if (!isEditing) {
                      setValue("slug", slugify(event.target.value), {
                        shouldValidate: formState.isSubmitted,
                      });
                    }
                  },
                })}
              />
              <FieldError errors={[formState.errors.name]} />
            </Field>

            <Field data-invalid={Boolean(formState.errors.slug)}>
              <FieldLabel htmlFor="category-slug">Slug</FieldLabel>
              <Input
                id="category-slug"
                placeholder="laptops"
                aria-invalid={Boolean(formState.errors.slug)}
                {...register("slug")}
              />
              <FieldDescription>
                Identificador de la URL pública. Solo minúsculas, números y
                guiones.
              </FieldDescription>
              <FieldError errors={[formState.errors.slug]} />
            </Field>

            <Field data-invalid={Boolean(formState.errors.description)}>
              <FieldLabel htmlFor="category-description">
                Descripción
              </FieldLabel>
              <Textarea
                id="category-description"
                rows={3}
                placeholder="Opcional. Máximo 500 caracteres."
                aria-invalid={Boolean(formState.errors.description)}
                {...register("description")}
              />
              <FieldError errors={[formState.errors.description]} />
            </Field>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Activa</FieldTitle>
                <FieldDescription>
                  Las categorías inactivas no se muestran en la tienda.
                </FieldDescription>
              </FieldContent>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    id="category-is-active"
                    aria-label="Categoría activa"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" form="category-form" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
