---
id: 001
title: Administración de categorías (CRUD)
status: in-review
module: categories
scope: admin
created: 2026-08-28
---

# 001 — Administración de categorías (CRUD)

> **Fase 1 de 2.** Este spec cubre **solo** categorías. El CRUD de productos es un
> spec posterior e independiente (`002-products`), que no arranca hasta que esta
> fase esté aprobada, implementada y probada manualmente por el usuario.

## 1. Contexto

El catálogo del e-commerce necesita una taxonomía antes de poder cargar productos:
`products.category_id` apuntará a esta tabla (SETUP §5.3, relación 1—N). Hoy la
base de datos de Neon está vacía —`drizzle/meta/_journal.json` no tiene ninguna
migración aplicada y `src/server/db/schema/index.ts` es un barrel vacío
(`export {}`)—, y `src/app/(admin)/admin/categories/` es una carpeta placeholder
con un `.gitkeep`.

Además de crear el dato, esta fase estrena las capas del flujo obligatorio de
SETUP §4 (repositorio → Route Handler → service → hook → componente): es la
plantilla vertical que copiará el spec de productos. Por eso el criterio no es
solo "que funcione el CRUD", sino que las cinco capas queden bien separadas.

## 2. Objetivo

Un administrador autenticado puede crear, consultar, editar y eliminar categorías
desde `/admin/categories`, sobre un listado con TanStack Table que permite buscar
por nombre y filtrar por estado.

## 3. Alcance

### Incluye

- Tabla `categories` en Neon vía migración Drizzle generada con `drizzle-kit`.
- Endpoints `/api/categories` y `/api/categories/[id]` con validación Zod.
- Repositorio `category.repository.ts` como único punto de acceso a la BD.
- Service axios + hooks de TanStack Query (1 query + 3 mutaciones).
- Vista `/admin/categories`: TanStack Table v8 con buscador por nombre, filtro por
  estado, ordenamiento y paginación en cliente.
- Diálogo de creación/edición (React Hook Form + Zod) y diálogo de confirmación de
  borrado.
- Estados de carga, error y vacío en la vista.
- Enlace a la sección en el sidebar de `src/app/(admin)/admin/layout.tsx`, que hoy
  es un `<aside>` vacío y deja la página inalcanzable por navegación.

### No incluye (explícito)

- **Cualquier tarea de productos.** Ni schema, ni FK `products.category_id`, ni UI.
- RBAC real (`requirePermission`, tablas `roles`/`permissions`/`user_roles`). Spec aparte.
- Escritura en `audit_logs` (la tabla no existe todavía). Spec aparte.
- Subcategorías / jerarquía (`parent_id`). Ver §8 y §11.
- Imagen o ícono de categoría, orden manual (`sort_order`), SEO meta.
- Borrado lógico (`deleted_at`) y papelera.
- Prefetch en servidor con `HydrationBoundary`.

## 4. Criterios de aceptación

- [ ] **AC1** — Dado un usuario con sesión Clerk activa, cuando visita
      `/admin/categories`, entonces ve la tabla de categorías con las columnas
      Nombre, Slug, Estado, Creada y Acciones.
- [x] **AC2** — Dado un usuario sin sesión, cuando visita `/admin/categories`,
      `middleware.ts` lo redirige a `/sign-in`. `/api/categories(.*)` es pública en
      `middleware.ts` (no pasa por `auth.protect()`), así que la protección corre
      dentro del handler: `POST`, `PATCH` y `DELETE` sin sesión responden `401` por
      `requireAuth()`, sin tocar la base de datos; `GET` responde `200` sin sesión,
      porque es lectura pública.
- [ ] **AC3** — Dado el formulario de creación, cuando envía nombre `"Laptops"` y
      slug `"laptops"`, entonces se crea la categoría, la tabla se refresca sin
      recarga de página y aparece el toast `"Categoría creada"`.
- [ ] **AC4** — Dado un slug ya existente, cuando intenta crear otra categoría con
      el mismo slug, entonces la API responde `409` y la UI muestra
      `"Ya existe una categoría con ese slug"` sin cerrar el diálogo.
- [ ] **AC5** — Dado un nombre de 1 carácter o un slug con mayúsculas/espacios,
      cuando envía el formulario, entonces la validación Zod lo bloquea en cliente
      y, si se fuerza la petición, la API responde `400` con el detalle del campo.
- [ ] **AC6** — Dada una categoría existente, cuando la edita y guarda, entonces la
      fila refleja los cambios, `updated_at` avanza y aparece `"Categoría actualizada"`.
- [ ] **AC7** — Dada una categoría existente, cuando pulsa eliminar, entonces
      aparece un diálogo de confirmación; al confirmar la fila desaparece y sale
      `"Categoría eliminada"`; al cancelar no ocurre nada.
- [ ] **AC8** — Dado el buscador, cuando escribe `"lap"`, entonces la tabla muestra
      solo las categorías cuyo nombre contiene `"lap"`, sin distinguir mayúsculas.
- [ ] **AC9** — Dado el filtro de estado en `"Inactivas"`, entonces la tabla muestra
      solo las categorías con `is_active = false`.
- [ ] **AC10** — Dado que la consulta está en curso, entonces se muestran filas
      skeleton; si falla, un mensaje de error con botón `"Reintentar"`; si no hay
      datos, un estado vacío con acción `"Nueva categoría"`.
- [ ] **AC11** — Dado un filtro que no arroja resultados, entonces la tabla muestra
      `"Sin resultados para la búsqueda"`, distinto del estado vacío de AC10.
- [x] **AC12** — `npm run typecheck && npm run lint && npm run build` en verde, sin
      `any` ni `@ts-ignore`.

## 5. Modelo de datos

Tabla **nueva** `categories`. **Requiere migración** (`npm run db:generate` +
`npm run db:migrate`). Es la primera migración del proyecto: la base está vacía,
por lo que es puramente aditiva, no hay ventana de compatibilidad ni datos que
preservar, y el rollback es un `DROP TABLE` sin pérdida (§10).

| Columna | Tipo Postgres | Constraints | Nota |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Consistente con `audit_logs` (SETUP §5.2) |
| `name` | `varchar(80)` | `NOT NULL` | Nombre visible |
| `slug` | `varchar(80)` | `NOT NULL`, `UNIQUE` | Identificador de URL del storefront |
| `description` | `text` | nullable | Texto libre, máx. 500 en validación |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Visibilidad en storefront; alimenta el filtro de estado |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Refrescado por `$onUpdate` en el repositorio |

Índices:

- `categories_slug_unique` — único sobre `slug`. Sirve como guardia de integridad
  y como índice de lookup del storefront (`/products/[slug]`).
- `categories_name_idx` — btree sobre `name`, soporta el `ORDER BY name ASC` por defecto.

Sin `price`: la regla de precios en centavos no aplica a esta tabla.

```ts
// src/server/db/schema/category.ts — firma propuesta
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => [
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_name_idx").on(table.name),
  ],
);
```

**Restricción dura para el developer:** `src/server/db/schema/category.ts` **no**
debe importar `server-only`. El módulo cliente deriva sus tipos de este archivo con
`import type` (borrado en compilación); un import de valor o un `server-only` aquí
rompería el build del cliente.

```ts
// src/modules/categories/types/category.types.ts
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { categories } from "@/server/db/schema/category";

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;
```

## 6. Contratos de API

Base: `src/lib/axios.ts` ya define `baseURL = "/api"`, por lo que el service llama
a `/categories`.

Ruta según `docs/SETUP.md` §3: `categories` vive en el nivel superior de `api/`
(`app/api/categories/route.ts`), no bajo `admin/`. `admin/` en SETUP está reservado
para recursos sin contraparte de lectura pública (`metrics`, `roles`, `permissions`,
`audit-logs`); `categories` sí la tiene —el storefront necesita `GET /api/categories`
público—, así que lectura pública y mutación admin comparten el mismo Route
Handler, diferenciadas por método HTTP y por `requireAuth()` dentro del handler
para `POST`/`PATCH`/`DELETE`. El `GET` de esta fase es la misma lectura que
reutilizará el storefront: no hay una ruta pública distinta pendiente de crear.

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/api/categories` | pública (sin auth) | — | `200` `Category[]` (orden `name` asc) | 500 |
| POST | `/api/categories` | sesión Clerk | `CreateCategoryInput` | `201` `Category` | 400, 401, 409, 500 |
| GET | `/api/categories/[id]` | pública (sin auth) | — | `200` `Category` | 400, 404, 500 |
| PATCH | `/api/categories/[id]` | sesión Clerk | `UpdateCategoryInput` | `200` `Category` | 400, 401, 404, 409, 500 |
| DELETE | `/api/categories/[id]` | sesión Clerk | — | `204` sin cuerpo | 400, 401, 404, 500 |

**Auth de esta fase — provisional y explícita.** `requirePermission()` y las tablas
de RBAC **no existen todavía**. La única verificación válida hoy es *sesión Clerk
activa*, y aquí corre en **una sola capa, no dos**: `middleware.ts` marca
`/api/categories(.*)` como ruta **pública** (no pasa por `auth.protect()`), a
diferencia de `/api/admin(.*)`. Eso significa que `requireAuth()` en
`src/lib/auth.ts` —que lee `auth()` de `@clerk/nextjs/server` y lanza
`UnauthorizedError` si no hay `userId`— no es una defensa en profundidad opcional
sobre lo que ya bloqueó el middleware: es la **única** protección real para
`POST`/`PATCH`/`DELETE`. `GET` no lleva `requireAuth()`: es lectura pública a
propósito.

Prohibido inventar un `requirePermission()` a medias y prohibido comparar
`role === 'admin'` (CLAUDE.md regla 8). Cada handler lleva un comentario
`// TODO(spec-rbac)` señalando el permiso destino (`categories.read`,
`categories.create`, `categories.update`, `categories.delete`).

Forma del error, uniforme para toda respuesta no-2xx —`src/lib/axios.ts` ya
extrae `error.response.data.message`:

```jsonc
{ "message": "Texto en español para el usuario", "issues": [] } // issues solo en 400
```

Schemas Zod (Zod 4, `src/modules/categories/schemas/category.schema.ts`, compartido
cliente/servidor — sin imports de servidor):

```ts
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createCategorySchema = z.object({
  name: z.string().trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre no puede superar 80 caracteres"),
  slug: z.string().trim().toLowerCase()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(80, "El slug no puede superar 80 caracteres")
    .regex(SLUG_PATTERN, "Usa solo minúsculas, números y guiones"),
  description: z.string().trim()
    .max(500, "La descripción no puede superar 500 caracteres")
    .nullish()
    .transform((value) => (value ? value : null)),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Debes enviar al menos un campo para actualizar" },
);

export const categoryIdSchema = z.uuid("Identificador de categoría inválido");

export type CreateCategoryInput = z.output<typeof createCategorySchema>;
export type UpdateCategoryInput = z.output<typeof updateCategorySchema>;
export type CategoryFormValues = z.input<typeof createCategorySchema>;
```

Salida: no se declara un schema Zod de respuesta. El contrato de salida es
`Category`, inferido del schema Drizzle (regla dura 5); duplicarlo en Zod sería
mantener el mismo tipo dos veces.

## 7. Arquitectura y archivos afectados

```
src/server/db/schema/category.ts          NUEVO  tabla categories
src/server/db/schema/index.ts             EDITA  barrel: reemplaza `export {}`
drizzle/00XX_*.sql + meta/               NUEVO  generado, no editar a mano

src/lib/auth.ts                           NUEVO  requireAuth() — sesión Clerk
src/lib/api-errors.ts                     NUEVO  clases de error + handleApiError()
src/lib/utils.ts                          EDITA  + slugify()

src/server/repositories/category.repository.ts   NUEVO  única capa que toca Drizzle

src/app/api/categories/route.ts            NUEVO  GET, POST
src/app/api/categories/[id]/route.ts       NUEVO  GET, PATCH, DELETE

src/modules/categories/types/category.types.ts       NUEVO  tipos inferidos
src/modules/categories/schemas/category.schema.ts    NUEVO  Zod compartido
src/modules/categories/constants.ts                  NUEVO  categoryKeys, opciones de filtro
src/modules/categories/services/category.service.ts  NUEVO  axios tipado
src/modules/categories/hooks/use-categories.ts       NUEVO  useQuery
src/modules/categories/hooks/use-category-mutations.ts NUEVO create/update/delete
src/modules/categories/components/category-form-dialog.tsx  NUEVO
src/modules/categories/components/category-columns.tsx      NUEVO
src/modules/categories/components/categories-table.tsx      NUEVO
src/modules/categories/components/delete-category-dialog.tsx NUEVO
src/modules/categories/components/categories-view.tsx        NUEVO  orquestador "use client"
src/modules/categories/store/                        SIN USO (queda .gitkeep)

src/app/(admin)/admin/categories/page.tsx  NUEVO  Server Component, solo compone
src/app/(admin)/admin/layout.tsx           EDITA  sidebar con enlace

src/components/ui/{alert-dialog,textarea,switch}.tsx  NUEVO vía npx shadcn
```

Frontera de cliente: `page.tsx` es Server Component (título + `<CategoriesView />`).
`"use client"` entra en `categories-view.tsx` y desciende a tabla, columnas y
diálogos (regla dura 7).

## 8. Decisiones técnicas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| **Sin `parent_id` en esta fase** (taxonomía plana) | FK auto-referencial para subcategorías | No fue pedido y su costo diferido es cero: añadirlo después es `ALTER TABLE ADD COLUMN parent_id uuid NULL REFERENCES categories(id)`, aditivo, sin migrar datos, sin romper filas existentes. Incluirlo ahora arrastraría hoy render de árbol, prevención de ciclos, política de borrado en cascada y profundidad máxima —todo sin un caso de uso que lo justifique. Se difiere con criterio de reapertura en §11. |
| `uuid` como PK | `serial` / `bigserial` | Coincide con `audit_logs` (SETUP §5.2), no filtra volumen de negocio en URLs y permite generar el id en cliente si algún día hace falta. |
| Timestamps `mode: "string"` | `mode: "date"` (default de Drizzle) | La API viaja en JSON: con `mode:"date"` el tipo inferido diría `Date` mientras el cliente recibe `string`, obligando a un DTO paralelo que viola la regla dura 5. Con `mode:"string"` un solo tipo describe servidor y cliente. El formateo de fecha se hace en la celda con `Intl`/`toLocaleDateString("es")`. |
| `is_active` booleano | Enum `status` (`draft`/`published`/`archived`) | Solo hay dos estados reales hoy. El enum es una migración de tipo cuando aparezca el tercero, no un rediseño. Además da contenido real al requisito de "filtros". |
| Slug editable, validado con regex; `slugify()` solo **sugiere** al escribir el nombre | Derivar el slug del nombre siempre en servidor | Si el slug se regenera al renombrar, se rompen las URLs públicas ya indexadas. El usuario debe decidir explícitamente cuándo cambia una URL. |
| Unicidad de slug delegada al constraint `UNIQUE` + captura de `23505` → `409` | `SELECT` previo de existencia y luego `INSERT` | El check-then-insert tiene una condición de carrera real entre dos peticiones concurrentes; el constraint no. Menos código y correcto bajo concurrencia. |
| **Buscador, filtro, orden y paginación en cliente** con `getFilteredRowModel` / `getSortedRowModel` / `getPaginationRowModel`; el `GET` devuelve la lista completa | Filtrado y paginación server-side con query params | Una taxonomía de e-commerce son decenas de filas, no miles. Server-side exigiría params, debounce, `placeholderData`, sincronización de estado de paginación y invalidaciones por clave compuesta, sin beneficio medible. Umbral de reapertura en §11. |
| `handleApiError()` compartido en `src/lib/api-errors.ts` | `try/catch` con escalera de `if` en cada handler | Son 5 handlers con el mismo mapeo error→HTTP. Supera el umbral DRY de tres repeticiones y evita que un handler devuelva `500` donde otro devuelve `409`. |
| Toasts (`sonner`, ya montado en `layout.tsx`) dentro de los hooks de mutación | Toast en cada componente que dispara la mutación | Un solo lugar por operación, mensaje consistente. Los componentes solo cierran su diálogo en `onSuccess`. |
| Sin store Zustand | Estado de tabla/diálogos en Zustand | El estado es local a una vista. Regla dura 6: Zustand solo para estado de UI **global**. |
| Sin `<EmptyState>` compartido | Extraer a `src/components/shared/empty-state.tsx` | Un único consumidor. CLAUDE.md §6: nada de abstracciones con un solo consumidor; se extrae a la tercera repetición. |
| `requireAuth()` (solo sesión) | `requireAdmin()` comparando rol | CLAUDE.md regla 8 prohíbe comparar nombres de rol. Sin tablas de RBAC, "sesión activa" es la única verificación honesta disponible; queda marcada como provisional. |

**Skills.** Del mapa de CLAUDE.md §8 aplicaban `vercel:nextjs`, `vercel:shadcn`,
`vercel:vercel-storage` y `clerk-nextjs-patterns`; **ninguna está instalada en esta
sesión**, así que el spec se redactó sin ellas y las decisiones de arriba se
sostienen en `docs/SETUP.md` y en la lectura directa del código. Sí se usó la skill
`migration`, que fundamenta la estrategia de §5 y §10: camino de ida y de vuelta
explícitos, pasos destructivos separados y autorizados aparte, y verificación de la
transición antes de dar por cerrada la tarea.

## 9. Tareas

- [x] **T1** — Instalar los componentes shadcn faltantes: `npx shadcn@latest add alert-dialog textarea switch` · archivos: `src/components/ui/{alert-dialog,textarea,switch}.tsx` · verificación: los tres archivos existen y `npm run typecheck` pasa. No escribirlos a mano.
- [x] **T2** — Crear el schema Drizzle de `categories` según §5 · archivo: `src/server/db/schema/category.ts` · verificación: `npm run typecheck`.
- [x] **T3** — Exportar la tabla desde el barrel, reemplazando `export {}` · archivo: `src/server/db/schema/index.ts` · verificación: `npm run typecheck`.
- [x] **T4** — Generar la migración con `npm run db:generate` · archivos: `drizzle/00XX_*.sql`, `drizzle/meta/*` (generados, no editar) · verificación: el `.sql` contiene `CREATE TABLE "categories"`, la constraint única de `slug` y el índice de `name`; **ningún** `DROP`.
- [x] **T5** — Aplicar la migración con `npm run db:migrate` · verificación: `npm run db:studio` muestra la tabla `categories` vacía con las 7 columnas de §5.
- [x] **T6** — Definir los tipos inferidos `Category` / `NewCategory` con `import type` · archivo: `src/modules/categories/types/category.types.ts` · verificación: `npm run typecheck`.
- [x] **T7** — Escribir los schemas Zod de §6 · archivo: `src/modules/categories/schemas/category.schema.ts` · verificación: `npm run typecheck`; sin imports de `@/server/db` en valor.
- [x] **T8** — Añadir `slugify(value: string): string` (normaliza acentos, minúsculas, separa por guiones, recorta) · archivo: `src/lib/utils.ts` · verificación: `slugify("Cámaras y Vídeo")` → `"camaras-y-video"`.
- [x] **T9** — Crear las clases de error de dominio (`UnauthorizedError`, `NotFoundError`, `ConflictError`) y `handleApiError(error): NextResponse` con el mapeo 401/404/409/400 (`ZodError`) / 409 (`code === "23505"`) / 500 · archivo: `src/lib/api-errors.ts` · verificación: `npm run typecheck`; el guard del código Postgres no usa `any`.
- [x] **T10** — Crear `requireAuth(): Promise<string>` sobre `auth()` de `@clerk/nextjs/server`, que devuelve el `userId` o lanza `UnauthorizedError` · archivo: `src/lib/auth.ts` · verificación: `npm run typecheck`. No añadir `requireAdmin` ni comparar roles.
- [x] **T11** — Implementar el repositorio con `listCategories`, `findCategoryById`, `createCategory`, `updateCategory`, `deleteCategory` (todas con `.returning()` donde aplique; `list` ordena por `name` asc) · archivo: `src/server/repositories/category.repository.ts` · verificación: `npm run typecheck`; es el único archivo del cambio que importa `db`.
- [x] **T12** — Route Handler de colección: `GET` (lista, sin auth) y `POST` (empieza por `requireAuth()`, valida con `createCategorySchema`, luego repositorio) · archivo: `src/app/api/categories/route.ts` · verificación: `npm run build`; `POST` sin sesión responde `401` (el middleware no interviene, la ruta es pública); `POST` cierra con `handleApiError`; comentario `TODO(spec-rbac)` presente.
- [x] **T13** — Route Handler de detalle: `GET` (sin auth), `PATCH`/`DELETE` (empiezan por `requireAuth()`), validando el `id` con `categoryIdSchema` y el cuerpo con `updateCategorySchema`; `params` se resuelve con `await` (Next 16) · archivo: `src/app/api/categories/[id]/route.ts` · verificación: `npm run build`; `PATCH`/`DELETE` sin sesión responden `401`; `DELETE` responde `204` sin cuerpo.
- [x] **T14** — Definir `categoryKeys` (query keys) y las opciones del filtro de estado en español · archivo: `src/modules/categories/constants.ts` · verificación: `npm run typecheck`.
- [x] **T15** — Service axios tipado (`getCategories`, `createCategory`, `updateCategory`, `deleteCategory`) usando la instancia `api` de `@/lib/axios` · archivo: `src/modules/categories/services/category.service.ts` · verificación: `npm run typecheck`; sin `fetch` ni `axios` importado directo.
- [x] **T16** — Hook de lectura `useCategories()` con `useQuery` · archivo: `src/modules/categories/hooks/use-categories.ts` · verificación: `npm run typecheck`.
- [x] **T17** — Hooks de mutación `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`, cada uno invalidando `categoryKeys.all` y emitiendo su toast en español · archivo: `src/modules/categories/hooks/use-category-mutations.ts` · verificación: `npm run typecheck`; los errores se propagan al componente, sin `catch {}`.
- [x] **T18** — Diálogo de formulario crear/editar (`Dialog` + React Hook Form + `zodResolver` + componentes `Field`), con auto-sugerencia de slug desde el nombre solo en modo creación y botón deshabilitado mientras `isPending` · archivo: `src/modules/categories/components/category-form-dialog.tsx` · verificación: `npm run build`; labels, placeholders y errores en español.
- [x] **T19** — Definir las columnas de TanStack Table (`getCategoryColumns({ onEdit, onDelete })`) con Nombre, Slug, Estado (`Badge`), Creada (fecha formateada `es`) y Acciones (`DropdownMenu`); `filterFn` propio para el estado · archivo: `src/modules/categories/components/category-columns.tsx` · verificación: `npm run typecheck`.
- [x] **T20** — Tabla con `useReactTable` + `getCoreRowModel`, `getFilteredRowModel`, `getSortedRowModel`, `getPaginationRowModel`; toolbar con `Input` buscador (filtro de columna `name`) y `Select` de estado; pie con contador y botones Anterior/Siguiente; fila `"Sin resultados para la búsqueda"` · archivo: `src/modules/categories/components/categories-table.tsx` · verificación: `npm run build`.
- [x] **T21** — Diálogo de confirmación de borrado con `AlertDialog`, nombrando la categoría afectada · archivo: `src/modules/categories/components/delete-category-dialog.tsx` · verificación: `npm run build`; texto de la acción destructiva en español.
- [x] **T22** — Vista orquestadora `"use client"`: consume `useCategories`, resuelve los tres estados (skeleton / error con `"Reintentar"` / vacío con `"Nueva categoría"`), mantiene el estado de diálogo seleccionado y compone T18, T20 y T21 · archivo: `src/modules/categories/components/categories-view.tsx` · verificación: `npm run build`.
- [x] **T23** — Página Server Component: encabezado y `<CategoriesView />`, sin `"use client"` · archivo: `src/app/(admin)/admin/categories/page.tsx` · verificación: `npm run build`; `/admin/categories` renderiza.
- [x] **T24** — Poblar el `<aside>` vacío del layout admin con navegación (`Panel`, `Categorías`) marcando la ruta activa · archivo: `src/app/(admin)/admin/layout.tsx` · verificación: la sección es alcanzable desde `/admin` sin escribir la URL.
- [ ] **T25** — Verificación final: `npm run typecheck && npm run lint && npm run build` y recorrido manual de AC1–AC11 en el navegador · verificación: los tres comandos en verde y los 11 criterios marcados.

## 10. Riesgos y consideraciones

- **Sin RBAC, cualquier usuario autenticado puede escribir el catálogo.** Es el
  riesgo mayor de esta fase: un cliente registrado desde `/sign-up` puede llamar
  `POST /api/categories`. Se acepta solo porque el entorno es de desarrollo
  y no hay datos reales. **El spec de RBAC es bloqueante antes de cualquier
  despliegue con registro público abierto.**
- **La ruta es pública a nivel de middleware: toda la protección depende del
  handler.** `/api/categories(.*)` no pasa por `auth.protect()` en `middleware.ts`
  (a diferencia de `/api/admin(.*)`), así que no hay red de seguridad del
  middleware si alguien olvida `requireAuth()` en un método mutador futuro. Cada
  `POST`/`PATCH`/`DELETE` que se añada a este handler debe empezar por
  `requireAuth()` explícitamente; es un punto a vigilar en review, no algo que el
  borde de la aplicación garantice por sí solo.
- **Migración — camino de ida y de vuelta.** Ida: `db:generate` → revisar el `.sql`
  → `db:migrate`. Vuelta: `DROP TABLE categories;` más borrar el `.sql` generado y
  su entrada en `drizzle/meta/_journal.json`. Al ser la primera migración sobre una
  base vacía no hay datos que preservar ni ventana de versiones mixtas. Cualquier
  paso destructivo posterior sobre esta tabla requiere autorización explícita
  aparte, nunca implícita en otra tarea.
- **No usar `db:push`** aunque el script exista: saltarse el archivo de migración
  deja el historial de `drizzle/` desincronizado con la base y elimina el camino de
  rollback auditable.
- `gen_random_uuid()` es nativo desde Postgres 13; Neon corre versiones superiores,
  así que no hace falta habilitar `pgcrypto`. Si `db:migrate` fallara por la
  función, la causa es la versión del proyecto Neon, no el schema.
- **Borrado físico y el futuro `products.category_id`.** Hoy nada referencia a
  `categories`, así que `DELETE` es seguro. Cuando llegue el spec de productos, la
  FK debe declararse `ON DELETE RESTRICT` y el handler de borrado tendrá que
  responder `409` con `"No puedes eliminar una categoría con productos asociados"`.
  Queda anotado aquí para que ese spec no lo descubra en producción.
- **Zod 4 con `.default()` y `.transform()`**: el tipo de entrada y el de salida del
  schema difieren. React Hook Form debe tiparse con `z.input<...>` y el handler
  consumir `z.output<...>`; mezclarlos produce un error de `zodResolver` difícil de
  leer. Ya previsto en los tipos exportados de §6.
- Detectar el `23505` de Postgres exige un type guard propio (`error instanceof
  Error && "code" in error`), no un `as any`, que está prohibido.
- El filtrado en cliente carga toda la tabla en memoria. Con decenas de filas es
  irrelevante; el umbral de revisión está en §11.
- La búsqueda por nombre es `includes` insensible a mayúsculas en cliente, por lo
  que `categories_name_idx` no la acelera: existe para el `ORDER BY`. Si la búsqueda
  migra a servidor con `ILIKE '%x%'`, hará falta `pg_trgm`, no un btree.
- `src/lib/utils.ts` es compartido: añadir `slugify` no debe alterar `cn()`.

## 11. Fuera de alcance / deuda aceptada

| Deuda | Cuándo retomarla |
|---|---|
| `parent_id` para subcategorías | Cuando el negocio pida navegación jerárquica en el storefront. Migración aditiva, sin pérdida de datos. |
| `requirePermission('categories.*')` en los 5 handlers | En cuanto exista el spec de RBAC. Es un reemplazo línea por línea de `requireAuth()`; los `TODO(spec-rbac)` marcan los puntos exactos. |
| `logAudit()` en create/update/delete dentro de la misma transacción | Junto con el spec de `audit_logs`. El repositorio ya usa el driver `neon-serverless` con `Pool`, que soporta transacciones multi-sentencia, así que no hará falta cambiar la conexión. |
| Filtrado, orden y paginación server-side | Cuando la tabla supere ~500 filas o el `GET` pase de ~300 ms. El contrato cambiaría de `Category[]` a `{ data, total, page, pageSize }`. |
| Imagen/ícono de categoría, `sort_order`, metadatos SEO | Cuando el diseño del storefront lo exija. |
| Borrado lógico (`deleted_at`) | Solo si aparece el requisito de recuperar categorías eliminadas. |
| Seed de categorías en `src/server/db/seed.ts` | Junto con el seed de productos, para que los datos de prueba sean coherentes entre ambas tablas. |
| Prefetch en servidor con `HydrationBoundary` | Si el primer render de `/admin/categories` se percibe lento. |
