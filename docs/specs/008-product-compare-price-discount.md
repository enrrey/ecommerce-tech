---
id: 008
title: Precio anterior y descuentos reales
status: done
module: products
scope: both
---

# 008 — Precio anterior y descuentos reales

## Objetivo
Un administrador puede fijar un precio anterior por producto para que "Ofertas del día"
muestre el descuento real (precio tachado + % ahorrado) en vez de un orden por precio.

## Alcance
Incluye:
- Columna `compare_at_price_cents` (nullable) en `products` + migración.
- Campo "Precio anterior (S/)" en el formulario de admin y precio tachado en el listado.
- `compareAtPriceCents` normalizado en el contrato público y orden `deals`.
- Badge de descuento en `ProductCard`.

No incluye:
- `isFeatured`, campañas con fecha de inicio/fin, precios por segmento.
- Campo nuevo de "publicado": la referencia visual llama así a `isActive`, que **ya existe**
  (`product-form-dialog.tsx` lo pinta como switch "Activo"). Solo se documenta, no se toca.
- Cambiar el countdown a medianoche (`use-countdown-to-midnight.ts`): sigue igual.

## Criterios de aceptación
- [x] AC1 — Dado un producto con precio anterior mayor al precio, cuando se abre la landing,
      entonces su tarjeta muestra el precio anterior tachado y el badge `-N%` (redondeado).
- [x] AC2 — Dado un producto sin precio anterior (o con uno ≤ precio), cuando se renderiza,
      entonces no aparece badge ni tachado y **no** hay error: se trata como sin descuento.
- [x] AC3 — Dado el formulario de admin, cuando se guarda un precio anterior ≤ precio,
      entonces Zod bloquea el submit con mensaje en el campo; el campo vacío guarda `null`.
- [x] AC4 — Dado un producto en edición, cuando se borra el precio anterior y se guarda,
      entonces el PATCH envía `null` y el producto deja de estar en oferta.
- [x] AC5 — Dado el listado de admin, cuando un producto tiene precio anterior válido,
      entonces la celda Precio muestra el anterior tachado bajo el precio actual.
- [x] AC6 — Dado `sort=deals`, cuando hay menos ofertas reales que `pageSize`, entonces la
      grilla se completa con los productos más baratos (ofertas primero) y nunca queda vacía.
- [x] AC7 — Dado `GET /api/public/products`, cuando se inspecciona la respuesta, entonces
      sigue sin exponer `stock`, `sku`, `isActive` ni `updatedAt`, y sigue filtrando
      `products.is_active = true AND categories.is_active = true`.

## Datos
`products` · `compare_at_price_cents` · `integer` · nullable, sin default. **Requiere migración**
(`npm run db:generate` + `npm run db:migrate`).
Check `products_compare_at_price_cents_positive`: `compare_at_price_cents IS NULL OR
compare_at_price_cents >= 0`.

**Decisión (dónde vive la regla `> priceCents`):**
- **Zod admin** — refine cruzado que impide guardar un anterior ≤ precio (error legible).
- **Lectura pública** — se normaliza a `null` si no cumple; dato viejo o incoherente queda inerte.
- **NO en la BD** — un check `> price_cents` haría fallar con 500 un PATCH que solo sube el
  precio de un producto en oferta. La BD solo garantiza no-negativo.

## API
Sin rutas nuevas. Cambios de contrato:

| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/products` | `products.create` | + `compareAtPriceCents: number\|null` | Product con el campo |
| PATCH | `/api/products/[id]` | `products.update` | + `compareAtPriceCents?: number\|null` | idem |
| GET | `/api/public/products` | pública | `?sort=deals` admitido | items + `compareAtPriceCents: number\|null` |

Zod (`product.schema.ts`):
- `productFields.compareAtPriceCents` — unión `z.literal("") | z.null() | priceToCents` con
  transform a `null`, igual patrón que `imageUrl` (no usar `z.preprocess`: deja el input en
  `unknown` y rompe el tipado de React Hook Form, ver comentario del archivo).
- `createProductSchema` — `.refine` cruzado: `compareAtPriceCents === null || > priceCents`,
  `path: ["compareAtPriceCents"]`.
- `apiProductFields.compareAtPriceCents` — `z.number().int().nonnegative().max(20_000_000).nullable()`;
  mismo refine en `createProductApiSchema`, y en `updateProductApiSchema` solo cuando ambas claves vienen.

`publicProductQuerySchema`: añadir `"deals"` **al final** de `PUBLIC_PRODUCT_SORTS`
(el default es `PUBLIC_PRODUCT_SORTS[0]` = `newest`).

**Decisión (crudo vs derivado):** se expone `compareAtPriceCents` ya normalizado, no un
`discountPercent`. La tarjeta necesita el importe para el tachado; el % es formato y se calcula
en el componente. Normalizar en el repositorio evita que la regla se duplique en cada cliente.

## Reutilizar
- `src/lib/utils.ts` → `formatPriceFromCents` — formato de ambos precios (admin y storefront).
- `src/modules/products/schemas/product.schema.ts` → `priceToCents` — conversión soles↔centavos.
- `src/components/ui/badge.tsx` → badge de descuento (ya usado en `ProductCard`).
- `src/modules/storefront/components/product-grid.tsx` — sin cambios: solo cambia la query.
- `src/modules/products/types/product.types.ts` — sin cambios: `Product` se infiere del schema.
Sin componentes shadcn nuevos.

## Tareas
- [x] T1 — Añadir columna + check `compare_at_price_cents` · `src/server/db/schema/product.ts`
- [x] T2 — Generar y aplicar migración Drizzle · `drizzle/` (`db:generate` + `db:migrate`)
- [x] T3 — Añadir el campo a `productFields`, `apiProductFields` y los refines · `src/modules/products/schemas/product.schema.ts`
- [x] T4 — Añadir `compareAtPriceCents` a `productListSelection` · `src/server/repositories/product.repository.ts`
- [x] T5 — Normalizar `compareAtPriceCents` en el `map` de `listPublicProducts` y añadir el orden
      `deals` (`desc(coalesce(compare > price, false))`, luego `asc(price_cents)`, luego `asc(id)`;
      `PUBLIC_PRODUCT_ORDER` pasa a `Record<PublicProductSort, SQL[]>`) · mismo archivo
- [x] T6 — Añadir `"deals"` al enum de orden · `src/modules/storefront/schemas/public-catalog.schema.ts`
- [x] T7 — Añadir `compareAtPriceCents` al `Pick` de `PublicProduct` y documentar que llega
      normalizado · `src/modules/storefront/types/public-catalog.types.ts`
- [x] T8 — Campo "Precio anterior (S/)" junto a "Precio" (grid de 2 columnas), `EMPTY_FORM` y
      `toFormValues` · `src/modules/products/components/product-form-dialog.tsx`
- [x] T9 — Precio anterior tachado en la celda Precio · `src/modules/products/components/product-columns.tsx`
- [x] T10 — Badge `-N%` y precio tachado cuando hay oferta · `src/modules/storefront/components/product-card.tsx`
- [x] T11 — `DEALS_QUERY` a `{ sort: "deals", pageSize: DEALS_COUNT }` y actualizar el comentario
      obsoleto del spec 007 · `src/modules/storefront/components/deals-section.tsx`

Verificación final: `npm run typecheck && npm run lint`

## Notas
- El badge "Nuevo"/"Sin stock" y el de descuento comparten esquina en `ProductCard`: definir
  prioridad (sin stock > descuento > nuevo) para no apilar tres badges.
- La sección `#ofertas` es ancla de navegación en header y footer: no puede ocultarse. Por eso el
  fallback es de orden (`deals`), no de filtro — la grilla siempre trae `DEALS_COUNT` productos.
- El reviewer debe correr `security-review`: vuelve a cambiar el contrato del endpoint público.
  Si el repo aún no es git y la skill no puede leer el diff, revisar a mano AC7 y dejarlo escrito.

## Notas de implementación

- Migración generada y aplicada: `drizzle/0004_sleepy_thanos.sql` (`ADD COLUMN` + check
  `products_compare_at_price_cents_positive`). La columna nace `NULL` en todas las filas.
- `createProductApiSchema` añade `.default(null)` sobre `compareAtPriceCents`, igual que ya hacía
  con `isActive`: omitir la clave en un POST significa "sin oferta", no un 400. El refine cruzado
  se aplica igual.
- El mensaje de error del campo cuando el valor no es numérico es el genérico de unión
  ("Invalid input"), mismo comportamiento que `imageUrl`. El input es `type="number"`, así que por
  UI no se alcanza; se deja consistente con el campo existente en vez de tratar el caso aparte.
- El badge de descuento usa los tokens `bg-deal`/`text-deal-foreground` ya definidos en
  `globals.css` y consumidos por `DealsSection`. Sin componente nuevo: es el `Badge` de shadcn.
