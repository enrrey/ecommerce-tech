import { z } from "zod";

export const DATE_RANGE_MESSAGE =
  "La fecha inicial no puede ser posterior a la final";

/**
 * `?from=` presente y vacío significa "sin filtro", no "fecha vacía": el input
 * de tipo date manda cadena vacía mientras el usuario no elige día.
 */
function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const isoDay = (label: string) =>
  z.preprocess(
    emptyToUndefined,
    z.iso.date(`La fecha ${label} debe tener formato YYYY-MM-DD`).optional(),
  );

/**
 * Ambos extremos opcionales: sin ellos el historial no filtra por fecha. El
 * preset "mes actual" lo calcula el cliente (locale del navegador) y viaja
 * explícito, así que el servidor no tiene que adivinar ninguna zona horaria.
 */
export const myOrdersQuerySchema = z
  .object({
    from: isoDay("inicial"),
    to: isoDay("final"),
  })
  // Un rango invertido es una URL mal formada, no un resultado vacío.
  .refine(
    (value) =>
      value.from === undefined ||
      value.to === undefined ||
      value.from <= value.to,
    { message: DATE_RANGE_MESSAGE, path: ["from"] },
  );

/** Rango tal y como lo escribe el cliente, con ambos extremos opcionales. */
export type MyOrdersQueryInput = {
  from?: string;
  to?: string;
};
