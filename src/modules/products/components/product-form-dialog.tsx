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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import { useCategories } from "@/modules/categories/hooks/use-categories";

import {
  createProductSchema,
  type CreateProductInput,
  type ProductFormValues,
} from "../schemas/product.schema";
import type { Product } from "../types/product.types";

const EMPTY_FORM: ProductFormValues = {
  categoryId: "",
  sku: "",
  name: "",
  slug: "",
  brand: "",
  description: "",
  priceCents: "",
  compareAtPriceCents: "",
  stock: 0,
  imageUrl: "",
  isActive: true,
};

function toFormValues(product: Product | null): ProductFormValues {
  if (!product) {
    return EMPTY_FORM;
  }

  return {
    categoryId: product.categoryId,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    brand: product.brand ?? "",
    description: product.description ?? "",
    // El dominio guarda centavos; el formulario edita unidades monetarias.
    priceCents: (product.priceCents / 100).toFixed(2),
    // "" y no null: el input queda controlado y vaciarlo guarda `null`.
    compareAtPriceCents:
      product.compareAtPriceCents === null
        ? ""
        : (product.compareAtPriceCents / 100).toFixed(2),
    stock: product.stock,
    imageUrl: product.imageUrl ?? "",
    isActive: product.isActive,
  };
}

type ProductFormDialogProps = {
  open: boolean;
  product: Product | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateProductInput) => void;
};

export function ProductFormDialog({
  open,
  product,
  isPending,
  onOpenChange,
  onSubmit,
}: ProductFormDialogProps) {
  const isEditing = product !== null;
  const categoriesQuery = useCategories();

  const form = useForm<ProductFormValues, unknown, CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: EMPTY_FORM,
  });

  const { control, formState, handleSubmit, register, reset, setValue } = form;

  useEffect(() => {
    if (open) {
      reset(toFormValues(product));
    }
  }, [open, product, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos del producto."
              : "Registra un producto en el catálogo."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="product-form"
          className="max-h-[65vh] overflow-y-auto py-2"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <FieldGroup>
            <Field data-invalid={Boolean(formState.errors.sku)}>
              <FieldLabel htmlFor="product-sku">SKU</FieldLabel>
              <Input
                id="product-sku"
                placeholder="LAP-001"
                aria-invalid={Boolean(formState.errors.sku)}
                {...register("sku")}
              />
              <FieldDescription>
                Identificador de inventario. Mayúsculas, números y guiones.
              </FieldDescription>
              <FieldError errors={[formState.errors.sku]} />
            </Field>

            <Field data-invalid={Boolean(formState.errors.name)}>
              <FieldLabel htmlFor="product-name">Nombre</FieldLabel>
              <Input
                id="product-name"
                placeholder="Laptop X14"
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
              <FieldLabel htmlFor="product-slug">Slug</FieldLabel>
              <Input
                id="product-slug"
                placeholder="laptop-x14"
                aria-invalid={Boolean(formState.errors.slug)}
                {...register("slug")}
              />
              <FieldDescription>
                Identificador de la URL pública. Solo minúsculas, números y
                guiones.
              </FieldDescription>
              <FieldError errors={[formState.errors.slug]} />
            </Field>

            <Field data-invalid={Boolean(formState.errors.categoryId)}>
              <FieldLabel htmlFor="product-category">Categoría</FieldLabel>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={categoriesQuery.isPending}
                  >
                    <SelectTrigger
                      id="product-category"
                      className="w-full"
                      aria-invalid={Boolean(formState.errors.categoryId)}
                      onBlur={field.onBlur}
                    >
                      <SelectValue
                        placeholder={
                          categoriesQuery.isPending
                            ? "Cargando categorías…"
                            : "Selecciona una categoría"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesQuery.data?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {categoriesQuery.isError ? (
                <FieldDescription>
                  No pudimos cargar las categorías: {categoriesQuery.error.message}
                </FieldDescription>
              ) : null}
              <FieldError errors={[formState.errors.categoryId]} />
            </Field>

            <Field data-invalid={Boolean(formState.errors.brand)}>
              <FieldLabel htmlFor="product-brand">Marca</FieldLabel>
              <Input
                id="product-brand"
                placeholder="Dell"
                aria-invalid={Boolean(formState.errors.brand)}
                {...register("brand")}
              />
              <FieldDescription>
                Opcional. Alimenta el filtro de marca del catálogo público.
              </FieldDescription>
              <FieldError errors={[formState.errors.brand]} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={Boolean(formState.errors.priceCents)}>
                <FieldLabel htmlFor="product-price">Precio</FieldLabel>
                <Input
                  id="product-price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="1299.90"
                  aria-invalid={Boolean(formState.errors.priceCents)}
                  {...register("priceCents")}
                />
                <FieldDescription>
                  En unidades monetarias, con un máximo de 2 decimales.
                </FieldDescription>
                <FieldError errors={[formState.errors.priceCents]} />
              </Field>

              <Field
                data-invalid={Boolean(formState.errors.compareAtPriceCents)}
              >
                <FieldLabel htmlFor="product-compare-at-price">
                  Precio anterior (S/)
                </FieldLabel>
                <Input
                  id="product-compare-at-price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="1599.90"
                  aria-invalid={Boolean(formState.errors.compareAtPriceCents)}
                  {...register("compareAtPriceCents")}
                />
                <FieldDescription>
                  Opcional. Debe superar al precio; vacío = sin oferta.
                </FieldDescription>
                <FieldError errors={[formState.errors.compareAtPriceCents]} />
              </Field>
            </div>

            <Field data-invalid={Boolean(formState.errors.stock)}>
              <FieldLabel htmlFor="product-stock">Stock</FieldLabel>
              <Input
                id="product-stock"
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                placeholder="5"
                aria-invalid={Boolean(formState.errors.stock)}
                {...register("stock")}
              />
              <FieldError errors={[formState.errors.stock]} />
            </Field>

            <Field data-invalid={Boolean(formState.errors.description)}>
              <FieldLabel htmlFor="product-description">Descripción</FieldLabel>
              <Textarea
                id="product-description"
                rows={4}
                placeholder="Opcional. Máximo 2000 caracteres."
                aria-invalid={Boolean(formState.errors.description)}
                {...register("description")}
              />
              <FieldError errors={[formState.errors.description]} />
            </Field>

            <Field data-invalid={Boolean(formState.errors.imageUrl)}>
              <FieldLabel htmlFor="product-image-url">
                URL de la imagen
              </FieldLabel>
              <Input
                id="product-image-url"
                type="url"
                placeholder="https://…"
                aria-invalid={Boolean(formState.errors.imageUrl)}
                {...register("imageUrl")}
              />
              <FieldDescription>
                Opcional. Imagen principal del producto.
              </FieldDescription>
              <FieldError errors={[formState.errors.imageUrl]} />
            </Field>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Activo</FieldTitle>
                <FieldDescription>
                  Los productos inactivos no se muestran en la tienda.
                </FieldDescription>
              </FieldContent>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    id="product-is-active"
                    aria-label="Producto activo"
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
          <Button type="submit" form="product-form" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
