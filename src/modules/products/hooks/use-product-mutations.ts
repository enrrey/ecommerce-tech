"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { productKeys } from "../constants";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "../schemas/product.schema";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "../services/product.service";
import type { Product } from "../types/product.types";

export type UpdateProductVariables = {
  id: string;
  input: UpdateProductInput;
};

export function useCreateProduct(): UseMutationResult<
  Product,
  Error,
  CreateProductInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      toast.success("Producto creado");
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateProduct(): UseMutationResult<
  Product,
  Error,
  UpdateProductVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: UpdateProductVariables) =>
      updateProduct(id, input),
    onSuccess: async () => {
      toast.success("Producto actualizado");
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteProduct(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      toast.success("Producto eliminado");
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
