---
id: 009
title: Navegación superior y unificación visual del admin
status: done
module: shared
scope: admin
---

# 009 — Navegación superior y unificación visual del admin

## Objetivo
Un administrador navega el panel desde una barra superior con la misma identidad
visual que la landing pública (marca, tokens `--brand`, tipografía display),
en lugar del sidebar gris actual.

## Alcance
Incluye:
- Sustituir el `<aside w-56>` de `admin/layout.tsx` por un header horizontal sticky.
- `AdminNav` pasa de columna a fila (Panel, Productos, Categorías, Roles).
- Marca "VOLT" + distintivo "Admin", `ThemeToggle`, `UserButton` y enlace "Ver tienda".
- Tipografía `Space Grotesk` compartida entre storefront y admin.

No incluye:
- Cambios de autorización. `middleware.ts` (`/admin(.*)`, `/api/admin(.*)`) y los
  `requirePermission(...)` de cada handler quedan intactos: este spec es chrome.
- Contenido de las páginas admin (tablas, formularios, diálogos).
- La landing pública. La sección "Ofertas" del storefront no se toca.
- Rutas `admin/orders`, `admin/audit-logs`, `admin/customers`: `orders/page.tsx` es
  hoy una página sonda (`probe-orders`) y las otras dos carpetas están vacías → no
  entran al nav.

## Decisiones de diseño
- **Re-branding acotado**: sólo el chrome (header, logotipo, estado activo del nav)
  usa `--brand`. Botones de acción, tablas y diálogos siguen con `--primary`/`--accent`
  neutros de shadcn. Evita parches sueltos y no rompe componentes ya implementados.
- **Contenedor**: `main` a ancho `max-w-[1400px]` centrado con padding, igual que el
  header del admin. No se usa el `max-w-[1200px]` del storefront porque las tablas
  admin necesitan más ancho; lo que unifica es el estilo del chrome, no la medida.
- **Responsive sin hamburguesa**: 4 enlaces cortos caben apilados. El header usa
  `flex-col` en móvil (fila de marca + fila de nav) y `lg:flex-row`, mismo patrón que
  `storefront-header.tsx`. Sin `Sheet`, sin estado nuevo.
- **Fuente**: `Space Grotesk` se extrae a `src/lib/fonts.ts` y se aplica en ambos
  layouts. Hoy `--font-display` cae a Geist fuera del storefront (fallback en
  `globals.css:52`), así que sin esto el wordmark del admin no coincidiría.

## Criterios de aceptación
- [x] AC1 — Dado un admin autenticado en cualquier ruta `/admin/*`, cuando carga la
      página, entonces ve una barra superior sticky con marca a la izquierda y los
      enlaces Panel · Productos · Categorías · Roles en horizontal, y ya no existe
      el sidebar lateral.
- [x] AC2 — Dado que está en `/admin/products`, cuando mira el nav, entonces
      "Productos" aparece con acento de marca y `aria-current="page"`; "Panel" sólo
      se marca activo en `/admin` exacto (coincidencia `exact` actual preservada).
- [x] AC3 — Dado el toggle de tema en el header, cuando alterna claro/oscuro,
      entonces header, nav activo y contenido se leen con contraste correcto en
      ambos temas (los tokens `--brand*` ya tienen variante `.dark`).
- [x] AC4 — Dado un ancho de 375px, cuando carga `/admin`, entonces los 4 enlaces
      son visibles y pulsables sin scroll horizontal ni solape con la marca.
- [x] AC5 — Dado un usuario sin permiso de admin, cuando entra a `/admin/roles`,
      entonces sigue siendo rechazado igual que antes: no se modifica `middleware.ts`
      ni ningún `requirePermission`. `git diff` no toca archivos de auth.
- [x] AC6 — `npm run typecheck && npm run lint` en verde y la landing pública se
      renderiza sin regresión (header, "Ofertas", tipografía).

## Datos
Sin cambios de esquema.

## API
Sin cambios de API. Ningún Route Handler nuevo ni modificado.

## Reutilizar
- `src/components/shared/theme-toggle.tsx` — botón de tema tal cual (el
  `ThemeProvider` ya está en el layout raíz, el admin sólo carecía del botón).
- `src/modules/storefront/components/storefront-header.tsx` — referencia de
  composición: sticky + `bg-background/85` + `backdrop-blur-md` + `border-b`,
  `BrandLogo` (icono `ZapIcon` en cuadro `bg-brand` + wordmark `font-display`),
  y patrón responsive `flex-col … lg:flex-row lg:h-19`. Copiar el patrón, no
  importar el componente (arrastra carrito, buscador y stores del storefront).
- `src/app/globals.css` — tokens `--brand`, `--brand-foreground`, `--brand-soft`,
  `--brand-hover` y `--font-display` ya definidos. No añadir tokens nuevos ni
  arbitrary values de Tailwind para colores.
- `src/components/ui/button.tsx`, `@clerk/nextjs` (`UserButton`), `lucide-react`
  (`ZapIcon`, iconos ya usados en `ADMIN_NAV_ITEMS`), `@/lib/utils` (`cn`).
- No hace falta instalar ningún componente shadcn nuevo.

## Tareas
- [x] T1 — Crear módulo de fuente compartida exportando `spaceGrotesk`
      (`variable: "--font-space-grotesk"`, weights 500/600/700) · `src/lib/fonts.ts`
- [x] T2 — Importar `spaceGrotesk` desde `@/lib/fonts` y borrar la declaración
      local, sin cambiar el render · `src/app/(storefront)/layout.tsx`
- [x] T3 — Reescribir `AdminNav` como fila horizontal: `flex items-center gap-1`,
      activo `bg-brand-soft text-brand font-semibold`, inactivo
      `text-muted-foreground hover:bg-muted`; conservar `ADMIN_NAV_ITEMS`, la lógica
      `exact`/`startsWith` y `aria-current` · `src/components/shared/admin-nav.tsx`
- [x] T4 — Crear `AdminHeader` (client) que componga marca "VOLT" + badge "Admin"
      enlazando a `/admin`, `<AdminNav/>`, enlace "Ver tienda" a `/`, `<ThemeToggle/>`
      y `<UserButton/>`, con el patrón responsive de la decisión
      · `src/components/shared/admin-header.tsx`
- [x] T5 — Sustituir el `<aside>` por `<AdminHeader/>` y envolver `children` en
      `main` con `mx-auto w-full max-w-[1400px] px-5 py-6`, aplicando
      `spaceGrotesk.variable` al contenedor raíz del layout
      · `src/app/(admin)/admin/layout.tsx`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- Numerado 009 (no 008) por indicación del orchestrator: 008 (precio de comparación)
  está en vuelo. Verificado que no hay solape de archivos: 008 toca
  `products-table.tsx`/`product-columns.tsx`, este spec sólo `layout.tsx`,
  `admin-nav.tsx`, `admin-header.tsx`, `fonts.ts` y `(storefront)/layout.tsx`.
- `next/font` debe llamarse en scope de módulo; por eso T1 crea un archivo propio en
  lugar de invocar `Space_Grotesk()` dentro de un componente.
- El header es cliente (`usePathname`, `useTheme`); mantener `"use client"` en
  `admin-header.tsx` y no en `admin/layout.tsx`.
