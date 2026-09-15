---
id: 012
title: Stripe Checkout Session
status: done
module: orders
scope: client
---

# 012 — Stripe Checkout Session

## Objetivo
Un cliente autenticado puede pagar su carrito: llega a la página alojada de
Stripe (`checkout.stripe.com`) con una orden `pending` ya persistida, y al
volver ve una página de confirmación con el detalle de su orden.

## Alcance
Incluye: tablas `orders`/`order_items`, cliente Stripe server-only, repositorio de
órdenes (`createPendingOrder`, `findOrderById` con sus items), `POST /api/checkout/session`,
módulo cliente `orders` (schema/types/service/hook), página `/checkout`, botón real
en el carrito, página de confirmación `/orders/[id]`.
No incluye: webhook `/api/webhooks/stripe`, verificación de firma, `markOrderAsPaid`,
decremento de stock (todo eso va en el spec 013 — la orden queda `pending` hasta
entonces, y esta página de confirmación lo muestra así, no como "pagado").
No incluye: sincronizar catálogo con Stripe (no hay `Product`/`Price` en Stripe),
envío/facturación, reembolsos, reserva de stock al crear la orden.

## Criterios de aceptación
- [x] AC1 — Dado un usuario autenticado con carrito no vacío, cuando pulsa "Pagar" en
      `/checkout`, entonces el navegador termina en `checkout.stripe.com` con el
      importe correcto por línea.
- [x] AC2 — Dado ese mismo flujo, entonces existe una fila en `orders` con
      `status = 'pending'`, `totalCents` calculado en servidor y
      `stripe_checkout_session_id` guardado, más una fila en `order_items` por línea.
- [x] AC3 — Dado un body con `priceCents` o `name` inyectados por el cliente, entonces
      se ignoran: el precio y el nombre salen siempre de `products`.
- [x] AC4 — Dado un producto con `isActive = false` o `stock < quantity`, entonces la
      API responde 409 (`ConflictError`) y no se crea ninguna orden ni sesión.
- [x] AC5 — Dado un usuario sin sesión, cuando abre `/checkout`, entonces Clerk lo
      redirige a login (ya cubierto por `middleware.ts`); la API responde 401.
- [x] AC6 — Dado el checkout iniciado con éxito, entonces el carrito de Zustand queda
      vacío antes del redirect.
- [x] AC7 — Dado el carrito con líneas, entonces el botón "Proceder al pago" del drawer
      está habilitado y navega a `/checkout`.
- [x] AC8 — Dado que el usuario completa (o cancela) el pago en Stripe y vuelve a
      `success_url`, entonces `/orders/{orderId}` existe, muestra sus items, el total y
      el estado `pending` (NO un 404, y NO se afirma que esté pagado).
- [x] AC9 — Dado un usuario autenticado que intenta abrir la orden de **otro** usuario
      por su id, entonces recibe 404 (no se filtra información de órdenes ajenas).

## Datos
Requiere migración (`npm run db:generate` + `npm run db:migrate`). Código Drizzle base
en `docs/stripe/checkout-integration.md` §3; estilo según `schema/product.ts`.

`orders`: `id` uuid PK · `user_id` uuid NOT NULL FK→`users.id` (restrict) ·
`status` varchar(20) NOT NULL default `'pending'` (pending|paid|canceled) ·
`total_cents` integer NOT NULL · `currency` varchar(3) NOT NULL default `'usd'` ·
`stripe_checkout_session_id` text · `stripe_payment_intent_id` text ·
`created_at`/`updated_at` timestamptz NOT NULL.
Índices: unique en cada columna `stripe_*`, index en `user_id`, check `total_cents >= 0`.

`order_items`: `id` uuid PK · `order_id` uuid NOT NULL FK→`orders.id` (cascade) ·
`product_id` uuid FK→`products.id` (set null) · `product_name` varchar(120) NOT NULL ·
`unit_price_cents` integer NOT NULL · `quantity` integer NOT NULL.
Índices: index en `order_id`, checks `unit_price_cents >= 0` y `quantity > 0`.

Nombre y precio se congelan en la fila: la orden histórica no cambia si el producto sí.

## API
| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/checkout/session` | `requireAuth()` (Clerk) | `{ items: [{ productId, quantity }] }` | `201 { url: string }` |

Errores: 400 Zod · 401 sin sesión · 404 actor local inexistente o producto inexistente ·
409 producto inactivo o sin stock · 500 resto (vía `handleApiError`).

Zod `createCheckoutSessionSchema` en `src/modules/orders/schemas/checkout.schema.ts`:
`items: array({ productId: uuid, quantity: int min 1 max MAX_QUANTITY }).min(1)`.
`MAX_QUANTITY` se reutiliza de `@/modules/cart/store/cart.store`, no se redefine.
El cliente nunca manda precio ni nombre.

Handler: `requireAuth()` → `findActorByClerkId()` → `createPendingOrder()` →
`stripe.checkout.sessions.create({ mode: "payment", line_items con price_data inline,
success_url, cancel_url })` → guardar `stripeCheckoutSessionId` → `{ url }`.
Nunca pasar `payment_method_types` (dynamic payment methods es el default).
`success_url`: `${APP_URL}/orders/{orderId}?session_id={CHECKOUT_SESSION_ID}` ·
`cancel_url`: `${APP_URL}/checkout`.

La página `/orders/[id]` es un **Server Component**, no expone Route Handler propio:
lee directo del repositorio (mismo patrón que `/products/[slug]`, spec 011).

## Reutilizar
- `src/lib/api-errors.ts` — `ConflictError`, `NotFoundError`, `handleApiError`. No crear subclases nuevas.
- `src/lib/auth.ts` — `requireAuth()`.
- `src/server/repositories/user.repository.ts` — `findActorByClerkId(clerkId)` → `users.id` local.
- `src/lib/env.ts` — `requireEnv("STRIPE_SECRET_KEY")`.
- `src/lib/constants.ts` — `APP_URL` para `success_url`/`cancel_url`.
- `src/lib/axios.ts` — instancia `api` para el service.
- `src/lib/utils.ts` — `formatPriceFromCents` en el resumen del carrito y en la confirmación.
- `src/modules/cart/store/cart.store.ts` — `useCartStore`, `selectCartSubtotalCents`, `MAX_QUANTITY`, `clear()`.
- `src/modules/storefront/constants.ts` — `BRAND_BUTTON_CLASS` para el botón de pago.
- `src/server/db/index.ts` — `db` (driver WebSocket: soporta `db.transaction`).
- `src/server/repositories/product.repository.ts` — estilo de repositorio (`import "server-only"`, selección explícita).
- `src/app/api/products/route.ts` — estilo de Route Handler (try/catch + `handleApiError`).
- `src/modules/products/hooks/use-product-mutations.ts` — patrón de `useMutation` + `sonner`.
- shadcn: `button`, `card`, `separator`, `badge` ya instalados. No hace falta instalar nada.
- `src/app/(storefront)/checkout/`, `src/app/(storefront)/orders/[id]/` y `src/modules/orders/*` ya existen vacíos.

## Tareas
- [x] T1 — Instalar el SDK: `npm i stripe` · `package.json`
- [x] T2 — Tabla `orders` · `src/server/db/schema/order.ts`
- [x] T3 — Tabla `order_items` · `src/server/db/schema/order-item.ts`
- [x] T4 — Exportar ambas tablas en el barrel · `src/server/db/schema/index.ts`
- [x] T5 — Generar y aplicar migración · `npm run db:generate && npm run db:migrate`
- [x] T6 — Cliente Stripe server-only · `src/lib/stripe.ts`
- [x] T7 — `createPendingOrder` (transacción, valida `isActive`/`stock`, `ConflictError`) y `findOrderById(id)` (trae la orden **con sus `order_items`**, para servir tanto a la confirmación como a un futuro admin) · `src/server/repositories/order.repository.ts`
- [x] T8 — Zod `createCheckoutSessionSchema` · `src/modules/orders/schemas/checkout.schema.ts`
- [x] T9 — `CreateCheckoutSessionInput` / `CreateCheckoutSessionResponse` · `src/modules/orders/types/checkout.types.ts`
- [x] T10 — Route Handler `POST` · `src/app/api/checkout/session/route.ts`
- [x] T11 — `postCheckoutSession(input)` con axios · `src/modules/orders/services/checkout.service.ts`
- [x] T12 — `useCreateCheckoutSession()` (`onSuccess`: `clear()` + `window.location.href`) · `src/modules/orders/hooks/use-create-checkout-session.ts`
- [x] T13 — Client component: resumen del carrito + botón que dispara el hook · `src/modules/orders/components/checkout-summary.tsx`
- [x] T14 — Página Server Component que renderiza el componente anterior · `src/app/(storefront)/checkout/page.tsx`
- [x] T15 — Habilitar el botón hacia `/checkout` y borrar el comentario obsoleto (líneas 154-162) · `src/modules/cart/components/cart-drawer.tsx`
- [x] T16 — Página de confirmación: `requireAuth()` → `findActorByClerkId()` → `findOrderById(id)` → si no existe o `order.userId !== actor.id`, `notFound()` de Next.js (AC9) → renderiza items, total y `status` (mostrar "pendiente de pago", nunca "pagado", hasta el spec 013) · `src/app/(storefront)/orders/[id]/page.tsx`

Verificación final: `npm run typecheck && npm run lint`

## Notas
- `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SIGNING_SECRET` ya están completos en
  `.env.local` (sandbox de Stripe dedicado a este proyecto). `.env.example` mantiene
  ambos vacíos — nunca lleva valores reales.
- La orden queda `pending` para siempre en este spec: sin webhook (spec 013) nadie la
  marca `paid`. La página de confirmación (T16) debe reflejar ese estado con honestidad,
  no dar a entender que el pago ya se confirmó.
- Sobreventa aceptada: entre validar stock y pagar no hay reserva (decisión de
  `docs/stripe/checkout-integration.md` §1).
- `currency` en la base y en `price_data` va en minúscula (`"usd"`); `CURRENCY` de
  `src/lib/constants.ts` es `"USD"` y es solo para formateo de UI. No confundirlas.
- Validar stock y crear las filas dentro de la misma `db.transaction`: hacerlo antes
  abre una carrera entre peticiones concurrentes del mismo usuario.
