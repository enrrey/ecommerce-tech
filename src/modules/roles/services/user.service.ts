import { api } from "@/lib/axios";

import type { UserWithRoles } from "../types/user-role.types";

export async function getUsers(): Promise<UserWithRoles[]> {
  const { data } = await api.get<UserWithRoles[]>("/admin/users");

  return data;
}
