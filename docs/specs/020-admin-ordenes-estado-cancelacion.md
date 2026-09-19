---
id: 020
title: Órdenes (admin) — cambio de estado y cancelación
status: done
module: orders
scope: admin
---

# 020 — Órdenes (admin) — cambio de estado y cancelación

## Objetivo
Un administrador con `orders.update_status` puede marcar una orden `pending` como `paid`, y
con `orders.cancel` puede cancelar una orden `pending` o `paid`, desde `/admin/orders`, con
traza en `audit_logs`.

## Alcance
Incluye: máquina de transiciones pura compartida por UI y servidor, `updateOrderStatus`
transaccional (UPDATE con guard + `audit_logs` en la misma tx), `PATCH /api/admin/orders/[id]/status`
con Zod, service, hook de mutación y acciones dentro del dialog de detalle del spec 018.
No incluye: reembolsos en Stripe, reposición de stock al cancelar (spec 019), emails al cliente,
exportación, paginación en servidor, motivo de cancelación, estados nuevos, cambios de esquema,
cambios en `src/middleware.ts` (ya cubre `/admin(.*)` y `/api/admin(.*)` con `auth.protect()`).

## Máquina de estados
`orders.status` es `varchar(20)` con tres valores en uso (`src/server/db/schema/order.ts`,
`ORDER_STATUS_PRESENTATION`): `pending`, `paid`, `canceled`. No se añaden valores.

| Desde | Hacia | Permiso | Acción de auditoría |
|---|---|---|---|
| `pending` | `paid` | `orders.update_status` | `order.status_changed` (`info`) |
| `pending` | `canceled` | `orders.cancel` | `order.canceled` (`warning`) |
| `paid` | `canceled` | `orders.cancel` | `order.canceled` (`warning`) |

`canceled` es terminal: no vuelve a `pending` ni a `paid`. `paid → pending` prohibido.
Misma → misma prohibida. Cualquier otra combinación es 409.

## Criterios de aceptación
- [x] AC1 — Dado un admin con `orders.update_status`, cuando abre el detalle de una orden
      `pending` y pulsa "Marcar como pagada", entonces la orden queda `paid`, se descuenta el
      stock de sus líneas y el listado se refresca.
- [x] AC2 — Dado un admin con `orders.cancel` en una orden `pending` o `paid`, cuando pulsa
      "Cancelar orden" y confirma, entonces la orden queda `canceled` y el stock **no** cambia.
- [x] AC3 — Dada una transición no listada arriba (p. ej. `canceled → paid`), entonces la API
      responde 409 sin tocar la fila ni escribir log, y la UI no ofrece la acción. Un `status`
      fuera de `paid|canceled` o un `id` no-uuid responde 400 (Zod).
- [x] AC4 — Dado un usuario sin el permiso del destino, entonces la API responde 403 (401 sin
      sesión, por middleware) y la UI no renderiza ese botón (`can()` en el Server Component).
- [x] AC5 — Dada una transición exitosa, entonces se inserta **una** fila en `audit_logs` en la
      misma transacción, con `actorId`, `entityType: "order"`, `entityId`, `changes:
      { before: { status }, after: { status } }` y sin nombre, email ni datos de pago.
- [x] AC6 — Durante la mutación los botones quedan deshabilitados; ante error se muestra el
      mensaje del servidor (toast) y la fila no cambia; al éxito se invalida `adminOrderKeys.list()`.

## Datos
**Sin cambios de esquema.** Solo `UPDATE orders SET status` + `INSERT audit_logs`.
`orders.cancel` ya existe en `src/server/db/seed-data.ts:31` y solo lo tienen `super_admin` y
`admin` (vía `ALL_PERMISSION_CODES`); `manager` y `employee` tienen `orders.update_status`.
**Sin cambios en el seed.**

## API
| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| PATCH | `/api/admin/orders/[id]/status` | `requirePermission("orders.cancel")` si `status === "canceled"`, si no `requirePermission("orders.update_status")` | `{ status: "paid" \| "canceled" }` | `Order` actualizada |

Zod · `src/modules/orders/schemas/admin-order.schema.ts`: `orderIdParamSchema` (`id: uuid`) y
`updateOrderStatusSchema` (`status: enum(["paid","canceled"])`), mismo idiom que
`user-role.schema.ts`. Errores vía `handleApiError`: 404 si la orden no existe, 409 si la
transición no es válida.

## Reutilizar
- `src/lib/permissions.ts` — `requirePermission` (devuelve `users.id` para `actorId`) y `can()`
  (patrón en `src/app/(admin)/admin/roles/page.tsx:9`). `src/lib/api-errors.ts` — `ConflictError`,
  `NotFoundError`, `handleApiError`.
- `src/server/repositories/audit-log.repository.ts` — `insertAuditLog(input, tx)`; uso dentro de
  transacción en `user-role.repository.ts:58` y `:94`.
- `src/server/repositories/order.repository.ts` — archivo destino; `markOrderAsPaid` es la
  referencia del guard `AND status = ...` dentro del UPDATE y del bucle de stock.
- `src/modules/orders/`: `constants.ts` (`adminOrderKeys`, `orderStatusPresentation`),
  `services/admin-order.service.ts` y `hooks/use-admin-orders.ts` (archivos destino),
  `hooks/use-payment-method-mutations.ts` (patrón `useMutation` + `toast` + `invalidateQueries`),
  `components/purchase-detail-dialog.tsx` y `components/admin-orders-view.tsx` (a extender).
- `src/test-utils/mocks/drizzle.ts` — `createSequentialDbMock`.
- shadcn ya instalados: `dialog`, `button`, `badge`, `sonner` (`<Toaster />` montado en
  `src/app/layout.tsx`). **Nada que instalar.**

## Tareas

### Etapa 1 — código principal · parar al terminar
- [x] T1 — `ORDER_STATUS_TRANSITIONS` + `canTransition(from, to)`, puro y sin imports de
      servidor · `src/modules/orders/lib/order-status-transitions.ts`.
- [x] T2 — Extraer el bucle de descuento de stock de `markOrderAsPaid` a
      `decrementStockForOrder(tx, orderId)`, sin cambiar su comportamiento ·
      `src/server/repositories/order.repository.ts`.
- [x] T3 — `updateOrderStatus({ orderId, nextStatus, actorId })` · mismo archivo: `db.transaction`
      con UPDATE + `AND status IN (<orígenes válidos de T1>)`; sin fila → `NotFoundError` si la
      orden no existe, `ConflictError` si existe; si `paid` llama a T2; `insertAuditLog(..., tx)`.
- [x] T4 — `orderIdParamSchema` y `updateOrderStatusSchema` ·
      `src/modules/orders/schemas/admin-order.schema.ts`.
- [x] T5 — `PATCH` · `src/app/api/admin/orders/[id]/status/route.ts`: elige el permiso según el
      `status` validado, llama a T3, devuelve JSON; catch `handleApiError`.
- [x] T6 — `updateAdminOrderStatus(id, status)` · `src/modules/orders/services/admin-order.service.ts`.
- [x] T7 — `useUpdateAdminOrderStatus()` con `toast` e invalidación de `adminOrderKeys.list()` ·
      `src/modules/orders/hooks/use-admin-order-mutations.ts`.
- [x] T8 — `AdminOrderActions` (`"use client"`) · `src/modules/orders/components/admin-order-actions.tsx`:
      botones derivados de `canTransition` + permisos por props, confirmación en dos pasos para
      cancelar, `disabled` mientras `isPending`.
- [x] T9 — Prop opcional `actions?: ReactNode` renderizada en el `DialogFooter` ·
      `src/modules/orders/components/purchase-detail-dialog.tsx`; sin ella, `/profile` idéntico.
- [x] T10 — `AdminOrdersView` acepta `canUpdateStatus` / `canCancel` y pasa `<AdminOrderActions />`
      como `actions` · `src/modules/orders/components/admin-orders-view.tsx`.
- [x] T11 — La página resuelve ambos permisos con `can()` y los pasa como props ·
      `src/app/(admin)/admin/orders/page.tsx`.

### Etapa 2 — tests · parar al terminar
- [x] T12 — Tests de `canTransition`: válidas, terminal `canceled`, misma → misma ·
      `src/modules/orders/lib/order-status-transitions.test.ts`.
- [x] T13 — Tests de `updateOrderStatus` con `createSequentialDbMock`: éxito escribe el log con
      `before`/`after`; transición inválida lanza y no inserta log ·
      `src/server/repositories/order.repository.test.ts`.
- [x] T14 — Tests de los schemas Zod · `src/modules/orders/schemas/admin-order.schema.test.ts`.

### Etapa 3 — verificación y review
- [x] T15 — `npm run typecheck && npm run lint && npm test` en verde.
- [x] T16 — Entrega al reviewer (corre `npm run build` y audita permisos y auditoría).

## Notas
- `pending → paid` descuenta stock porque el webhook (spec 013) lo hace en esa misma transición;
  omitirlo dejaría inventario mentiroso. El guard `AND status = 'pending'` de `markOrderAsPaid`
  convierte un webhook posterior en no-op, así que no hay doble descuento.
- Cancelar **no** repone stock: una orden `paid` cancelada deja el inventario descontado hasta
  el spec 019. Deuda consciente, no olvido.
- Confirmación de cancelar en dos pasos dentro del mismo `Dialog`, no un `AlertDialog` anidado:
  dos portales modales de Radix superpuestos pelean por el foco.
