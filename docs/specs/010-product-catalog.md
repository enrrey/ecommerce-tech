---
id: 010
title: Catálogo público /products con filtros y wiring desde la landing
status: done
module: products
scope: client
---

# 010 — Catálogo público /products con filtros y wiring desde la landing

## Objetivo
Un visitante entra a `/products` desde cualquier CTA de la landing y ve todo el catálogo
activo, filtrable por categoría, marca, rango de precio, stock y oferta, con la selección
reflejada en la URL.

## Alcance
Incluye: columna `brand`; filtros nuevos en el endpoint público; `GET /api/public/brands`;
página `/products` con sidebar de filtros, orden y paginación; `brand` en el CRUD admin;
CTAs de la landing apuntando a `/products`.
No incluye: `/products/[slug]`, checkout, multi-select de marca/categoría, facetas con
contador, réplica visual del mockup (paleta oklch, nav píldora, botones circulares, Geist).

## Criterios de aceptación
- [x] AC1 — Dado `/products` sin query, cuando carga, entonces el HTML del servidor ya trae la primera página de productos (sin spinner inicial) y el `<title>` es el del catálogo.
- [x] AC2 — Dado `/products?category=laptops&brand=Dell&minPriceCents=50000&maxPriceCents=150000&inStock=true&onSale=true&sort=price-asc&page=2`, cuando carga, entonces la grilla aplica los ocho filtros y los chips salen marcados.
- [x] AC3 — Dado un filtro pulsado, cuando cambia, entonces la URL se reescribe (`page` vuelve a 1) sin recargar la página, y esa URL pegada en otra pestaña reproduce el mismo resultado.
- [x] AC4 — Dado un query param inválido (`sort=foo`, `minPriceCents=-1`, `page=0`), cuando entra por `/api/public/products`, entonces responde 400 vía `handleApiError`; cuando entra por la URL de la página, entonces la página cae a los defaults y renderiza, no rompe.
- [x] AC5 — Dado un filtro sin coincidencias, cuando se aplica, entonces se ve el estado vacío con botón "Limpiar filtros" que devuelve a `/products`.
- [x] AC6 — Dado el botón "Ver catálogo" del hero, una tarjeta de `CategoryStrip`, el link "Ver todo el catálogo" de Destacados o el nav "Catálogo", cuando se pulsan, entonces navegan a `/products` con el filtro correspondiente ya aplicado.
- [x] AC7 — Dado el buscador del header estando en `/products`, cuando se envía, entonces actualiza `?q=` de la URL; estando en `/`, conserva el comportamiento actual (store + scroll a `#catalogo`).
- [x] AC8 — Dada la respuesta de `/api/public/products`, cuando se inspecciona un item, entonces trae `brand` y sigue sin `stock`, `sku` ni `isActive`.
- [x] AC9 — Dado el formulario de producto del admin, cuando se guarda con marca, entonces persiste y aparece en la columna "Marca" de la tabla y en el filtro público.
- [x] AC10 — En móvil los filtros viven en un `Sheet` abierto por un botón "Filtros"; la grilla es de 2 columnas y de 3 en desktop.

## Datos
`products.brand` · `varchar(60)` · **nullable**, sin default. **Requiere migración**
(`npm run db:generate` + `db:migrate`). Índice `products_brand_idx` sobre `brand`.
Nullable y no `NOT NULL DEFAULT`: las filas existentes no tienen marca real y un default
tipo `'Genérico'` inventaría un dato y ensuciaría la faceta con un bucket falso. Sin
backfill: `getPublicBrands()` descarta `NULL` y la sección de marca se oculta si vuelve vacía.
Sin escritura en `audit_logs`: la lectura pública no muta nada; el CRUD admin ya audita.

## API
| Método | Ruta | Auth | Query | Response |
|---|---|---|---|---|
| GET | `/api/public/products` | pública | `q`, `category`, `brand`, `minPriceCents`, `maxPriceCents`, `inStock`, `onSale`, `sort`, `page`, `pageSize` | `{ items: PublicProduct[], page, pageSize, total }` |
| GET | `/api/public/brands` | pública | — | `string[]` |

Zod, en `publicProductQuerySchema` (campos nuevos, todos opcionales, mismo `emptyToUndefined`):
`brand` string trim máx 60; `minPriceCents`/`maxPriceCents` coerce int ≥0 y ≤20_000_000, con
`refine` de `min <= max`; `inStock` y `onSale` como `z.enum(["true","false"]).transform(v => v === "true")`.
`sort` no cambia: el "mayor descuento" del mockup es el `deals` que ya existe.
`PublicProduct` suma `brand: string | null`.

## Reutilizar
- `src/modules/storefront/components/product-grid.tsx` · `product-card.tsx` — grilla, tarjeta, loading/error/vacío y "Añadir al carrito". No se escribe tarjeta nueva.
- `src/modules/storefront/hooks/use-public-products.ts` · `services/public-catalog.service.ts` · `constants.ts` (`storefrontKeys`) — se extienden, no se duplican.
- `src/server/repositories/product.repository.ts` — `listPublicProducts` (ahí van los filtros), `IS_ON_SALE`, `escapeLikePattern`, `PUBLIC_PRODUCT_ORDER`.
- `src/server/repositories/category.repository.ts` — `listPublicCategoriesWithCount()`, patrón a copiar para las marcas.
- `src/modules/cart/components/cart-drawer.tsx` + `src/app/(storefront)/layout.tsx` — carrito ya montado globalmente; el panel del mockup NO se reimplementa.
- `src/lib/api-errors.ts` (`handleApiError`), `src/lib/axios.ts` (`api`), `src/lib/constants.ts` (`CURRENCY`).
- `src/components/ui/`: `button`, `badge`, `card`, `select`, `sheet`, `separator`, `skeleton`, `input`. **No hace falta instalar ningún componente shadcn nuevo.**
- `src/modules/products/schemas/product.schema.ts` — patrón `""` → `null` de `imageUrl` para `brand` en el admin.

## Tareas
- [x] T1 — Columna `brand` + índice · `src/server/db/schema/product.ts`
- [x] T2 — Generar y aplicar migración · `drizzle/`
- [x] T3 — `brand` en `PublicProduct` · `src/modules/storefront/types/public-catalog.types.ts`
- [x] T4 — Campos nuevos + `refine` de rango en `publicProductQuerySchema` y en `PublicProductQueryInput` · `src/modules/storefront/schemas/public-catalog.schema.ts`
- [x] T5 — Filtros nuevos y `brand` en la selección de `listPublicProducts` · `src/server/repositories/product.repository.ts`
- [x] T6 — `listPublicBrands()` (`select distinct brand` de productos y categorías activas, `brand is not null`, orden asc) · `src/server/repositories/product.repository.ts`
- [x] T7 — Handler `GET /api/public/brands` · `src/app/api/public/brands/route.ts`
- [x] T8 — `getPublicBrands()` + clave `storefrontKeys.brands()` · `src/modules/storefront/services/public-catalog.service.ts`, `constants.ts`
- [x] T9 — Hook `usePublicBrands()` · `src/modules/storefront/hooks/use-public-brands.ts`
- [x] T10 — `initialData` opcional en `usePublicProducts` y en las props de `ProductGrid` · `src/modules/storefront/hooks/use-public-products.ts`, `components/product-grid.tsx`
- [x] T11 — Buckets de precio y helpers de URL (`buildCatalogHref`, `parseCatalogSearchParams`) · `src/modules/storefront/lib/catalog-url.ts`
- [x] T12 — `CatalogFilters` (chips de categoría, precio, marca, disponibilidad; `Sheet` en móvil) · `src/modules/storefront/components/catalog-filters.tsx`
- [x] T13 — `CatalogToolbar` (título, contador de resultados, `Select` de orden) y `CatalogPagination` · `src/modules/storefront/components/`
- [x] T14 — `CatalogView` cliente: lee `useSearchParams`, compone T12+T13+`ProductGrid`, escribe con `router.replace` · `src/modules/storefront/components/catalog-view.tsx`
- [x] T15 — Página Server Component: `await searchParams`, `safeParse`, lectura por repositorio, `metadata` · `src/app/(storefront)/products/page.tsx`
- [x] T16 — Hero: `<a href="#catalogo">` → `Link href="/products"` · `src/modules/storefront/components/hero-carousel.tsx`
- [x] T17 — `CategoryStrip`: tarjeta → `Link href={/products?category=<slug>}`; quitar store y scroll · `src/modules/storefront/components/category-strip.tsx`
- [x] T18 — Podar `categorySlug` del store (queda sin escritor) y de `FeaturedSection`; añadir link "Ver todo el catálogo" → `/products` · `src/modules/storefront/store/catalog-filters.store.ts`, `components/featured-section.tsx`
- [x] T19 — Nav: "Destacados" → "Catálogo" con `Link href="/products"`, anclas a `/#categorias` y `/#ofertas`; `SearchField` empuja a `/products?q=` fuera de `/` (rama por `usePathname`) · `src/modules/storefront/components/storefront-header.tsx`
- [x] T20 — `brand` en Zod admin (`""` → `null`), input en el formulario y columna en la tabla · `src/modules/products/schemas/product.schema.ts`, `components/product-form-dialog.tsx`, `components/product-columns.tsx`
- [x] T21 — Seed idempotente de categorías y ~7 productos con marca (Dell, Lenovo, Keychron, Logitech, LG, Sony, Samsung) · `src/server/db/seed.ts`

Verificación final: `npm run typecheck && npm run lint`

## Notas
- **Marca single-select**, no multi-select como el mockup: el handler parsea con
  `Object.fromEntries(searchParams)`, que colapsa claves repetidas y perdería los valores
  extra en silencio. Un click selecciona, otro limpia (mismo gesto que la categoría hoy).
- **`z.coerce.boolean()` está prohibido aquí**: en un query string `"false"` es una cadena
  no vacía y coerce daría `true`. De ahí el `z.enum(["true","false"]).transform(...)`.
- **Buckets de precio = presentación**. El repo recibe `minPriceCents`/`maxPriceCents`
  sueltos; los rangos del mockup (`< 500`, `500–1500`, `1500–4000`, `> 4000`, en centavos)
  son constantes de UI en T11 y no viajan como identificador al servidor.
- **`onSale` filtra, `sort=deals` ordena.** Son cosas distintas y conviven: `deals` no puede
  vaciar la sección "Ofertas del día" de la home, por eso nunca se convirtió en filtro.
- **La URL es el único estado de `/products`.** `useCatalogFiltersStore` no se lee ni se
  escribe en esta página: sigue siendo del preview de la home. Si el developer lo conecta,
  el back del navegador y el estado de Zustand se desincronizan.
- `staleTime` es 60s (`src/lib/query-client.ts`): el `initialData` de T10 vale para la
  primera clave y cualquier cambio de filtro genera clave nueva y refetch. Correcto, pero
  no añadir `initialDataUpdatedAt` sin motivo o se pierde el ahorro del SSR.
- En Next 16 `searchParams` de la página es una **Promise** y `useSearchParams` exige
  frontera de `Suspense`. Leer `node_modules/next/dist/docs/` antes de T14/T15.
- T5 y T6 en una sola consulta cada uno; el `count(*) over()` ya existente se mantiene.
  Un `select distinct` por marca dentro de un map sería N+1.
- **Reviewer: correr `security-review`.** Se amplía la superficie de filtros del endpoint
  público: verificar que ningún filtro nuevo (`inStock`, `onSale`, rango) permita inferir
  o alcanzar productos/categorías inactivos, y que `brand` no rompa el escape de LIKE.
