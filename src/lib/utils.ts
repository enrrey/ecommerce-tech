import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { CURRENCY, CURRENCY_LOCALE } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    // NFD separa la letra base de su diacrítico; ̀-ͯ borra solo el diacrítico.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Se construye una sola vez: instanciar Intl.NumberFormat por celda de la tabla
// es el coste dominante al formatear listados largos.
const priceFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Los precios se almacenan en centavos enteros; la vista es la única que divide. */
export function formatPriceFromCents(cents: number): string {
  return priceFormatter.format(cents / 100)
}
