---
id: 018
title: Órdenes (admin)
status: done
module: orders
scope: admin
---

# 018 — Órdenes (admin)

## Objetivo
Un administrador con permiso `orders.read` puede ver todas las órdenes del sistema en
`/admin/orders`, filtrarlas por cliente, estado y rango de fechas, y abrir el detalle de
cualquiera con sus líneas.

## Alcance
Incluye: `listAllOrders` en el repositorio de órdenes, `GET /api/admin/orders`, extensión del
módulo `src/modules/orders/` (service, hook, tabla, columnas, filtros puros), reutilización
del dialog de detalle con datos del cliente, página `/admin/orders` real y enlace en la nav.
No incluye: cambiar estado, cancelar o reembolsar órdenes (los permisos `orders.update_status`
y `orders.cancel` ya existen en el seed, se usarán en un spec posterior), exportaciones,
paginación o filtrado en servidor, cambios de esquema, cambios en `src/middleware.ts`.

## Criterios de aceptación
- [ ] AC1 — Dado un admin con `orders.read`, cuando abre `/admin/orders`, entonces ve todas
      las órdenes del sistema (de cualquier usuario) ordenadas por fecha descendente, con
      id, cliente (nombre + email), fecha, estado y total.
- [ ] AC2 — Dado que escribe en el buscador, entonces la tabla filtra por coincidencia
      parcial e insensible a mayúsculas contra `customerName` **o** `customerEmail`.
- [ ] AC3 — Dado que elige un estado del dropdown (Todos / Pendiente de pago / Pagado /
      Cancelado), entonces solo quedan las órdenes con ese `status`.
- [ ] AC4 — Dado un rango `desde`/`hasta`, entonces solo quedan las órdenes cuya fecha cae
      dentro, ambos extremos incluidos. Los tres filtros se combinan en AND.
- [ ] AC5 — Dado un rango con `desde > hasta`, entonces la vista muestra
      `DATE_RANGE_MESSAGE` y no aplica ese filtro, sin romperse.
- [ ] AC6 — Dado que pulsa una fila, entonces se abre el dialog de detalle con las líneas
      (`productName`, `quantity`, `unitPriceCents`), el total y, además de lo que ve el
      cliente, el nombre y el email del comprador.
- [ ] AC7 — Dado un usuario autenticado **sin** `orders.read`, entonces `GET /api/admin/orders`
      responde 403; sin sesión, 401 (middleware).
- [ ] AC8 — Dado que ningún filtro deja filas, entonces se muestra el vacío de la tabla;
      durante la carga, skeletons; ante error, mensaje con "Reintentar".
- [ ] AC9 — Dado el historial del cliente en `/profile`, entonces sigue funcionando igual:
      el dialog sin props de cliente no muestra la sección de comprador.

## Datos
**Sin cambios de esquema.** `orders` × `users` por `orders.user_id` (FK ya existente).
`customerName` se compone en el repositorio desde `users.first_name`/`last_name`
(ambos nullable): `[firstName, lastName].filter(Boolean).join(" ")`, y si queda vacío se usa
el email. `INNER JOIN` y no `LEFT`: `orders.user_id` es `NOT NULL`.

Tipo nuevo · `src/modules/orders/types/order.types.ts`:
`AdminOrderListItem = OrderWithItems & { customerName: string; customerEmail: string }`.

## API
| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/admin/orders` | `requirePermission("orders.read")` | — | `AdminOrderListItem[]` desc por `createdAt` |

Sin Zod: el handler no recibe body ni query. La regla 4 de `CLAUDE.md` no aplica porque no
hay entrada que validar; **añadir** query params obligaría a añadir su schema.

Sin filtros ni paginación en servidor: se devuelve todo y la tabla filtra en cliente, igual
que `/api/products` + `use-products.ts`. Así los tres filtros se combinan sin refetch.

## Reutilizar
- `src/lib/permissions.ts` — `requirePermission` (patrón exacto en `src/app/api/admin/users/route.ts`).
- `src/lib/api-errors.ts` — `handleApiError`.
- `src/lib/axios.ts` — `api`; `src/lib/utils.ts` — `formatPriceFromCents`.
- `src/server/repositories/order.repository.ts` — archivo destino; `listOrdersByUser` es la
  referencia directa del patrón anti-N+1 (un SELECT de órdenes + un `inArray` de líneas).
- `src/server/db/schema/user.ts` — `users` para el join.
- `src/modules/orders/constants.ts` — `orderKeys`, `ORDER_STATUS_PRESENTATION`,
  `orderStatusPresentation` (labels y variantes de `Badge`).
- `src/modules/orders/schemas/order-history.schema.ts` — `MyOrdersQueryInput`, `DATE_RANGE_MESSAGE`.
- `src/modules/orders/components/purchase-date-filter.tsx` — `PurchaseDateFilter` y
  `currentMonthRange()` tal cual: es controlado, emite `{from,to}` y no consulta nada.
- `src/modules/orders/components/purchase-detail-dialog.tsx` — base del detalle, a extender.
- `src/modules/products/components/products-table.tsx` y `product-columns.tsx` — patrón de
  TanStack Table: `globalFilterFn`, filtros de columna, paginación y contador.
- `src/modules/products/components/products-view.tsx` — patrón de skeleton/error/vacío.
- `src/modules/products/constants.ts` — `ALL_FILTER` (`"all"`) como valor centinela del Select.
- `src/test-utils/mocks/drizzle.ts` — `createSequentialDbMock`.
- shadcn ya instalados: `table`, `input`, `select`, `badge`, `button`, `skeleton`, `dialog`,
  `separator`. **Nada que instalar.**

## Tareas
- [x] T1 — Tipo `AdminOrderListItem` · `src/modules/orders/types/order.types.ts`.
- [x] T2 — `listAllOrders(): Promise<AdminOrderListItem[]>` ·
      `src/server/repositories/order.repository.ts`: SELECT explícito de `orders` +
      `innerJoin(users)` para nombre/email, `ORDER BY created_at DESC`; líneas en **una**
      consulta con `inArray` y reparto en memoria. Salida temprana con `[]` si no hay filas.
- [x] T3 — Tests de `listAllOrders` · `src/server/repositories/order.repository.test.ts`:
      sin órdenes no consulta líneas; agrupa líneas por orden; compone `customerName` con
      `firstName`/`lastName` nulos cayendo al email.
- [x] T4 — `GET` · `src/app/api/admin/orders/route.ts`: `requirePermission("orders.read")` →
      `listAllOrders()` → JSON; catch `handleApiError`.
- [x] T5 — `adminOrderKeys.list()` y `ORDER_STATUS_FILTERS` (`ALL_FILTER` + las 3 claves de
      `ORDER_STATUS_PRESENTATION` con su `label`) · `src/modules/orders/constants.ts`.
- [x] T6 — `getAdminOrders()` sobre `/admin/orders` · `src/modules/orders/services/admin-order.service.ts`.
- [x] T7 — `useAdminOrders()` · `src/modules/orders/hooks/use-admin-orders.ts`.
- [x] T8 — Predicados puros `matchesCustomer(order, term)`, `matchesStatus(order, status)`,
      `isWithinRange(order, range)` · `src/modules/orders/lib/admin-order-filters.ts`.
      Fecha: comparar `createdAt.slice(0, 10)` con `from`/`to` (ISO ordena lexicográficamente),
      ambos extremos inclusive; extremo ausente = sin tope.
- [x] T9 — Tests de los tres predicados · `src/modules/orders/lib/admin-order-filters.test.ts`.
- [x] T10 — `getAdminOrderColumns()` + `FilterFn` que envuelven T8 ·
      `src/modules/orders/components/admin-order-columns.tsx`.
- [x] T11 — `AdminOrdersTable` · `src/modules/orders/components/admin-orders-table.tsx`:
      `Input` global, `Select` de estado, `PurchaseDateFilter`, paginación y `onSelect(order)`.
- [x] T12 — Extender `PurchaseDetailDialog` con props opcionales `customerName`/`customerEmail`
      · `src/modules/orders/components/purchase-detail-dialog.tsx`: si llegan, pinta el bloque
      de comprador; si no, el dialog queda idéntico para `/profile` (AC9).
- [x] T13 — `AdminOrdersView` (`"use client"`) · `src/modules/orders/components/admin-orders-view.tsx`:
      compone hook, tabla y dialog; skeletons, error con reintento y vacío.
- [x] T14 — Página real · `src/app/(admin)/admin/orders/page.tsx`: Server Component con
      cabecera + `<AdminOrdersView />`, reemplazando `AdminOrdersProbePage`.
- [x] T15 — Ítem `{ href: "/admin/orders", label: "Órdenes", icon: ShoppingBag }` ·
      `src/components/shared/admin-nav.tsx`.

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- El dialog reutilizado monta `useOrderReceipt` para órdenes `paid`: el admin también verá el
  botón de boleta. Es una llamada a Stripe por orden abierta, no por fila; aceptado.
- Sin paginación de servidor: la tabla pagina en cliente sobre todo el dataset. Cuando el
  volumen lo pida será un spec aparte, no un `limit` improvisado.
- El rango de fechas se evalúa sobre el día UTC de `createdAt`, mientras `currentMonthRange()`
  usa la zona del navegador. Una compra de madrugada puede caer fuera del mes actual; mismo
  compromiso aceptado en el spec 014, no compensar con conversiones manuales.
