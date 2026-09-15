---
id: 015
title: Profile — Mis tarjetas
status: done
module: orders
scope: client
---

# 015 — Profile — Mis tarjetas

## Objetivo
Un cliente autenticado puede guardar una tarjeta desde `/profile` mediante un enlace de
Stripe, verla listada con marca, últimos 4 dígitos y vencimiento, y eliminarla.

## Alcance
Incluye: tab "Mis tarjetas" en `/profile`, columna `users.stripe_customer_id`, tabla
`payment_methods`, alta vía Checkout Session `mode: "setup"`, persistencia desde el webhook
013, listado, borrado (con `detach` en Stripe).
No incluye: **usar la tarjeta guardada al pagar** — 012 sigue con `price_data` inline y sin
selector; cobrar off-session exige `payment_intents` propios, 3DS de reintento y un cambio de
contrato en `/api/checkout/session`: es un spec aparte, no un añadido trivial.
No incluye: tarjeta por defecto, renombrar/editar tarjetas, wallets más allá de lo que
Checkout ya resuelve solo, vista de admin, `audit_logs`.

## Criterios de aceptación
- [x] AC1 — Dado un usuario autenticado en `/profile`, cuando abre el tab "Mis tarjetas" y
      pulsa "Agregar tarjeta", entonces termina en `checkout.stripe.com` en modo `setup`.
- [x] AC2 — Dado ese usuario sin `stripe_customer_id`, entonces se crea el Customer en Stripe
      y se persiste en `users.stripe_customer_id` antes de crear la sesión; en un segundo
      intento se reutiliza el mismo Customer (no se crea otro).
- [x] AC3 — Dado que completa el formulario en Stripe, cuando llega
      `checkout.session.completed` con `mode === "setup"`, entonces existe una fila en
      `payment_methods` con `stripe_payment_method_id`, `brand`, `last4`, `exp_month`,
      `exp_year` ligada a ese usuario.
- [x] AC4 — Dado el mismo evento reenviado por Stripe, entonces no se duplica la fila y
      responde 200.
- [x] AC5 — Dados los eventos de pago de 013 (`mode: "payment"`), entonces siguen marcando la
      orden como `paid` exactamente igual: la extensión del webhook no los altera.
- [x] AC6 — Dado un usuario con tarjetas, cuando abre el tab, entonces ve marca, `•••• last4`
      y `MM/AAAA`; con skeletons durante la carga, mensaje con reintento ante error y estado
      vacío si no tiene ninguna.
- [x] AC7 — Dado que pulsa "Eliminar" y confirma, entonces la tarjeta se desvincula en Stripe
      (`paymentMethods.detach`), desaparece de la lista y no reaparece en el próximo Checkout.
- [x] AC8 — Dado un usuario que pide `DELETE /api/payment-methods/{id}` de una tarjeta ajena o
      inexistente, entonces recibe 404 (mismo criterio que AC9 de 012 y 014).
- [x] AC9 — Dado un usuario sin sesión, entonces `/profile` redirige a login y los tres
      endpoints responden 401.
- [x] AC10 — Dado que el usuario cancela el flujo en Stripe, entonces vuelve al tab sin
      tarjeta nueva, sin error y sin filas huérfanas.
- [x] AC11 — Dado el tab "Mis compras", entonces sigue funcionando igual que en 014.

## Datos
Requiere migración (`npm run db:generate` + `npm run db:migrate`). Estilo: `schema/order.ts`.

`users`: **nueva columna** `stripe_customer_id` text nullable + `uniqueIndex`
`users_stripe_customer_id_unique`. Nullable porque se crea perezosamente (AC2); imprescindible
persistirlo: Stripe no sabe buscar un Customer por nuestro `users.id`.

`payment_methods`: `id` uuid PK · `user_id` uuid NOT NULL FK→`users.id` (restrict) ·
`stripe_payment_method_id` text NOT NULL · `brand` varchar(20) NOT NULL ·
`last4` varchar(4) NOT NULL · `exp_month` integer NOT NULL · `exp_year` integer NOT NULL ·
`created_at` timestamptz NOT NULL default now.
Índices: unique en `stripe_payment_method_id`, index en `user_id`, checks
`exp_month between 1 and 12` y `char_length(last4) = 4`.
Sin `updated_at`: la fila se crea y se borra, nunca se edita.

**No se guardan los primeros 4 dígitos.** Stripe no expone el BIN en el `PaymentMethod` y
almacenarlo saca al comercio del alcance SAQ A. La marca sale de `card.brand` (visa,
mastercard, amex, …), que es exactamente el dato que el usuario quería identificar.

## API
| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/payment-methods/setup-session` | `requireAuth()` + `findActorByClerkId` | — | `201 { url: string }` |
| GET | `/api/payment-methods` | idem | — | `PaymentMethod[]` desc por `createdAt` |
| DELETE | `/api/payment-methods/[id]` | idem | — | `200 { deleted: true }` |

Errores: 401 sin sesión · 404 actor local inexistente o tarjeta ajena/inexistente ·
500 resto (vía `handleApiError`).

Zod: `paymentMethodIdParamSchema` (`z.uuid()`) sobre el `id` de la ruta; si no cuadra, 404.
El POST no lleva body: el Customer sale del actor, nunca del cliente.

`stripe.checkout.sessions.create({ mode: "setup", currency: "usd", customer, success_url,
cancel_url })`. `currency` es **obligatorio** en modo `setup` (dynamic payment methods) y
`customer` es lo que hace que Stripe adjunte el PaymentMethod al Customer sin `attach` manual.
`success_url`: `${APP_URL}/profile?tab=cards&setup=success` · `cancel_url`: `…&setup=canceled`.

**El webhook es la fuente de verdad**, igual que en 013: la vuelta al navegador solo informa.

## Reutilizar
- `src/lib/auth.ts` — `requireAuth()`.
- `src/lib/api-errors.ts` — `handleApiError`, `NotFoundError`.
- `src/lib/stripe.ts` — instancia `stripe` server-only.
- `src/lib/constants.ts` — `APP_URL`. · `src/lib/axios.ts` — `api`.
- `src/server/repositories/user.repository.ts` — `findActorByClerkId`, `findUserById`
  (da el `email` para `customers.create`); archivo destino de los dos helpers nuevos.
- `src/app/api/webhooks/stripe/route.ts` — se extiende, no se reescribe.
- `src/modules/orders/constants.ts` — patrón de fábrica de `queryKeys` (`orderKeys`).
- `src/modules/orders/hooks/use-my-orders.ts` — patrón de `useQuery`.
- `src/modules/products/hooks/use-product-mutations.ts` — patrón `useMutation` + `sonner`.
- `src/modules/orders/components/purchase-history.tsx` — patrón de skeleton/error/vacío.
- `src/modules/storefront/constants.ts` — `BRAND_BUTTON_CLASS`.
- shadcn: `tabs`, `card`, `button`, `skeleton`, `alert-dialog`, `badge` **ya instalados**
  (`src/components/ui/tabs.tsx` existe y hoy no lo usa nadie). Nada que instalar.

## Tareas
- [x] T1 — Columna `stripeCustomerId` + unique index · `src/server/db/schema/user.ts`
- [x] T2 — Tabla `payment_methods` · `src/server/db/schema/payment-method.ts`
- [x] T3 — Exportarla en el barrel · `src/server/db/schema/index.ts`
- [x] T4 — Generar y aplicar migración · `npm run db:generate && npm run db:migrate`
- [x] T5 — `setStripeCustomerId(userId, customerId)` y `findUserByStripeCustomerId(customerId)`
      · `src/server/repositories/user.repository.ts`
- [x] T6 — `listPaymentMethodsByUser`, `savePaymentMethod` (INSERT con
      `onConflictDoNothing` sobre `stripe_payment_method_id` = idempotencia de AC4),
      `findPaymentMethodById`, `deletePaymentMethodById` ·
      `src/server/repositories/payment-method.repository.ts`
- [x] T7 — Tipos `PaymentMethod` (inferido del schema) y `SetupSessionResponse` ·
      `src/modules/orders/types/payment-method.types.ts`
- [x] T8 — `paymentMethodIdParamSchema` · `src/modules/orders/schemas/payment-method.schema.ts`
- [x] T9 — `getOrCreateStripeCustomer(actorId)`: lee `users.stripe_customer_id`; si es null,
      `stripe.customers.create({ email, metadata: { userId } })` y persiste con T5 ·
      `src/server/services/stripe-customer.service.ts`
- [x] T10 — `POST` setup session · `src/app/api/payment-methods/setup-session/route.ts`
- [x] T11 — `GET` listado · `src/app/api/payment-methods/route.ts`
- [x] T12 — `DELETE` · `src/app/api/payment-methods/[id]/route.ts`: resolver actor, buscar la
      fila, 404 si no existe o `paymentMethod.userId !== actor.id`; `paymentMethods.detach`
      antes del DELETE local, tolerando `resource_missing` (ya desvinculada en Stripe)
- [x] T13 — Extender el `switch` del webhook · `src/app/api/webhooks/stripe/route.ts`: dentro
      de `checkout.session.completed`, ramificar por `session.mode`; `"setup"` →
      `setupIntents.retrieve(id, { expand: ["payment_method"] })` → resolver el usuario con
      `findUserByStripeCustomerId(session.customer)` → `savePaymentMethod`. `"payment"` sigue
      llamando `fulfillCheckoutSession` sin cambios (AC5)
- [x] T14 — `postSetupSession()`, `getPaymentMethods()`, `deletePaymentMethod(id)` ·
      `src/modules/orders/services/payment-method.service.ts`
- [x] T15 — `paymentMethodKeys` + `CARD_BRAND_LABEL` (visa/mastercard/amex/… con fallback al
      valor crudo) · `src/modules/orders/constants.ts`
- [x] T16 — `usePaymentMethods()` · `src/modules/orders/hooks/use-payment-methods.ts`
- [x] T17 — `useCreateSetupSession()` (redirige) y `useDeletePaymentMethod()` (invalida
      `paymentMethodKeys`) · `src/modules/orders/hooks/use-payment-method-mutations.ts`
- [x] T18 — `SavedCards` (`"use client"`) · `src/modules/orders/components/saved-cards.tsx`:
      lista, estados de carga/error/vacío, botón de alta y `AlertDialog` de confirmación
- [x] T19 — Tabs en `/profile` · `src/app/(storefront)/profile/page.tsx`: leer
      `searchParams.tab` (Promise en Next 16) para el `defaultValue`, `orders` →
      `<PurchaseHistory />`, `cards` → `<SavedCards />`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- Carrera de retorno: el usuario vuelve a `/profile` antes de que llegue el webhook y la
  tarjeta aún no está. Con `setup=success`, invalidar la query y mostrar un aviso de
  "registrando tu tarjeta"; no bloquear la vista con polling agresivo.
- `stripe.customers.create()` que falla a medio camino no deja rastro: sin fila persistida el
  siguiente intento simplemente crea otro Customer. Persistir el id **inmediatamente** después
  de crearlo, antes de la Checkout Session, para no dejar Customers huérfanos por cada intento.
- `session.setup_intent` y `setupIntent.payment_method` llegan como `string | objeto | null`
  según el tipo del SDK: normalizar antes de leer, sin `as` a ciegas (mismo criterio que
  `toPaymentIntentId` en el webhook).
- Un `PaymentMethod` sin `card` (wallet o método no-tarjeta que Checkout ofrezca) no tiene
  `brand`/`last4`: ignorar el evento y responder 200 antes que insertar una fila mentirosa.
- La misma tarjeta física guardada dos veces puede generar dos `PaymentMethod` distintos y
  aparecer duplicada. Aceptado: el unique es por id de Stripe; deduplicar por `fingerprint`
  sería otro alcance.
