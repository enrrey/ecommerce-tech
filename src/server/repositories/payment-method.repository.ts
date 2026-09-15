import "server-only";

import { and, desc, eq } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

import type { PaymentMethod } from "@/modules/orders/types/payment-method.types";
import { db } from "@/server/db";
import { paymentMethods } from "@/server/db/schema/payment-method";

export type SavePaymentMethodInput = InferInsertModel<typeof paymentMethods>;

/** Tarjetas del usuario: la predeterminada primero, luego la más reciente. */
export async function listPaymentMethodsByUser(
  userId: string,
): Promise<PaymentMethod[]> {
  return db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
    .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.createdAt));
}

/**
 * Alta idempotente: Stripe reenvía el mismo `checkout.session.completed` ante
 * cualquier duda de entrega y el `onConflictDoNothing` sobre el UNIQUE de
 * `stripe_payment_method_id` absorbe el duplicado sin lanzar. La comprobación
 * viaja dentro del INSERT y no en un SELECT previo: dos entregas simultáneas se
 * colarían por esa ventana.
 */
export async function savePaymentMethod(
  input: SavePaymentMethodInput,
): Promise<void> {
  await db
    .insert(paymentMethods)
    .values(input)
    .onConflictDoNothing({ target: paymentMethods.stripePaymentMethodId });
}

/**
 * Devuelve `null` en lugar de lanzar: quien llama decide si eso es un 404. No
 * filtra por usuario a propósito — la pertenencia es una regla de autorización
 * del handler, y esconderla aquí la haría invisible donde debe aplicarse.
 */
export async function findPaymentMethodById(
  id: string,
): Promise<PaymentMethod | null> {
  const [paymentMethod] = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.id, id))
    .limit(1);

  return paymentMethod ?? null;
}

export async function deletePaymentMethodById(id: string): Promise<void> {
  await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
}

/**
 * Marca una tarjeta como predeterminada y desmarca el resto del usuario. Las dos
 * sentencias van en una transacción porque entre ellas el usuario queda sin
 * ninguna: si la segunda fallara por separado, perdería la preferencia anterior
 * sin ganar la nueva.
 *
 * El desmarcado va primero: el orden inverso chocaría contra el UNIQUE parcial
 * `payment_methods_one_default_per_user`.
 *
 * `userId` acota ambos UPDATE; la pertenencia de `id` ya la verificó el handler.
 */
export async function setDefaultPaymentMethod(
  userId: string,
  id: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(paymentMethods)
      .set({ isDefault: false })
      .where(
        and(
          eq(paymentMethods.userId, userId),
          eq(paymentMethods.isDefault, true),
        ),
      );

    await tx
      .update(paymentMethods)
      .set({ isDefault: true })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)));
  });
}
