"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { userKeys } from "../constants";
import { getUsers } from "../services/user.service";
import type { UserWithRoles } from "../types/user-role.types";

export function useUsers(): UseQueryResult<UserWithRoles[], Error> {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: getUsers,
  });
}
