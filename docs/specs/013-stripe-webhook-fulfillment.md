---
id: 013
title: Stripe Webhook Fulfillment
status: done
module: orders
scope: client
---

# 013 — Stripe Webhook Fulfillment

## Objetivo
Un cliente que completa el pago en Stripe ve su orden como `paid` y el stock de los
productos comprados queda descontado, sin intervención manual.

## Alcance
Incluye: `POST /api/webhooks/stripe` con verificación de firma sobre raw body,
`markOrderAsPaid` idempotente + decremento de stock en una sola transacción, y la
página `/orders/[id]` reflejando el `status` real.
No incluye: reintentar cobros fallidos, reembolsos, `checkout.session.expired`,
email al cliente, `audit_logs`, panel admin de órdenes, `canceled` automático.

## Criterios de aceptación
- [x] AC1 — Dado un evento con firma inválida o header `stripe-signature` ausente,
      cuando llega a `/api/webhooks/stripe`, entonces responde 400 y no toca la BD.
- [x] AC2 — Dado `checkout.session.completed` con `payment_status !== "unpaid"` para una
      orden `pending`, entonces esa orden queda `status = 'paid'` con
      `stripe_payment_intent_id` guardado, y responde 200.
- [x] AC3 — Dado ese mismo pago, entonces el `stock` de cada producto de `order_items`
      baja exactamente su `quantity`, en la misma transacción que el cambio de estado.
- [x] AC4 — Dado el **mismo** evento reenviado por Stripe (o `completed` seguido de
      `async_payment_succeeded` para la misma sesión), entonces el stock se descuenta una
      sola vez y responde 200 sin error.
- [x] AC5 — Dado un evento de tipo no manejado (`payment_intent.succeeded`,
      `checkout.session.async_payment_failed`, …), entonces responde 200 sin efectos.
- [x] AC6 — Dado un fallo de BD (incluida la violación del check `products_stock_positive`
      por una carrera), entonces responde 5xx para que Stripe reintente; el error no se
      traga con `catch {}`.
- [x] AC7 — Dado `session.payment_status === "unpaid"` (pago asíncrono aún no acreditado),
      entonces la orden sigue `pending` y responde 200.
- [x] AC8 — Dada una orden `paid`, cuando el dueño abre `/orders/{id}`, entonces ve la
      confirmación de pago, no el aviso "esperando confirmación de Stripe".

## Datos
Sin cambios de esquema. Se usan las columnas ya existentes de 012: `orders.status`,
`orders.stripe_checkout_session_id` (unique), `orders.stripe_payment_intent_id` (unique)
y `products.stock` con su check `products_stock_positive` (`stock >= 0`).

## API
| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/webhooks/stripe` | firma `stripe-signature` (no Clerk) | raw body del evento Stripe | `200 { received: true }` |

Errores: 400 firma inválida o ausente · 500 fallo propio (vía `handleApiError`).

Sin schema Zod: `stripe.webhooks.constructEvent` verifica el HMAC y devuelve un
`Stripe.Event` tipado — es la validación de entrada de este handler, mismo criterio que
`verifyWebhook` en el webhook de Clerk. No se hace `JSON.parse` manual del body.

Ruta ya pública en `src/middleware.ts:12` (`/api/webhooks(.*)`): **no se toca**.

## Reutilizar
- `src/lib/stripe.ts` — instancia `stripe` server-only (tiene `webhooks.constructEvent`).
- `src/lib/env.ts` — `requireEnv("STRIPE_WEBHOOK_SIGNING_SECRET")` (ya en `.env.example:17`).
- `src/lib/api-errors.ts` — `handleApiError` para el catch externo.
- `src/app/api/webhooks/clerk/route.ts` — patrón exacto a copiar: try externo,
  try interno solo alrededor de la verificación, `switch` sobre `event.type` con
  `default: break`, `NextResponse.json({ received: true })`.
- `src/server/db/index.ts` — `db` con `db.transaction`.
- `src/server/repositories/order.repository.ts` — archivo destino de `markOrderAsPaid`
  (usar `attachCheckoutSessionToOrder` como referencia de estilo de UPDATE).
- `src/server/db/schema/order.ts`, `order-item.ts`, `product.ts` — tablas.
- `src/app/(storefront)/orders/[id]/page.tsx` — ya tiene `isPending`, `Badge`, `Card` y el
  bloque de aviso; solo se extiende. shadcn: nada que instalar.

## Tareas
- [x] T1 — `markOrderAsPaid(checkoutSessionId, paymentIntentId): Promise<boolean>` ·
      `src/server/repositories/order.repository.ts`. En una `db.transaction`:
      `UPDATE orders SET status='paid', stripe_payment_intent_id=$2 WHERE
      stripe_checkout_session_id=$1 AND status='pending'` con `.returning({ id })`; si no
      devuelve fila → `return false` sin más (evento duplicado o sesión desconocida). Si
      devuelve fila → leer sus `order_items` y descontar `quantity` de `products.stock`
      con `sql` (`stock = stock - $q`, filtrando `productId` no nulo), luego `true`.
      Documentar en el comentario por qué `AND status='pending'` es la idempotencia.
- [x] T2 — Route Handler `POST` · `src/app/api/webhooks/stripe/route.ts`:
      `request.headers.get("stripe-signature")` → si falta, 400 · `await request.text()`
      (raw, **nunca** `request.json()` antes de verificar) → `constructEvent` en try/catch
      propio (400 + `console.error`) → `switch`: `checkout.session.completed` y
      `checkout.session.async_payment_succeeded` llaman `markOrderAsPaid` solo si
      `session.payment_status !== "unpaid"`; `checkout.session.async_payment_failed` y
      `default` no hacen nada → 200. Catch externo: `handleApiError`.
- [x] T3 — Reflejar el estado real de la orden · `src/app/(storefront)/orders/[id]/page.tsx`:
      derivar etiqueta + variante de `Badge` + copy desde `order.status`
      (`paid` → "Pagado" / confirmación, `pending` → texto actual de espera,
      `canceled` → "Cancelado"); mostrar el aviso de espera solo si `pending`.
      Actualizar el comentario de cabecera que hoy dice que el pago nunca se confirma aquí.

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

Prueba manual sugerida (no bloqueante):
`stripe listen --forward-to localhost:3000/api/webhooks/stripe` + tarjeta `4242 4242 4242 4242`.

## Notas
- El decremento de stock puede dejar `stock` negativo → viola `products_stock_positive` →
  la transacción revienta y el handler devuelve 5xx. Es lo correcto: Stripe reintenta y la
  orden queda `pending` hasta resolverse. No capturar ese error ni hacer `Math.max(0, …)`.
- Recorrer `order_items` con un UPDATE por línea es aceptable (carritos de pocas líneas y
  todo dentro de una transacción); no montar un CTE ni un `CASE` masivo.
- `order_items.product_id` es nullable (FK `set null`): saltar esas líneas al descontar.
- `session.payment_intent` puede venir como objeto expandido o `null` según el tipo del SDK;
  normalizar a `string` antes de guardarlo, sin `as string` a ciegas si TypeScript se queja.
