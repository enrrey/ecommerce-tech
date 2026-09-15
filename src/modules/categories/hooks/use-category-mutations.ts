"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { categoryKeys } from "../constants";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../schemas/category.schema";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "../services/category.service";
import type { Category } from "../types/category.types";

export type UpdateCategoryVariables = {
  id: string;
  input: UpdateCategoryInput;
};

export function useCreateCategory(): UseMutationResult<
  Category,
  Error,
  CreateCategoryInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      toast.success("Categoría creada");
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateCategory(): UseMutationResult<
  Category,
  Error,
  UpdateCategoryVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: UpdateCategoryVariables) =>
      updateCategory(id, input),
    onSuccess: async () => {
      toast.success("Categoría actualizada");
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteCategory(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      toast.success("Categoría eliminada");
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
