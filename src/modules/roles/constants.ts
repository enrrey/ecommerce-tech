import { ROLE_SEED } from "@/server/db/seed-data";

export const userKeys = {
  all: ["users"] as const,
  list: () => [...userKeys.all, "list"] as const,
};

/** Valor centinela de los `Select` de filtro: "sin filtrar" no es un filtro. */
export const ALL_FILTER = "all";

export const USER_STATUS_FILTERS = [
  { value: ALL_FILTER, label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
] as const;

export type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number]["value"];

/** Opciones del filtro por rol: el slug viaja como dato de tabla, no autoriza nada. */
export const ROLE_FILTER_OPTIONS = ROLE_SEED.map((role) => ({
  value: role.slug,
  label: role.name,
}));

const ROLE_NAME_BY_SLUG = new Map(ROLE_SEED.map((role) => [role.slug, role.name]));

/** Un rol creado fuera del seed no tiene nombre legible: se muestra su slug. */
export function roleLabel(slug: string): string {
  return ROLE_NAME_BY_SLUG.get(slug) ?? slug;
}
