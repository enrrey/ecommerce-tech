---
id: 014
title: Profile — Mis compras
status: done
module: orders
scope: client
---

# 014 — Profile — Mis compras

## Objetivo
Un cliente autenticado puede ver su historial de compras agrupado por fecha, filtrarlo por
mes actual o por rango, abrir el detalle de cada compra y descargar la boleta de Stripe.

## Alcance
Incluye: página `/profile` (no existe todavía) con la sección "Mis compras", repositorio
`listOrdersByUser`, `GET /api/orders/mine`, `GET /api/orders/[id]/receipt`, módulo cliente
(schema/types/service/hooks/componentes), dialog de detalle con botón de boleta.
No incluye: reembolsos, facturación fiscal/CFDI, Stripe Invoicing, editar/cancelar compras,
vista de admin, notificaciones, paginación, cambios de esquema.

## Criterios de aceptación
- [x] AC1 — Dado un usuario con compras, cuando abre `/profile`, entonces ve sus órdenes
      agrupadas bajo un encabezado por día (`martes, 9 de septiembre de 2026`), grupos y
      órdenes en orden descendente por fecha.
- [x] AC2 — Dado el filtro por defecto, entonces solo se listan las compras del mes actual
      (del día 1 a hoy) y el preset "Mes actual" aparece activo.
- [x] AC3 — Dado que el usuario elige un rango `desde`/`hasta`, entonces la lista se
      recarga con ese rango y ambos extremos quedan incluidos.
- [x] AC4 — Dado un rango con `from > to`, entonces la API responde 400 y la UI muestra el
      mensaje de error sin romper la vista.
- [x] AC5 — Dado que el usuario pulsa una compra, entonces se abre un `Dialog` con id,
      estado, líneas (`productName`, `quantity`, `unitPriceCents`) y total.
- [x] AC6 — Dada una orden `paid` con boleta disponible, entonces el dialog muestra
      "Descargar boleta" y abre el `receipt_url` de Stripe en pestaña nueva.
- [x] AC7 — Dada una orden `pending` o `canceled`, entonces no hay botón de boleta (se
      lista igual, con su `Badge` de estado).
- [x] AC8 — Dada una orden `paid` cuyo `receipt_url` aún no existe (sin
      `stripe_payment_intent_id`, o `latest_charge` sin confirmar), entonces la API
      responde `{ receiptUrl: null }` y la UI muestra el botón deshabilitado con
      "Stripe aún no generó la boleta".
- [x] AC9 — Dado un usuario que pide `/api/orders/{id}/receipt` de una orden ajena,
      entonces recibe 404 (mismo criterio que AC9 del spec 012).
- [x] AC10 — Dado un usuario sin sesión, entonces `/profile` redirige a login y ambos
      endpoints responden 401.
- [x] AC11 — Dado el historial vacío en el rango elegido, entonces se muestra estado vacío;
      durante la carga, skeletons; ante error, mensaje con reintento.

## Datos
**Sin cambios de esquema.** `orders.stripe_payment_intent_id` (spec 012, ya poblado por
`markOrderAsPaid` en 013) es el único dato necesario para resolver la boleta.

**Decisión — la boleta se resuelve en caliente, no se persiste.** `GET /api/orders/[id]/receipt`
llama `stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] })` y devuelve
`latest_charge.receipt_url`. Motivos: (1) evita una migración Drizzle para una feature de
solo lectura; (2) el `receipt_url` de Stripe es un enlace vivo que puede regenerarse, una
copia en BD envejece; (3) resuelve por sí solo el caso de la orden pagada cuyo cargo aún no
existía al llegar el webhook, sin backfill. Stripe Invoicing queda **fuera de alcance**: 012
y 013 solo usan Checkout Session + PaymentIntent, y emitir `Invoice` exigiría Customers,
productos y un flujo de facturación que el proyecto no tiene.

## API
| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/orders/mine?from=&to=` | `requireAuth()` + `findActorByClerkId` | — | `OrderWithItems[]` desc por `createdAt` |
| GET | `/api/orders/[id]/receipt` | `requireAuth()` + `findActorByClerkId` | — | `{ receiptUrl: string \| null }` |

Zod · `myOrdersQuerySchema`: `from`, `to` opcionales, `z.iso.date()` (`YYYY-MM-DD`), con
`.refine(from <= to)`. Ausentes → sin filtro de fecha (el preset "mes actual" lo calcula el
cliente y viaja explícito). `id` de la ruta se valida con `z.uuid()`; si no cuadra, 404.

Endpoint de boleta separado y **no** incluido en el listado: resolverlo por orden en la
lista serían N llamadas a Stripe por render. Se pide solo al abrir el dialog de una orden
`paid`. La agrupación por fecha se hace en el cliente: es formato de presentación (locale y
zona del navegador), no un contrato de datos.

## Reutilizar
- `src/lib/auth.ts` — `requireAuth()`.
- `src/lib/api-errors.ts` — `handleApiError`, `NotFoundError`.
- `src/lib/stripe.ts` — instancia `stripe` server-only.
- `src/lib/axios.ts` — `api` para los services.
- `src/lib/utils.ts` — `formatPriceFromCents` (centavos, nunca float).
- `src/server/repositories/user.repository.ts` — `findActorByClerkId`.
- `src/server/repositories/order.repository.ts` — archivo destino; `findOrderById` sirve
  tal cual para el endpoint de boleta (no filtra por usuario: el handler valida pertenencia).
- `src/modules/orders/types/order.types.ts` — `Order`, `OrderItem`, `OrderWithItems`.
- `src/app/api/public/products/route.ts` — patrón de `Object.fromEntries(searchParams)` + Zod.
- `src/modules/storefront/hooks/use-public-products.ts` y `src/modules/storefront/constants.ts`
  — patrón exacto de `useQuery` con params y de fábrica de `queryKeys`.
- `src/app/(storefront)/orders/[id]/page.tsx` — `ORDER_STATUS_PRESENTATION` (label + variante
  de `Badge`) a mover al módulo y reusar.
- shadcn ya instalados: `dialog`, `badge`, `card`, `separator`, `button`, `input`, `skeleton`.
  **Nada que instalar**: el rango usa `<Input type="date">` nativo en vez de traer
  `calendar` + `popover` + `react-day-picker` para dos campos.

## Tareas
- [x] T1 — `listOrdersByUser(userId, { from?, to? }): Promise<OrderWithItems[]>` ·
      `src/server/repositories/order.repository.ts`. `WHERE user_id = $1` + `gte/lt` sobre
      `created_at` (`to` se compara con el día siguiente para incluirlo completo), `ORDER BY
      created_at DESC`; los `order_items` en **una sola** consulta con `inArray(orderId, ids)`
      y reparto en memoria (nada de un SELECT por orden).
- [x] T2 — `myOrdersQuerySchema` + tipo `MyOrdersQueryInput` ·
      `src/modules/orders/schemas/order-history.schema.ts`.
- [x] T3 — `OrderReceiptResponse` (`{ receiptUrl: string | null }`) ·
      `src/modules/orders/types/order.types.ts`.
- [x] T4 — `GET` · `src/app/api/orders/mine/route.ts`: `requireAuth` → `findActorByClerkId`
      (404 si falta) → parse de query → `listOrdersByUser` → JSON. Catch `handleApiError`.
- [x] T5 — `GET` · `src/app/api/orders/[id]/receipt/route.ts`: valida `id`, resuelve actor,
      `findOrderById`; 404 si no existe o `order.userId !== actor.id`; si
      `status !== "paid"` o falta `stripePaymentIntentId` → `{ receiptUrl: null }`; si no,
      `paymentIntents.retrieve` con `expand: ["latest_charge"]` y devuelve
      `latest_charge?.receipt_url ?? null`.
- [x] T6 — `orderKeys` (`all`, `mine(query)`, `receipt(id)`) y mover
      `ORDER_STATUS_PRESENTATION` desde la página de confirmación ·
      `src/modules/orders/constants.ts`; actualizar el import en
      `src/app/(storefront)/orders/[id]/page.tsx`.
- [x] T7 — `getMyOrders(query)` y `getOrderReceipt(id)` ·
      `src/modules/orders/services/order-history.service.ts`.
- [x] T8 — `useMyOrders(query)` con `placeholderData: keepPreviousData` ·
      `src/modules/orders/hooks/use-my-orders.ts`.
- [x] T9 — `useOrderReceipt(orderId, enabled)` ·
      `src/modules/orders/hooks/use-order-receipt.ts` (solo consulta con el dialog abierto y
      la orden `paid`).
- [x] T10 — `PurchaseDateFilter` · `src/modules/orders/components/purchase-date-filter.tsx`:
      presets "Mes actual" / "Rango" con dos `Input type="date"` controlados; emite
      `{ from, to }` hacia arriba, sin fetch propio.
- [x] T11 — `PurchaseDetailDialog` ·
      `src/modules/orders/components/purchase-detail-dialog.tsx`: recibe la `OrderWithItems`
      ya cargada, muestra estado/líneas/total y el botón de boleta según T9 y AC6–AC8.
- [x] T12 — `PurchaseHistory` · `src/modules/orders/components/purchase-history.tsx`
      (`"use client"`): agrupa por día con `Intl.DateTimeFormat("es")`, compone filtro,
      lista, skeletons, error y vacío, y abre el dialog.
- [x] T13 — Página `/profile` · `src/app/(storefront)/profile/page.tsx`: Server Component con
      `metadata`, cabecera de la vista y `<PurchaseHistory />`. Sin cambios en
      `src/middleware.ts`: la ruta ya queda protegida por no estar en `isPublicRoute`.
- [x] T14 — Enlace "Mi perfil" hacia `/profile` ·
      `src/modules/storefront/components/storefront-header.tsx`.

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- Zona horaria: el filtro compara `timestamptz` en UTC y la agrupación se hace con la zona
  del navegador. Una compra de madrugada puede caer en el grupo del día anterior respecto al
  filtro; aceptado, no compensar con conversiones manuales.
- `latest_charge` llega como `string | Charge | null` según el tipo del SDK: comprobar el
  objeto antes de leer `receipt_url`, sin `as` a ciegas.
- Sin paginación: el historial se acota por el filtro de fechas. Si un usuario acumula
  cientos de órdenes será un spec aparte, no un `limit` improvisado aquí.
- `order_items.product_id` es nullable (producto borrado): el detalle se pinta con
  `productName`/`unitPriceCents` congelados en la línea, nunca releyendo `products`.
