export const productKeys = {
  all: ["products"] as const,
  list: () => [...productKeys.all, "list"] as const,
  detail: (id: string) => [...productKeys.all, "detail", id] as const,
};

/** Valor centinela de los `Select` de filtro: "sin filtrar" no es un filtro. */
export const ALL_FILTER = "all";

export const PRODUCT_STATUS_FILTERS = [
  { value: ALL_FILTER, label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
] as const;

export type ProductStatusFilter =
  (typeof PRODUCT_STATUS_FILTERS)[number]["value"];

export const PRODUCT_STOCK_FILTERS = [
  { value: ALL_FILTER, label: "Cualquier stock" },
  { value: "in-stock", label: "Con stock" },
  { value: "out-of-stock", label: "Sin stock" },
] as const;

export type ProductStockFilter =
  (typeof PRODUCT_STOCK_FILTERS)[number]["value"];
