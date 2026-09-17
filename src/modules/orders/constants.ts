import type { ComponentProps } from "react";
import { CheckCircle2Icon, ClockIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Badge } from "@/components/ui/badge";
import { ALL_FILTER } from "@/modules/products/constants";

import type { MyOrdersQueryInput } from "./schemas/order-history.schema";

export const orderKeys = {
  all: ["orders"] as const,
  mine: (query: MyOrdersQueryInput) =>
    [...orderKeys.all, "mine", query] as const,
  receipt: (id: string) => [...orderKeys.all, "receipt", id] as const,
};

/**
 * Clave propia y no una rama de `orderKeys`: el listado del panel y el
 * historial del cliente son datos distintos y no deben invalidarse juntos.
 */
export const adminOrderKeys = {
  all: ["admin-orders"] as const,
  list: () => [...adminOrderKeys.all, "list"] as const,
};

export const paymentMethodKeys = {
  all: ["payment-methods"] as const,
  mine: () => [...paymentMethodKeys.all, "mine"] as const,
};

/**
 * `card.brand` de Stripe → nombre presentable. Stripe añade marcas sin avisar,
 * así que una desconocida se muestra cruda antes que romper la fila.
 */
export const CARD_BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
  cartes_bancaires: "Cartes Bancaires",
  eftpos_au: "Eftpos Australia",
  link: "Link",
  unknown: "Tarjeta",
};

export function cardBrandLabel(brand: string): string {
  return CARD_BRAND_LABEL[brand] ?? brand;
}

/** `3/2029` → `03/2029`: el vencimiento se lee siempre con dos dígitos de mes. */
export function formatCardExpiry(card: {
  expMonth: number;
  expYear: number;
}): string {
  return `${String(card.expMonth).padStart(2, "0")}/${card.expYear}`;
}

export type OrderStatusPresentation = {
  label: string;
  variant: ComponentProps<typeof Badge>["variant"];
  /** Ausente cuando el estado no necesita explicarse más allá de la etiqueta. */
  notice?: { Icon: LucideIcon; text: string };
};

export const ORDER_STATUS_PRESENTATION: Record<
  string,
  OrderStatusPresentation
> = {
  pending: {
    label: "Pendiente de pago",
    variant: "secondary",
    notice: {
      Icon: ClockIcon,
      text: "Estamos esperando la confirmación de Stripe. Si ya completaste el pago, el estado se actualizará en cuanto la recibamos.",
    },
  },
  paid: {
    label: "Pagado",
    variant: "default",
    notice: {
      Icon: CheckCircle2Icon,
      text: "Pago confirmado. Ya estamos preparando tu pedido.",
    },
  },
  canceled: { label: "Cancelado", variant: "destructive" },
};

/**
 * Opciones del Select de estado del panel, derivadas de la presentación: añadir
 * un estado con copy lo pone en el filtro sin tocar esta lista.
 */
export const ORDER_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: ALL_FILTER, label: "Todos" },
  ...Object.entries(ORDER_STATUS_PRESENTATION).map(([value, { label }]) => ({
    value,
    label,
  })),
];

/**
 * `orders.status` es varchar, no enum: un estado futuro que aún no tenga copy se
 * muestra crudo antes que romper la vista.
 */
export function orderStatusPresentation(
  status: string,
): OrderStatusPresentation {
  return (
    ORDER_STATUS_PRESENTATION[status] ?? { label: status, variant: "outline" }
  );
}
