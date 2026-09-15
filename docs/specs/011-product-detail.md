---
id: 011
title: Vista de detalle de producto /products/[slug] con productos parecidos
status: draft
module: storefront
scope: client
---

# 011 — Vista de detalle de producto /products/[slug] con productos parecidos

## Objetivo
Un visitante pulsa un producto del catálogo y llega a `/products/<slug>`, donde ve todo el
detalle del producto, puede añadirlo al carrito con la cantidad que elija y encuentra hasta
4 productos parecidos al pie de la página.

## Alcance
Incluye: ruta `/products/[slug]` con render en servidor y `generateMetadata`; 404 para slug
inexistente o producto/categoría inactivos; panel de compra (cantidad + añadir al carrito);
sección "Productos parecidos" (misma categoría, excluyendo el actual); `excludeSlug` en el
endpoint público; enlace desde la tarjeta del catálogo.
No incluye: galería multi-imagen (solo existe `image_url`), reseñas, valoraciones, stock
numérico visible, "productos vistos", breadcrumb dinámico global, checkout.
**Fuera de este spec (tareas BUILD aparte, no se tocan aquí):** el bug del botón "Añadir al
carrito" que no refleja Zustand y el color de los botones `+`/`−` del stepper.

## Criterios de aceptación
- [ ] AC1 — Dada una tarjeta en `/products`, cuando se pulsa su imagen o su título, entonces navega a `/products/<slug>` y el HTML del servidor ya trae el detalle (sin spinner).
- [ ] AC2 — Dado un producto con oferta, cuando se abre su detalle, entonces se ven nombre, marca, categoría, descripción, precio, precio anterior tachado, `-N%` y la disponibilidad.
- [ ] AC3 — Dado un slug inexistente, o de un producto inactivo, o de categoría inactiva, cuando se visita, entonces responde 404 (`notFound()`), no un detalle vacío.
- [ ] AC4 — Dado el detalle cargado, cuando la sección "Productos parecidos" resuelve, entonces muestra hasta 4 productos activos de la misma categoría y **nunca** el producto actual; mientras carga hay skeleton, ante error hay alerta con "Reintentar" y sin coincidencias un mensaje.
- [ ] AC5 — Dado el selector en 3 unidades, cuando se pulsa "Añadir al carrito", entonces la línea entra con `quantity: 3`, el drawer se abre y el toast lo confirma.
- [ ] AC6 — Dado un producto sin stock, cuando se abre su detalle, entonces el botón y el selector están deshabilitados y se ve la etiqueta "Sin stock".
- [ ] AC7 — Dado `GET /api/public/products?category=laptops&excludeSlug=<slug>`, cuando responde, entonces ese slug no está en `items`; con `excludeSlug` de más de 140 caracteres responde 400 vía `handleApiError`.
- [ ] AC8 — Dado el detalle, cuando se inspecciona el `<title>`, entonces es `<nombre> — VOLT` y la descripción sale de `description` del producto.

## Datos
Sin cambios de esquema. El detalle usa las columnas ya existentes de `products`: `name`,
`slug`, `brand`, `description`, `price_cents`, `compare_at_price_cents`, `image_url`,
más `categories.name` / `categories.slug` por el join. `stock`, `sku` e `is_active` siguen
sin salir del servidor: la disponibilidad viaja como `inStock` derivado, igual que hoy.
Sin escritura en `audit_logs`: es lectura pública.

## API
| Método | Ruta | Auth | Query | Response |
|---|---|---|---|---|
| GET | `/api/public/products` | pública | los de 010 **+ `excludeSlug`** | `PublicProductPage` |

Zod: en `publicProductQuerySchema` se añade `excludeSlug` — mismo `emptyToUndefined`, string
trim, `max(140)` (largo de la columna), opcional. Sin `regex(SLUG_PATTERN)`: aquí no filtra
por categoría sino que excluye una fila; un slug raro debe dar "no excluye nada", no un 400.
El detalle **no** estrena endpoint: la página es Server Component y lee el repositorio directo,
igual que `/products` en 010.

## Reutilizar
- `src/modules/storefront/components/product-grid.tsx` — la sección de parecidos es un
  `ProductGrid` con `query={{ category, excludeSlug, pageSize: 4 }}`. Ya trae los tres estados
  (skeleton, error con "Reintentar", vacío). **No se escribe grilla ni tarjeta nueva.**
- `src/modules/storefront/components/product-card.tsx` — tarjeta de los parecidos; solo se le
  añade el enlace al detalle.
- `src/modules/storefront/components/product-tile.tsx` — imagen con degradado de respaldo.
- `src/modules/storefront/hooks/use-public-products.ts` · `services/public-catalog.service.ts`
  · `constants.ts` (`storefrontKeys`, `BRAND_BUTTON_CLASS`) — se usan tal cual.
- `src/server/repositories/product.repository.ts` — selección pública, `IS_ON_SALE`,
  normalización de `compareAtPriceCents`; la consulta del detalle copia ese patrón.
- `src/modules/cart/store/cart.store.ts` — `addItem`, `MAX_QUANTITY`, `clampQuantity`.
- `src/modules/cart/components/cart-drawer.tsx` — el `QuantityStepper` que hoy vive dentro se
  extrae y lo consumen drawer y detalle; **no se duplica el control**.
- `src/lib/utils.ts` (`formatPriceFromCents`, `cn`), `src/app/not-found.tsx`.
- `src/components/ui/`: `button`, `badge`, `card`, `separator`, `skeleton`. **Ningún componente
  shadcn nuevo que instalar.**

## Tareas
- [ ] T1 — `excludeSlug` en `publicProductQuerySchema` y en `PublicProductQueryInput` · `src/modules/storefront/schemas/public-catalog.schema.ts`
- [ ] T2 — Condición `ne(products.slug, query.excludeSlug)` en `listPublicProducts` · `src/server/repositories/product.repository.ts`
- [ ] T3 — `findPublicProductBySlug(slug): Promise<PublicProduct | null>` (mismos filtros de activo, join de categoría, `limit(1)`, misma normalización de `compareAtPriceCents`) · `src/server/repositories/product.repository.ts`
- [ ] T4 — `addItem(product, quantity = 1)` con `clampQuantity` al sumar y al crear la línea · `src/modules/cart/store/cart.store.ts`
- [ ] T5 — Extraer `QuantityStepper` a componente presentacional (`value`, `onChange`, `label`, `disabled`) y consumirlo desde el drawer · `src/modules/cart/components/quantity-stepper.tsx`, `cart-drawer.tsx`
- [ ] T6 — `AddToCartPanel` cliente: estado local de cantidad + `QuantityStepper` + botón con toast; deshabilitado sin stock · `src/modules/storefront/components/add-to-cart-panel.tsx`
- [ ] T7 — `ProductDetail` (server, presentacional): imagen, categoría, marca, nombre, precio + tachado + `-N%`, disponibilidad, descripción, monta `AddToCartPanel` · `src/modules/storefront/components/product-detail.tsx`
- [ ] T8 — `RelatedProducts`: encabezado + `ProductGrid` con categoría del producto y `excludeSlug` · `src/modules/storefront/components/related-products.tsx`
- [ ] T9 — Página: `await params`, `findPublicProductBySlug`, `notFound()`, `generateMetadata` · `src/app/(storefront)/products/[slug]/page.tsx`
- [ ] T10 — Skeleton de ruta · `src/app/(storefront)/products/[slug]/loading.tsx`
- [ ] T11 — Imagen y título de la tarjeta enlazan a `/products/<slug>` con `next/link` · `src/modules/storefront/components/product-card.tsx`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- **El enlace no envuelve la tarjeta entera**: dentro hay un `<button>` de añadir al carrito y
  un `<a>` no puede contener un control interactivo. Enlazan imagen y título; el botón queda
  fuera del enlace.
- **`excludeSlug` y no `excludeId`**: el cliente ya tiene el slug en la URL, así que el
  componente de parecidos no necesita conocer el id. Y el slug es único con índice.
- **Los parecidos van por hook, no por servidor.** Se resuelven en cliente con `ProductGrid`
  para no bloquear el HTML del detalle con una segunda consulta; el detalle sí es SSR.
- El descuento se calcula en la vista (`discountPercent` de `product-card.tsx`); si se usa en
  dos sitios, se sube a `constants.ts` — no antes.
- `params` es una **Promise** en Next 16 y `generateMetadata` recibe las mismas props: leer
  `node_modules/next/dist/docs/` antes de T9. Ojo con `PageProps<"/products/[slug]">`.
- T3 en una sola consulta con join, nunca producto y luego categoría por separado.
- Al extraer el stepper (T5) **no se cambian sus colores ni su comportamiento**: ese ajuste es
  una tarea BUILD independiente y mezclarlos hace irrevisable el diff.
