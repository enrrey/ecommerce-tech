---
id: 016
title: Tarjeta guardada en checkout
status: done
module: orders
scope: client
---

# 016 — Tarjeta guardada en checkout

## Objetivo
Un cliente autenticado ve sus tarjetas guardadas encima del botón "Pagar" de `/checkout`,
marca una como predeterminada, y esa tarjeta está lista para un clic en Stripe.

## Alcance
Incluye: sección de tarjetas guardadas en `/checkout` sobre el botón "Pagar" · marcar
predeterminada (persistida) · badge "Predeterminada" en `/profile` · `POST /api/checkout/session`
pasa `customer` para que Checkout muestre esas tarjetas.
No incluye: cobro off-session con PaymentIntents o Payment Element propios — añade superficie
PCI, 3DS/SCA manual y reintentos de `requires_action`, y reescribe 012 sin necesidad.
No incluye: `payment_method_save` ni `payment_method_remove` en la sesión — quedan **disabled**:
el webhook de 015 solo persiste `mode: "setup"` y activarlas desincronizaría `payment_methods`.
Alta y baja siguen en `/profile`. Tampoco: checkout de invitado, wallets, `audit_logs`.

## Criterios de aceptación
- [ ] AC1 — Dado un usuario sin tarjetas guardadas, cuando abre `/checkout`, entonces ve la
      misma vista que hoy (sin sección extra) y el pago de 012 no cambia.
- [ ] AC2 — Dado un usuario con 1+ tarjetas, entonces sobre el botón "Pagar" ve cada una con
      marca, `•••• last4` y `MM/AAAA`; skeleton en carga y sección oculta si la query falla.
- [ ] AC3 — Dado que pulsa una tarjeta no predeterminada, entonces queda marcada como
      predeterminada y ninguna otra suya conserva la marca.
- [ ] AC4 — Dado que pulsa "Pagar", entonces la sesión se crea con el `customer` del actor y
      en `checkout.stripe.com` aparecen sus tarjetas para pagar con un clic.
- [ ] AC5 — Dado un `paymentMethodId`, `customerId` o `userId` inyectado en el body de
      `/api/checkout/session`, entonces se ignora: el Customer sale siempre de
      `getOrCreateStripeCustomer(actor.id)`.
- [ ] AC6 — Dado `PATCH /api/payment-methods/{id}/default` sobre una tarjeta ajena o
      inexistente, entonces 404; sin sesión, 401 (mismo criterio que AC8/AC9 de 015).
- [ ] AC7 — Dado que elimina desde `/profile` la tarjeta predeterminada, entonces el borrado
      funciona igual que en 015 y el usuario queda sin predeterminada, sin fila huérfana.
- [ ] AC8 — Dado el flujo completo, entonces la orden sigue creándose `pending` y el webhook
      de 013 la marca `paid`: 012 y 013 no se tocan.

## Datos
Requiere migración (`npm run db:generate` + `npm run db:migrate`).

`payment_methods`: **nueva columna** `is_default` boolean NOT NULL default `false` + unique
**parcial** `payment_methods_one_default_per_user` sobre `user_id` filtrado por `is_default`:
la base garantiza una predeterminada por usuario como máximo, no el código. Corregir el
comentario "la fila se crea y se borra, nunca se edita" (sin añadir `updated_at`: nadie lo
consume). Sin backfill: las tarjetas de 015 arrancan sin predeterminada.

**Descartado** `customer.invoice_settings.default_payment_method`: en `mode: "payment"` Checkout
prefilla **la más reciente** y ese campo solo pesa en `mode: "subscription"` — costaría un
`customers.retrieve` por listado y un mapeo `pm_…`→fila sin ningún efecto en el cobro.

## API
| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| PATCH | `/api/payment-methods/[id]/default` | `requireAuth()` + `findActorByClerkId` | — | `200 { updated: true }` |
| POST | `/api/checkout/session` | idem (**modificado**) | igual que 012 | igual que 012 |

Zod: se reutiliza `paymentMethodIdParamSchema` (`z.uuid()`) sobre el `id` de la ruta; si no
cuadra, 404. El PATCH no lleva body. `createCheckoutSessionSchema` no cambia.

`sessions.create` de 012 suma dos campos: `customer: await getOrCreateStripeCustomer(actor.id)`
y `saved_payment_method_options.allow_redisplay_filters = ["always","limited","unspecified"]`
— Stripe solo muestra por defecto las de `allow_redisplay: "always"` y el default del campo es
`"unspecified"`: sin el filtro, una tarjeta de 015 podría no aparecer. El consentimiento se
recogió al guardarla ("Agregar tarjeta" en `/profile`).

## Reutilizar
- `src/server/services/stripe-customer.service.ts` — `getOrCreateStripeCustomer(actorId)`.
- `src/app/api/payment-methods/[id]/route.ts` — patrón exacto de 404 por pertenencia.
- `src/modules/orders/schemas/payment-method.schema.ts` — `paymentMethodIdParamSchema`.
- `src/modules/orders/constants.ts` — `paymentMethodKeys`, `cardBrandLabel`.
- `src/modules/orders/hooks/use-payment-methods.ts` — `usePaymentMethods()` tal cual.
- `src/modules/orders/hooks/use-payment-method-mutations.ts` y `services/payment-method.service.ts`
  — destino del hook y el service nuevos; patrón `useMutation` + invalidar `paymentMethodKeys`.
- `src/modules/orders/components/saved-cards.tsx` — `CardRow`, `formatExpiry` (se extrae).
- `src/modules/orders/components/checkout-summary.tsx` — punto de montaje sobre "Pagar".
- `src/lib/api-errors.ts` (`handleApiError`, `NotFoundError`) · `src/lib/auth.ts`
  (`requireAuth`) · `src/server/db/index.ts` (`db.transaction`).
- shadcn: `badge`, `skeleton`, `button` ya instalados. Nada que instalar.

## Tareas
- [x] T1 — Columna `isDefault` + unique parcial + comentario · `src/server/db/schema/payment-method.ts`
- [x] T2 — Generar y aplicar migración · `npm run db:generate && npm run db:migrate`
- [x] T3 — `setDefaultPaymentMethod(userId, id)` en `db.transaction` (UPDATE a `false` de las
      del usuario, luego `true` de la elegida) y listado ordenado por `isDefault desc,
      createdAt desc` · `src/server/repositories/payment-method.repository.ts`
- [x] T4 — `PATCH` · `src/app/api/payment-methods/[id]/default/route.ts`: actor →
      `findPaymentMethodById` → 404 si no existe o `userId !== actor.id` → T3
- [x] T5 — Añadir `customer` + `saved_payment_method_options` a `sessions.create` ·
      `src/app/api/checkout/session/route.ts`
- [x] T6 — `setDefaultPaymentMethod(id)` con axios · `src/modules/orders/services/payment-method.service.ts`
- [x] T7 — `useSetDefaultPaymentMethod()` · `src/modules/orders/hooks/use-payment-method-mutations.ts`
- [x] T8 — Extraer `formatCardExpiry(card)` junto a `cardBrandLabel` ·
      `src/modules/orders/constants.ts` (y consumirlo en `saved-cards.tsx`)
- [x] T9 — `CheckoutSavedCards` (`"use client"`) ·
      `src/modules/orders/components/checkout-saved-cards.tsx`: lista seleccionable
      (`role="radiogroup"`), badge "Predeterminada", skeleton, `null` si vacío o error
- [x] T10 — Montarlo sobre el botón "Pagar" · `src/modules/orders/components/checkout-summary.tsx`
- [x] T11 — Badge "Predeterminada" + acción "Hacer predeterminada" · `src/modules/orders/components/saved-cards.tsx`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- **Stripe no preselecciona la predeterminada.** En `mode: "payment"` prefilla la más reciente
  y no hay parámetro para forzar otra (`sessions.create` no acepta `payment_method`). Con
  `customer` las ve todas y elige con un clic: el copy lo dice así ("Podrás confirmarla o
  cambiarla en Stripe"). Forzarla degradando las demás a `allow_redisplay: "limited"` se
  descarta: escondería tarjetas legítimas al pagar.
- El prefill de Stripe caduca a los 30 min de creada la sesión: una pestaña vieja vuelve a
  pedir la tarjeta. No es un bug nuestro.
- Pasar `customer` siempre crea el Customer en el primer pago de quien nunca guardó tarjeta
  (antes solo pasaba desde `/profile`). Es deseable: liga las órdenes al Customer.
- Borrar la predeterminada no deja referencia colgando: el flag muere con la fila — la ventaja
  concreta de la columna local frente a guardar un `pm_…` aparte.
