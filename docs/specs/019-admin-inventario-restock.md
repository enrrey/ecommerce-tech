---
id: 019
title: Inventario / restock (admin)
status: draft
module: products
scope: admin
---

# 019 — Inventario / restock (admin)

## Objetivo
Un administrador puede abrir `/admin/inventory` y ver, en una sola vista ordenada por urgencia,
qué productos activos están por debajo del umbral de stock bajo para reponerlos.

## Alcance
Incluye: umbral global `LOW_STOCK_THRESHOLD = 10`, predicados puros de inventario con tests,
hook `useInventory()` que deriva del query de productos ya existente, tabla de restock,
página `/admin/inventory` e ítem en la nav admin.
No incluye: editar stock desde esta vista (el admin va a `/admin/products`, donde ya está el
dialog de edición), umbral por producto o configurable por UI, endpoint nuevo, cambios de
esquema, cambios en `src/middleware.ts`, cambios en `products-table.tsx` / `product-columns.tsx`,
y **no** se toca el `TODO(spec-rbac)` de `src/app/api/products/route.ts` (asunto aparte).

## Criterios de aceptación
- [ ] AC1 — Dado un admin en `/admin/inventory`, cuando la carga termina, entonces ve solo los
      productos con `isActive === true` y `stock < 10`, cada uno con nombre, SKU, categoría y
      stock actual.
- [ ] AC2 — Dado ese listado, entonces las filas van ordenadas por `stock` ascendente: las de
      stock 0 aparecen antes que las de stock 5.
- [ ] AC3 — Dado un producto con `stock === 0`, entonces su badge dice "Sin stock" con variante
      `destructive`; con `0 < stock < 10`, dice "Stock bajo" con variante `secondary`.
- [ ] AC4 — Dado un producto con `stock >= 10` o con `isActive === false`, entonces no aparece
      en la vista, aunque su stock sea 0.
- [ ] AC5 — Dado que ningún producto cumple el criterio, entonces se muestra un vacío explícito
      ("Todo el inventario está en buen nivel"), no un error.
- [ ] AC6 — Durante la carga se muestran skeletons; ante error, mensaje con "Reintentar".
- [ ] AC7 — Dado que pulsa el enlace de una fila, entonces navega a `/admin/products` (sin query
      params) con `Link` de Next.
- [ ] AC8 — Dado que ya visitó `/admin/products` en la sesión, entonces abrir `/admin/inventory`
      no dispara un fetch nuevo: comparten la entrada de caché `productKeys.list()`.
- [ ] AC9 — Dado un usuario sin sesión, entonces `/admin/inventory` lo redirige (middleware ya
      cubre `/admin(.*)`).
- [ ] AC10 — `npm test` pasa con los casos de `inventory.test.ts`: stock 0, 1, 9, 10 y 25.

## Datos
**Sin cambios de esquema y sin endpoint nuevo.** `GET /api/products` ya devuelve
`ProductListItem[]` (`Product & { categoryName: string }`), con `stock`, `isActive`, `sku`,
`name` y `categoryName`. El filtrado y el orden ocurren en cliente, sobre datos ya en caché.
Sin tipos nuevos: la vista consume `ProductListItem`.

## API
Ninguna ruta nueva ni modificada.

| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/products` (existente, sin tocar) | `requireAuth` en POST; GET público hoy | — | `ProductListItem[]` |

Sin Zod: no se añade entrada que validar.

## Reutilizar
- `src/modules/products/services/product.service.ts` — `getProducts()` tal cual.
- `src/modules/products/constants.ts` — archivo destino de `LOW_STOCK_THRESHOLD`; ya exporta
  `productKeys.list()`, la clave de caché que comparte esta vista.
- `src/modules/products/hooks/use-products.ts` — referencia del patrón de `useQuery`.
- `src/modules/products/types/product.types.ts` — `ProductListItem`.
- `src/modules/products/components/products-view.tsx` — patrón exacto de skeleton / error con
  "Reintentar" / vacío en borde punteado, a replicar.
- `src/modules/orders/components/admin-orders-view.tsx` — mismo patrón, segunda referencia.
- `src/modules/orders/lib/admin-order-filters.ts` y su `.test.ts` — patrón de predicado puro
  + test con `node:test` e import con extensión `.ts`.
- `src/modules/products/components/product-columns.tsx` — criterio de badge de stock ya usado
  (`destructive` si 0), para mantener coherencia visual. Solo se lee, no se modifica.
- `src/app/(admin)/admin/orders/page.tsx` — patrón de página Server Component con cabecera.
- `src/components/shared/admin-nav.tsx` — archivo destino del ítem nuevo; ya importa iconos de
  `lucide-react` (`Package`, `ShoppingBag`, `Tags`…); usar `PackageSearch`.
- shadcn ya instalados: `table`, `badge`, `button`, `skeleton`. **Nada que instalar.**

## Tareas
- [ ] T1 — `LOW_STOCK_THRESHOLD = 10` con comentario del porqué (umbral global fijo) ·
      `src/modules/products/constants.ts`.
- [ ] T2 — Puros `isLowStock(stock, threshold)`, `inventoryStatus(stock, threshold): "out" |
      "low" | "ok"` (`out` si `stock === 0`, `low` si `0 < stock < threshold`, `ok` si no) y
      `selectLowStock(products: ProductListItem[]): ProductListItem[]` (filtra `isActive &&
      isLowStock(...)`, ordena por `stock` asc, no muta el array de entrada) ·
      `src/modules/products/lib/inventory.ts`. Sin JSX, sin React.
- [ ] T3 — Tests de T2 · `src/modules/products/lib/inventory.test.ts`: tabla de casos 0, 1, 9,
      10, 25; `selectLowStock` excluye inactivos y ordena asc.
- [ ] T4 — `useInventory()` · `src/modules/products/hooks/use-inventory.ts`: `useQuery` con
      `queryKey: productKeys.list()`, `queryFn: getProducts` y `select: selectLowStock`
      (referencia a nivel de módulo, no lambda inline). Devuelve
      `UseQueryResult<ProductListItem[], Error>`.
- [ ] T5 — `InventoryTable` (`"use client"`) · `src/modules/products/components/inventory-table.tsx`:
      presentacional, prop `products: ProductListItem[]`; `Table` de shadcn con columnas
      producto (nombre + SKU), categoría, stock, badge de `inventoryStatus` y `Link` a
      `/admin/products`. Sin TanStack Table: no hay filtros ni orden de usuario.
- [ ] T6 — `InventoryView` (`"use client"`) · `src/modules/products/components/inventory-view.tsx`:
      compone `useInventory()` + `InventoryTable`; skeletons, error con "Reintentar" y vacío.
- [ ] T7 — Página · `src/app/(admin)/admin/inventory/page.tsx`: Server Component con cabecera
      + `<InventoryView />`.
- [ ] T8 — Ítem `{ href: "/admin/inventory", label: "Inventario", icon: PackageSearch,
      exact: false }` · `src/components/shared/admin-nav.tsx`.

Verificación final: `npm run typecheck && npm run lint && npm test` (el `build` lo corre el reviewer)

## Notas
- `useInventory` no envuelve a `useProducts()` porque ese hook no admite `select`; monta su
  propio observador sobre la **misma** `queryKey`, así que comparte caché y no refetchea
  (AC8). `select` se aplica por observador: `useProducts()` sigue viendo la lista completa.
- `inventoryStatus` puede devolver `"ok"` aunque la tabla nunca reciba esa fila; la celda debe
  cubrir los tres casos de forma exhaustiva para que el `switch`/mapa no deje un hueco de tipos.
- El umbral es constante de código: cambiarlo es un commit, no una acción de admin. Si el
  negocio pide umbral por producto, es columna nueva y spec aparte.
