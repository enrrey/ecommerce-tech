import "server-only";

import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { ConflictError, NotFoundError } from "@/lib/api-errors";
import type {
  OrderItem,
  OrderWithItems,
} from "@/modules/orders/types/order.types";
import { db } from "@/server/db";
import { orderItems } from "@/server/db/schema/order-item";
import { orders } from "@/server/db/schema/order";
import { products } from "@/server/db/schema/product";

export type PendingOrderLineInput = {
  productId: string;
  quantity: number;
};

export type CreatePendingOrderInput = {
  /** `users.id` local, resuelto por `findActorByClerkId`. Nunca el `clerkId`. */
  userId: string;
  items: PendingOrderLineInput[];
};

/**
 * Dos líneas con el mismo `productId` esquivarían el control de stock: cada una
 * se compararía por separado contra el inventario completo. Se suman antes de
 * validar, y la orden queda con una sola línea por producto.
 */
export function mergeLines(
  items: PendingOrderLineInput[],
): Map<string, PendingOrderLineInput> {
  const merged = new Map<string, PendingOrderLineInput>();

  for (const item of items) {
    const existing = merged.get(item.productId);

    merged.set(item.productId, {
      productId: item.productId,
      quantity: (existing?.quantity ?? 0) + item.quantity,
    });
  }

  return merged;
}

/**
 * Crea la orden `pending` con sus líneas. El precio y el nombre salen siempre de
 * `products`: el cliente solo manda `productId` y `quantity`.
 *
 * Validación y escritura comparten transacción a propósito. Comprobar el stock
 * antes de abrirla dejaría una ventana entre la lectura y el INSERT en la que
 * otra petición del mismo usuario podría colarse.
 *
 * No reserva stock: el decremento ocurre al confirmarse el pago (spec 013), así
 * que la sobreventa entre crear la sesión y pagar es un riesgo aceptado
 * (`docs/stripe/checkout-integration.md` §1).
 */
export async function createPendingOrder(
  input: CreatePendingOrderInput,
): Promise<OrderWithItems> {
  const requestedLines = mergeLines(input.items);

  return db.transaction(async (tx) => {
    // Una sola consulta para todo el carrito: resolver producto a producto
    // dentro del bucle sería N+1.
    const catalogRows = await tx
      .select({
        id: products.id,
        name: products.name,
        priceCents: products.priceCents,
        stock: products.stock,
        isActive: products.isActive,
      })
      .from(products)
      .where(inArray(products.id, [...requestedLines.keys()]));

    const catalog = new Map(catalogRows.map((row) => [row.id, row]));

    const lines = [...requestedLines.values()].map((line) => {
      const product = catalog.get(line.productId);

      if (!product) {
        throw new NotFoundError("Alguno de los productos ya no existe");
      }

      // 409 y no 404: el producto existe, es su estado el que impide comprarlo.
      if (!product.isActive) {
        throw new ConflictError(`"${product.name}" ya no está disponible`);
      }

      if (product.stock < line.quantity) {
        throw new ConflictError(`No hay stock suficiente de "${product.name}"`);
      }

      return {
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity: line.quantity,
      };
    });

    // Suma de enteros: el total nunca pasa por coma flotante.
    const totalCents = lines.reduce(
      (total, line) => total + line.unitPriceCents * line.quantity,
      0,
    );

    const [order] = await tx
      .insert(orders)
      .values({ userId: input.userId, totalCents })
      .returning();

    const items = await tx
      .insert(orderItems)
      .values(lines.map((line) => ({ ...line, orderId: order.id })))
      .returning();

    return { ...order, items };
  });
}

/**
 * Enlaza la orden con la sesión de Stripe recién creada. Va después del INSERT
 * porque `success_url` necesita el `orderId`, que solo existe una vez guardada
 * la orden: no hay forma de conocer ambos identificadores a la vez.
 */
export async function attachCheckoutSessionToOrder(
  orderId: string,
  checkoutSessionId: string,
): Promise<void> {
  await db
    .update(orders)
    .set({ stripeCheckoutSessionId: checkoutSessionId })
    .where(eq(orders.id, orderId));
}

/**
 * Confirma el pago de la orden y descuenta el stock comprado, todo en una sola
 * transacción: una orden `paid` con el inventario intacto sería sobreventa.
 *
 * El `AND status = 'pending'` del UPDATE **es** la idempotencia. Stripe reenvía
 * el mismo evento ante cualquier duda de entrega, y `checkout.session.completed`
 * puede venir seguido de `async_payment_succeeded` para la misma sesión: la
 * segunda vez no hay fila que actualizar, se devuelve `false` y el stock no se
 * vuelve a descontar. La condición viaja dentro del propio UPDATE, no en un
 * SELECT previo, porque dos entregas simultáneas se colarían por esa ventana.
 *
 * Devuelve `false` también cuando la sesión no corresponde a ninguna orden
 * nuestra: para el webhook es el mismo caso, un evento sin efecto.
 *
 * Si el decremento dejara `stock` negativo salta el check
 * `products_stock_positive`, la transacción entera revierte y el error sube al
 * handler como 5xx. Es deliberado: Stripe reintenta y la orden queda `pending`
 * hasta que se resuelva, en vez de mentir sobre el inventario.
 */
export async function markOrderAsPaid(
  checkoutSessionId: string,
  paymentIntentId: string | null,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .update(orders)
      .set({ status: "paid", stripePaymentIntentId: paymentIntentId })
      .where(
        and(
          eq(orders.stripeCheckoutSessionId, checkoutSessionId),
          eq(orders.status, "pending"),
        ),
      )
      .returning({ id: orders.id });

    if (!order) {
      return false;
    }

    const lines = await tx
      .select({
        productId: orderItems.productId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    // Un UPDATE por línea: los carritos son de pocas líneas y todo ocurre
    // dentro de la transacción, así que un CTE no compraría nada.
    for (const line of lines) {
      // `product_id` es nullable (FK `set null`): la línea histórica sobrevive
      // al producto borrado del catálogo, pero ya no hay stock que descontar.
      if (!line.productId) {
        continue;
      }

      await tx
        .update(products)
        // Resta en SQL, no `stock - quantity` calculado en JS: el valor leído
        // podría estar obsoleto frente a otra compra concurrente.
        .set({ stock: sql`${products.stock} - ${line.quantity}` })
        .where(eq(products.id, line.productId));
    }

    return true;
  });
}

/**
 * Orden con sus líneas. Devuelve `null` en lugar de lanzar: quien llama decide
 * si eso es un 404 o una página de confirmación inexistente.
 *
 * No filtra por usuario a propósito: la pertenencia es una regla de
 * autorización de la vista (el panel de administración también leerá por id),
 * y esconderla aquí la haría invisible en la página que sí debe aplicarla.
 */
export async function findOrderById(
  id: string,
): Promise<OrderWithItems | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    return null;
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    // Orden estable: sin ORDER BY el listado puede reordenarse entre recargas.
    .orderBy(asc(orderItems.productName));

  return { ...order, items };
}

export type OrderHistoryRange = {
  /** `YYYY-MM-DD` inclusive. */
  from?: string;
  /** `YYYY-MM-DD` inclusive: se traduce a `< día siguiente`. */
  to?: string;
};

/** `2026-09-09` → `2026-09-10T00:00:00.000Z`, el límite abierto del rango. */
export function startOfNextDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString();
}

/**
 * Historial de compras de un usuario. `to` se compara contra el arranque del día
 * siguiente en lugar de `<= to`: con `timestamptz`, `<= '2026-09-09'` equivale a
 * `<= 2026-09-09T00:00:00Z` y dejaría fuera todo lo comprado ese mismo día.
 *
 * Sin `limit`: el recorte lo hace el rango de fechas (spec 014, "Notas").
 */
export async function listOrdersByUser(
  userId: string,
  range: OrderHistoryRange = {},
): Promise<OrderWithItems[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        range.from
          ? gte(orders.createdAt, `${range.from}T00:00:00.000Z`)
          : undefined,
        range.to ? lt(orders.createdAt, startOfNextDay(range.to)) : undefined,
      ),
    )
    .orderBy(desc(orders.createdAt));

  if (rows.length === 0) {
    return [];
  }

  // Una sola consulta para todas las líneas: un SELECT por orden sería N+1.
  const lines = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((order) => order.id),
      ),
    )
    .orderBy(asc(orderItems.productName));

  const linesByOrder = new Map<string, OrderItem[]>();

  for (const line of lines) {
    const bucket = linesByOrder.get(line.orderId);

    if (bucket) {
      bucket.push(line);
    } else {
      linesByOrder.set(line.orderId, [line]);
    }
  }

  return rows.map((order) => ({
    ...order,
    items: linesByOrder.get(order.id) ?? [],
  }));
}
