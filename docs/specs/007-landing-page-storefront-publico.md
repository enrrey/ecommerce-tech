---
id: 007
title: Landing page pública y endpoints públicos de catálogo
status: done
module: shared
scope: client
---

# 007 — Landing page pública y endpoints públicos de catálogo

## Objetivo
Un visitante anónimo entra a `/` y ve la landing completa (hero carrusel, categorías,
ofertas, destacados, carrito lateral) con datos reales del catálogo activo.

## Alcance
Incluye: `GET /api/public/products`, `GET /api/public/categories`, módulo
`src/modules/storefront/`, carrito en Zustand (solo estado de UI, sin persistir en BD),
tema claro/oscuro con el `ThemeProvider` existente, deps `motion` y `swiper`.
No incluye: página de listado `/products`, detalle de producto, checkout, backend del
newsletter (el submit solo muestra un toast), campos de descuento/destacado en BD,
cualquier cambio en `/api/products` o `/api/categories` (admin).

## Criterios de aceptación
- [x] AC1 — Dado un visitante sin sesión, cuando pide `GET /api/public/products`, entonces recibe 200 sin exigir auth y solo con productos `isActive` de categorías `isActive`.
- [x] AC2 — Dado un query param inválido (`page=0`, `pageSize=999`, `sort=foo`), cuando llama al endpoint, entonces recibe 400 de Zod vía `handleApiError`.
- [x] AC3 — Dada la respuesta pública, cuando se inspecciona un item, entonces no contiene `stock`, `sku`, `isActive` ni `updatedAt`; el stock viaja como booleano `inStock`.
- [x] AC4 — Dado `/`, cuando carga, entonces el hero muestra 3 slides con Swiper (autoplay 6s, flechas, dots) y las secciones animan su entrada con `motion`.
- [x] AC5 — Dada la franja de categorías, cuando carga, entonces cada tarjeta muestra el nombre y el número de productos activos de esa categoría.
- [x] AC6 — Dado el buscador del header, cuando el usuario escribe, entonces la grilla de resultados se refiltra (debounce) contra `q` y la página hace scroll a esa sección.
- [x] AC7 — Dado un producto en la grilla, cuando se añade al carrito, entonces el drawer abre, muestra cantidad y subtotal, y el estado sobrevive a la navegación cliente.
- [x] AC8 — Toda sección con datos tiene estado de carga (skeleton) y de error visible.
- [x] AC9 — Toda la landing es legible en claro y oscuro sin colores hardcodeados fuera de los tokens de `globals.css`.

## Datos
Sin cambios de esquema, sin migración. Lectura pura sobre `products` y `categories`.
Sin escritura en `audit_logs`: la regla dura 9 aplica a mutaciones y aquí no hay ninguna.

## API
| Método | Ruta | Auth | Query | Response |
|---|---|---|---|---|
| GET | `/api/public/products` | pública | `q`, `category` (slug), `sort`, `page`, `pageSize` | `{ items: PublicProduct[], page, pageSize, total }` |
| GET | `/api/public/categories` | pública | — | `PublicCategory[]` |

`PublicProduct`: `id, name, slug, description, priceCents, imageUrl, inStock, createdAt, categorySlug, categoryName`.
`PublicCategory`: `id, name, slug, description, productCount`.

Zod (`src/modules/storefront/schemas/public-catalog.schema.ts`):
`publicProductQuerySchema` — `q` string opcional trim máx 80; `category` slug opcional;
`sort` enum `newest | price-asc | price-desc` default `newest`; `page` coerce int ≥1 default 1;
`pageSize` coerce int 1..48 default 12.

## Reutilizar
- `src/lib/api-errors.ts` — `handleApiError`, ya mapea `ZodError` a 400.
- `src/lib/axios.ts` — instancia `api` (baseURL `/api`); no crear otra.
- `src/server/repositories/product.repository.ts` / `category.repository.ts` — añadir ahí las funciones nuevas, no crear repositorio paralelo.
- `src/server/db/schema/product.ts` · `category.ts` — tipos inferidos, no redeclarar campos.
- `src/components/providers/theme-provider.tsx` (next-themes, ya montado en `src/app/layout.tsx`) — el toggle solo llama `useTheme()`.
- `src/components/ui/`: `sheet` (carrito), `card`, `badge`, `button`, `input`, `separator`, `skeleton`, `sonner`. **No hace falta instalar ningún componente shadcn nuevo.**
- `src/modules/products/constants.ts` — patrón de `queryKeys` a replicar como `storefrontKeys`.
- `src/modules/cart/store/` — carpeta ya reservada para el store del carrito.

Dependencias nuevas (autorizadas): `npm i motion swiper`. Ninguna otra.

## Tareas
- [x] T1 — Instalar `motion` y `swiper` · `package.json`
- [x] T2 — Añadir `images.remotePatterns` (https, `**`) para `imageUrl` remoto · `next.config.ts`
- [x] T3 — Añadir `/api/public(.*)` a `isPublicRoute` · `src/middleware.ts`
- [x] T4 — Tipos `PublicProduct`, `PublicCategory`, `PublicProductPage` derivados del schema Drizzle · `src/modules/storefront/types/public-catalog.types.ts`
- [x] T5 — `publicProductQuerySchema` · `src/modules/storefront/schemas/public-catalog.schema.ts`
- [x] T6 — `listPublicProducts(query)` con join + filtros + orden + `limit/offset` y `count` en la misma consulta · `src/server/repositories/product.repository.ts`
- [x] T7 — `listPublicCategoriesWithCount()` con `count` agregado por join (una sola query) · `src/server/repositories/category.repository.ts`
- [x] T8 — Handler `GET /api/public/products` (parse de `searchParams` → repo → `handleApiError`) · `src/app/api/public/products/route.ts`
- [x] T9 — Handler `GET /api/public/categories` · `src/app/api/public/categories/route.ts`
- [x] T10 — Servicio axios `getPublicProducts` / `getPublicCategories` · `src/modules/storefront/services/public-catalog.service.ts`
- [x] T11 — `storefrontKeys` · `src/modules/storefront/constants.ts`
- [x] T12 — Hooks `usePublicProducts(query)` y `usePublicCategories()` · `src/modules/storefront/hooks/`
- [x] T13 — Store Zustand del carrito (add/remove/setQty/clear/isOpen, selector de subtotal en centavos) · `src/modules/cart/store/cart.store.ts`
- [x] T14 — `CartDrawer` sobre `Sheet` con stepper y subtotal · `src/modules/cart/components/cart-drawer.tsx`
- [x] T15 — `ThemeToggle` con `useTheme()` · `src/components/shared/theme-toggle.tsx`
- [x] T16 — `TrustTicker` (scroll infinito con `motion`) · `src/modules/storefront/components/trust-ticker.tsx`
- [x] T17 — `StorefrontHeader` (logo, nav, buscador, toggle, botón carrito con badge) y sustituir `Header` en el layout · `src/modules/storefront/components/storefront-header.tsx`, `src/app/(storefront)/layout.tsx`
- [x] T18 — `HeroCarousel` con Swiper (crossfade, autoplay 6s, flechas, dots) · `src/modules/storefront/components/hero-carousel.tsx`
- [x] T19 — `ProductCard` (imagen con fallback, precio formateado, badge sin stock, añadir al carrito) · `src/modules/storefront/components/product-card.tsx`
- [x] T20 — `CategoryStrip` con contador · `src/modules/storefront/components/category-strip.tsx`
- [x] T21 — `DealsSection` con countdown a medianoche + grilla · `src/modules/storefront/components/deals-section.tsx`
- [x] T22 — `FeaturedSection` (grilla conectada al buscador del header) · `src/modules/storefront/components/featured-section.tsx`
- [x] T23 — `BrandsStrip` y `BenefitsStrip` (estáticos) · `src/modules/storefront/components/`
- [x] T24 — `NewsletterSection` (RHF + Zod, submit → toast) y `StorefrontFooter` · `src/modules/storefront/components/`
- [x] T25 — Componer la landing en la raíz · `src/app/(storefront)/page.tsx`

Verificación final: `npm run typecheck && npm run lint`

## Notas
- **La raíz `/` ya la sirve `src/app/(storefront)/page.tsx`** (placeholder "Catálogo en construcción"). Se reemplaza su contenido. Crear `src/app/page.tsx` duplicaría la ruta y rompe el build.
- No existen campos de descuento ni de destacado en `products`. Decisión MVP: hero y "Destacados" = `sort=newest`; "Ofertas del día" = `sort=price-asc`; el countdown es presentacional y el badge de descuento **no** se implementa. Añadir `compareAtPriceCents`/`isFeatured` es un spec aparte (008) porque arrastra migración + formulario de admin.
- Marca "VOLT" es placeholder del diseño: confirmar con el usuario antes de T17.
- T6/T7 en una sola consulta cada uno: un `count` por categoría o por fila es N+1.
- `priceCents` es entero; formatear con `Intl.NumberFormat` usando `CURRENCY`/`CURRENCY_LOCALE` de `src/lib/constants.ts`, nunca dividiendo a float en el render de datos.
- `"use client"` solo en los componentes con estado/animación; `page.tsx` y las franjas estáticas quedan como Server Components.
### Decisiones tomadas durante la implementación

- **Tokens de color**: se *añaden* `--brand*`, `--deal*`, `--hero*` y `--tile-1..4`
  a `:root` y `.dark` de `globals.css`, registrados en `@theme inline`. No se
  reescriben `--primary`/`--accent`: el panel de administración es neutro a
  propósito y la marca índigo es una decisión del storefront. Cero color
  literal en JSX; el CTA de marca se compone sobre `Button` vía
  `BRAND_BUTTON_CLASS`.
- **Tipografía**: `Space Grotesk` se carga en `src/app/(storefront)/layout.tsx`
  (no en el layout raíz) y se expone como `--font-display`. El cuerpo sigue con
  Geist; el admin no descarga la fuente.
- **Marca "VOLT"** confirmada como placeholder por el usuario.
- **Nav del header** apunta a anclas de la propia landing (`#categorias`,
  `#ofertas`, `#catalogo`) en vez de a categorías fijas: los nombres de
  categoría son datos, no copy.
- **Sin chips de especificaciones ni precio tachado** en el hero/las tarjetas:
  no existe ese dato en `products`. El hero muestra categoría y disponibilidad.
  La etiqueta "Nuevo" se deriva de `createdAt` (< 30 días), que sí es real.
- **Artefactos no listados en las tareas** creados por necesidad:
  `catalog-filters.store.ts` (el buscador vive en el layout y la grilla en la
  página: no hay ancestro cliente común), `use-debounce`, `use-is-mounted`,
  `use-scroll-to-catalog`, `use-countdown-to-midnight`, `Reveal` (AC4),
  `ProductTile` (3 consumidores) y `ProductGrid` (estados de carga/error/vacío
  compartidos por Ofertas y Destacados).
- **`src/components/shared/header.tsx`** queda sin consumidores tras sustituirlo
  en el layout. No se borra por estar fuera del alcance; candidato a limpieza.
- **Reviewer: correr `security-review`.** Es superficie pública nueva sobre datos que hoy solo se leen desde rutas con sesión. Verificar que la proyección no filtre `stock`/`sku`, que ningún filtro permita alcanzar registros inactivos y que estos handlers no compartan código mutador con `/api/admin`.
