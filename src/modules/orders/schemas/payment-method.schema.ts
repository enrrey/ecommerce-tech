import { z } from "zod";

/**
 * `id` de la ruta `/api/payment-methods/[id]`. Un id que no es uuid haría fallar
 * la consulta con un 500 de Postgres; como recurso, sencillamente no existe, así
 * que el handler lo traduce a 404.
 */
export const paymentMethodIdParamSchema = z.uuid();
