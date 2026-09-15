---
id: 002
title: Administración de productos (CRUD)
status: done
module: products
scope: admin
created: 2026-08-28
---

> **Reviewer (2026-08-29): APROBADO, iteración 1/2.** Sin hallazgos bloqueantes
> ni mayores. Dos hallazgos MENOR corregidos en el mismo cambio: tope superior
> (`.max(20_000_000)`) agregado a `apiProductFields.priceCents` en
> `product.schema.ts` (faltaba la defensa en profundidad que sí tenía
> `priceToCents` en el formulario), y comentario aclaratorio en
> `updateProductSchema` explicando por qué se mantiene sin `.parse()` propio
> (deriva `UpdateProductInput`, en paralelo a `updateProductApiSchema`).
> `typecheck`/`lint` reverificados en verde tras el fix.
>
> **Cierre (2026-08-29):** el usuario decidió aceptar como deuda documentada,
> sin bloquear el cierre del spec, tanto la verificación manual pendiente de
> AC5/AC6/AC7/AC11 (implementados y trazados en código, no probados a mano) como
> el `npm run build` en rojo por el bug de entorno de §10 (ajeno a este código).
> Spec cerrado como `done` con esa deuda explícita.

# 002 — Administración de productos (CRUD)

> **Fase 2 de 2** del catálogo. Depende del schema `categories` creado en
> `001-categories` (ya migrado en Neon) y **reutiliza tal cual** sus capas
> compartidas: `src/lib/auth.ts`, `src/lib/api-errors.ts`, `src/lib/axios.ts`.
> Ver §10 sobre la precondición de 001 que el usuario decidió saltarse.

## 1. Contexto

`categories` ya existe en Neon (migración `drizzle/0000_silent_riptide.sql`) y el
CRUD de `/admin/categories` está implementado con las cinco capas del flujo de
SETUP §4. Este spec copia esa plantilla vertical para `products`, que es la tabla
que SETUP §5.3 describe como N—1 con `categories`.

Estado verificado del repositorio hoy:

- `src/server/db/schema/index.ts` exporta solo `./category`.
- `src/modules/products/` existe con las seis carpetas vacías (`.gitkeep`).
- `src/app/(admin)/admin/products/` existe y está vacía: la ruta hoy es 404.
- `src/components/shared/admin-nav.tsx` solo lista `Panel` y `Categorías`.
- `middleware.ts` ya declara `/api/products(.*)` como ruta **pública**, igual que
  `/api/categories(.*)`: la protección real vive en el handler.
- `src/components/ui/` ya tiene `select`, `switch`, `textarea`, `alert-dialog`,
  `dialog`, `field`, `badge`, `dropdown-menu`, `table`. **No hace falta instalar
  ningún componente shadcn nuevo.**

## 2. Objetivo

Un administrador autenticado puede crear, consultar, editar y eliminar productos
desde `/admin/products`, sobre un listado con TanStack Table que permite buscar
por nombre o SKU y filtrar por categoría, estado y disponibilidad de stock.

## 3. Alcance

### Incluye

- Tabla `products` en Neon vía migración Drizzle (`db:generate` + `db:migrate`),
  con FK `category_id → categories.id ON DELETE RESTRICT`.
- Endpoints `/api/products` y `/api/products/[id]` con validación Zod.
- Repositorio `product.repository.ts` como único punto de acceso a la BD, con el
  join a `categories` para exponer el nombre de la categoría en el listado.
- Service axios + hooks de TanStack Query (1 query + 3 mutaciones).
- Vista `/admin/products`: TanStack Table v8 con buscador (nombre + SKU), filtro
  por categoría, por estado y por stock, ordenamiento y paginación en cliente.
- Diálogo crear/editar (React Hook Form + Zod), con `Select` de categoría
  alimentado por el `useCategories()` ya existente.
- Diálogo de confirmación de borrado, estados de carga / error / vacío.
- Cierre de la deuda de 001: `DELETE /api/categories/[id]` responde `409` cuando
  la categoría tiene productos asociados (lo habilita la FK `RESTRICT`).
- Enlace `Productos` en `src/components/shared/admin-nav.tsx`.

### No incluye (explícito)

- Storefront: catálogo público, ficha `/products/[slug]`, carrito.
- `product_images` (galería). Esta fase usa un único `image_url` opcional.
- RBAC real (`requirePermission`) y escritura en `audit_logs`: siguen sin existir.
- Filtrado/paginación server-side y query params en `GET /api/products`.
- Variantes de producto, atributos/specs `jsonb`, marca, precio comparativo,
  costo, moneda por producto, dimensiones/peso, SEO meta.
- Borrado lógico (`deleted_at`), historial de precios, alertas de stock bajo.
- Seed de productos y carga masiva CSV.

## 4. Criterios de aceptación

- [x] **AC1** — Dado un usuario con sesión Clerk activa, cuando visita
      `/admin/products`, entonces ve la tabla con las columnas SKU, Nombre,
      Categoría, Precio, Stock, Estado y Acciones. Verificado manualmente en
      navegador.
- [x] **AC2** — Dado un usuario sin sesión, cuando visita `/admin/products`,
      `middleware.ts` lo redirige a `/sign-in`. `/api/products(.*)` es pública en
      el middleware, así que `POST`, `PATCH` y `DELETE` sin sesión responden `401`
      por `requireAuth()` sin tocar la base; `GET` responde `200` (lectura pública,
      es la misma que consumirá el storefront). Verificado: `DELETE` sin cookie de
      sesión vía `curl` respondió `401` con `{"message":"Debes iniciar sesión..."}`.
- [x] **AC3** — Dado el formulario de creación, cuando envía SKU `"LAP-001"`,
      nombre `"Laptop X14"`, categoría `"Laptops"`, precio `1299.90` y stock `5`,
      entonces se crea el producto, la tabla se refresca sin recarga y aparece el
      toast `"Producto creado"`. Verificado manualmente en navegador.
- [x] **AC4** — Dado el precio `1299.90` del AC3, entonces la fila persistida tiene
      `price_cents = 129990` (entero) y la celda muestra el importe formateado. Un
      precio con más de 2 decimales se rechaza en cliente y en API con `400`.
      **Se encontró y corrigió un bug bloqueante durante el recorrido manual: ver
      nota debajo.** Verificado tras el fix: `GET /api/products` devuelve
      `priceCents: 129990`.
- [ ] **AC5** — Dado un SKU o un slug ya existente, cuando intenta guardar, entonces
      la API responde `409` y la UI muestra `"Ya existe un producto con ese SKU o
      slug"` sin cerrar el diálogo. No verificado en este recorrido.
- [ ] **AC6** — Dado un `categoryId` que no existe en `categories`, cuando fuerza la
      petición, entonces la API responde `400` con `"La categoría seleccionada no
      existe"`, sin `500`. No verificado en este recorrido.
- [ ] **AC7** — Dado un precio o un stock negativo, entonces Zod lo bloquea en
      cliente y, si se fuerza la petición, el `CHECK` de Postgres impide la fila y
      la API responde `400`, nunca `500` silencioso. No verificado en este
      recorrido.
- [x] **AC8** — Dado un producto existente, cuando lo edita y guarda, entonces la
      fila refleja los cambios, `updated_at` avanza y sale `"Producto actualizado"`.
      El precio se rellena correctamente en `1299.90` tras el fix de AC4 (antes
      mostraba `129990.00`, ver nota debajo).
- [x] **AC9** — Dado un producto existente, cuando pulsa eliminar, entonces aparece
      confirmación; al confirmar la fila desaparece y sale `"Producto eliminado"`.
      Verificado manualmente en navegador.
- [x] **AC10** — Dado el buscador, cuando escribe `"lap"`, entonces la tabla muestra
      los productos cuyo **nombre o SKU** contiene `"lap"`, sin distinguir
      mayúsculas. Los filtros de categoría, estado y stock se combinan en AND con
      la búsqueda. Verificado manualmente en navegador (`"xyz"` → sin resultados,
      `"lap"` → match).
- [ ] **AC11** — Dada una categoría con al menos un producto, cuando intenta
      eliminarla desde `/admin/categories`, entonces la API responde `409` con
      `"No puedes eliminar una categoría con productos asociados"` y la fila
      permanece. No verificado en este recorrido (además, `/admin/categories` no
      tiene `page.tsx` hoy — ver nota aparte, fuera del alcance de este spec).
- [x] **AC12** — Dado que la consulta está en curso, se muestran filas skeleton; si
      falla, mensaje de error con `"Reintentar"`; si no hay datos, estado vacío con
      `"Nuevo producto"`; si el filtro no arroja resultados, `"Sin resultados para
      la búsqueda"` (mensaje distinto del vacío). Verificados estado vacío y
      "sin resultados"; skeleton/error no forzados en este recorrido.
- [ ] **AC13** — `npm run typecheck && npm run lint && npm run build` en verde, sin
      `any` ni `@ts-ignore`. `typecheck` y `lint` en verde (solo 2 warnings
      inofensivos de React Compiler + TanStack Table, preexistentes). `build`
      sigue en rojo por el bug de entorno documentado en §10 (Turbopack /
      casing de carpeta), ajeno a este spec.

> **Bug bloqueante encontrado y corregido durante el recorrido manual de T25
> (2026-08-29):** `priceCents` se multiplicaba por 100 dos veces. La causa:
> `createProductSchema`/`updateProductSchema` incluyen `priceToCents`, que
> convierte de unidades monetarias a centavos. El formulario ya aplica esa
> conversión en el cliente vía `zodResolver` antes de llamar a `onSubmit`
> (`CreateProductInput` es el tipo de **salida**, ya en centavos). Los handlers
> `POST /api/products` y `PATCH /api/products/[id]` volvían a parsear el body
> HTTP —que ya llegaba en centavos— con ese mismo esquema, así que
> `priceToCents` lo interpretaba otra vez como unidades monetarias y lo
> multiplicaba por 100 una segunda vez (`1299.90` → `129990` en cliente →
> `12999000` en servidor). Se reprodujo creando un producto real: quedó
> persistido con `price_cents = 12999000` y el diálogo de edición mostraba
> `129990.00` en el campo Precio en vez de `1299.90`.
>
> **Fix:** se agregaron `createProductApiSchema` y `updateProductApiSchema` en
> `product.schema.ts`, iguales a los esquemas del formulario salvo que
> `priceCents` se valida como `z.number().int().nonnegative()` (ya centavos, sin
> `priceToCents`). Los route handlers (`route.ts` y `[id]/route.ts`) ahora
> parsean el body con estos esquemas de API en vez de los del formulario.
> Verificado end-to-end tras el fix: crear un producto con precio `1299.90`
> persiste `price_cents = 129990` y el diálogo de edición lo rellena como
> `1299.90`. `typecheck` y `lint` siguen en verde.

## 5. Modelo de datos — revisar columna por columna

Tabla **nueva** `products`. **Requiere migración**. Es puramente **aditiva**: no
altera `categories` ni ninguna fila existente; el rollback es `DROP TABLE products`
sin pérdida de datos de categorías (§10).

| # | Columna | Tipo Postgres | Constraints | Por qué está |
|---|---|---|---|---|
| 1 | `id` | `uuid` | PK, default `gen_random_uuid()` | Igual que `categories` y `audit_logs` (SETUP §5.2). No filtra volumen de negocio en URLs. |
| 2 | `category_id` | `uuid` | `NOT NULL`, `REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE` | Relación N—1 de SETUP §5.3. `NOT NULL`: un producto sin categoría no es navegable en el storefront. |
| 3 | `sku` | `varchar(40)` | `NOT NULL`, `UNIQUE` | Identificador interno de inventario; lo pide SETUP §5.3. Se guarda en mayúsculas (normalizado en Zod). |
| 4 | `name` | `varchar(120)` | `NOT NULL` | Nombre comercial. 120 > 80 de `categories`: los nombres de producto llevan modelo y specs. |
| 5 | `slug` | `varchar(140)` | `NOT NULL`, `UNIQUE` | URL pública `/products/[slug]` (SETUP §3). |
| 6 | `description` | `text` | nullable | Ficha del producto. Máx. 2000 en validación Zod. |
| 7 | `price_cents` | `integer` | `NOT NULL`, `CHECK (price_cents >= 0)` | **Precio en centavos, entero** (CLAUDE.md §6). `integer` llega a ~21.4 M de unidades monetarias: suficiente. |
| 8 | `stock` | `integer` | `NOT NULL DEFAULT 0`, `CHECK (stock >= 0)` | Inventario disponible; alimenta el filtro "Sin stock". |
| 9 | `image_url` | `text` | nullable | Imagen principal para la fila y la futura tarjeta del storefront. La galería (`product_images`) queda diferida (§11). |
| 10 | `is_active` | `boolean` | `NOT NULL DEFAULT true` | Visibilidad en storefront; alimenta el filtro de estado. Mismo criterio que `categories`. |
| 11 | `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | |
| 12 | `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Refrescado con `$onUpdate`, igual que `categories`. |

Índices:

- `products_sku_unique` — único sobre `sku`. Guardia de integridad de inventario.
- `products_slug_unique` — único sobre `slug`. Guardia + lookup de `/products/[slug]`.
- `products_category_id_idx` — btree sobre `category_id`. Necesario para que el
  chequeo de `ON DELETE RESTRICT` al borrar una categoría no haga *seq scan*, y
  para el futuro filtro por categoría del storefront.
- `products_name_idx` — btree sobre `name`, soporta el `ORDER BY name ASC` por defecto.

**Columnas deliberadamente fuera** (todas aditivas después, sin migrar datos):
`compare_at_price_cents`, `cost_cents`, `currency`, `brand`, `specs jsonb`,
`weight_grams`, `low_stock_threshold`, `is_featured`, `sort_order`, `deleted_at`,
metadatos SEO. Detalle y criterio de reapertura en §11.

```ts
// src/server/db/schema/product.ts — firma propuesta
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { categories } from "./category";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    sku: varchar("sku", { length: 40 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    imageUrl: text("image_url"),
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
    uniqueIndex("products_sku_unique").on(table.sku),
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_category_id_idx").on(table.categoryId),
    index("products_name_idx").on(table.name),
    check("products_price_cents_positive", sql`${table.priceCents} >= 0`),
    check("products_stock_positive", sql`${table.stock} >= 0`),
  ],
);
```

**Restricción dura, igual que en 001:** `product.ts` **no** debe importar
`server-only`; el módulo cliente deriva sus tipos con `import type`.

```ts
// src/modules/products/types/product.types.ts
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { products } from "@/server/db/schema/product";

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

// Fila del listado: producto + nombre de su categoría (join del repositorio).
// Composición sobre el tipo inferido, no una copia manual (regla dura 5).
export type ProductListItem = Product & { categoryName: string };
```

## 6. Contratos de API

Ruta de nivel superior `app/api/products/`, ya prevista en SETUP §3 y ya declarada
pública en `middleware.ts`. Igual que `categories`: lectura pública + mutación con
`requireAuth()` dentro del handler, diferenciadas por método HTTP.

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/api/products` | pública | — | `200` `ProductListItem[]` (orden `name` asc) | 500 |
| POST | `/api/products` | sesión Clerk | `CreateProductInput` | `201` `Product` | 400, 401, 409, 500 |
| GET | `/api/products/[id]` | pública | — | `200` `ProductListItem` | 400, 404, 500 |
| PATCH | `/api/products/[id]` | sesión Clerk | `UpdateProductInput` | `200` `Product` | 400, 401, 404, 409, 500 |
| DELETE | `/api/products/[id]` | sesión Clerk | — | `204` sin cuerpo | 400, 401, 404, 500 |

**Auth — provisional, idéntica a 001.** `requirePermission()` y las tablas de RBAC
no existen. `requireAuth()` (`src/lib/auth.ts`, ya implementado) es la **única**
protección real de `POST`/`PATCH`/`DELETE`, porque `/api/products(.*)` es pública
en el middleware. Prohibido comparar `role === "admin"`. Cada handler lleva
`// TODO(spec-rbac)` con su permiso destino (`products.read`, `products.create`,
`products.update`, `products.delete`).

Forma del error: la que ya produce `handleApiError()` — `{ message, issues? }`.

Schemas Zod (Zod 4, `src/modules/products/schemas/product.schema.ts`, compartido
cliente/servidor, sin imports de servidor):

```ts
export const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

// El formulario trabaja en unidades monetarias (1299.90) y el dominio en
// centavos (129990). La conversión vive aquí, en un solo sitio.
export const priceToCents = z.coerce
  .number()
  .nonnegative("El precio no puede ser negativo")
  .max(200_000, "El precio supera el máximo permitido")
  .refine((v) => Number(v.toFixed(2)) === v, "Máximo 2 decimales")
  .transform((v) => Math.round(v * 100));

export const createProductSchema = z.object({
  categoryId: z.uuid("Selecciona una categoría"),
  sku: z.string().trim().toUpperCase()
    .min(3).max(40)
    .regex(SKU_PATTERN, "Usa mayúsculas, números y guiones"),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().min(2).max(140).regex(SLUG_PATTERN, …),
  description: z.string().trim().max(2000).nullish().transform((v) => v || null),
  priceCents: priceToCents,
  stock: z.coerce.number().int("El stock debe ser entero").min(0).max(1_000_000),
  imageUrl: z.url("URL de imagen inválida").nullish().transform((v) => v || null),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Debes enviar al menos un campo para actualizar" },
);

export const productIdSchema = z.uuid("Identificador de producto inválido");

export type CreateProductInput = z.output<typeof createProductSchema>;
export type UpdateProductInput = z.output<typeof updateProductSchema>;
export type ProductFormValues = z.input<typeof createProductSchema>;
```

`SLUG_PATTERN` se **importa** de `@/modules/categories/schemas/category.schema`
(ya exportado ahí); es la segunda repetición, aún por debajo del umbral DRY de
extraer a `lib/`. El developer ajusta los mensajes en español de cada `.min/.max`
siguiendo el estilo de `category.schema.ts`; el pseudocódigo de arriba los omite
por brevedad, no porque sean opcionales.

Salida: sin schema Zod de respuesta. El contrato es `Product` / `ProductListItem`,
inferido de Drizzle (regla dura 5).

## 7. Arquitectura y archivos afectados

```
src/server/db/schema/product.ts               NUEVO  tabla products
src/server/db/schema/index.ts                 EDITA  + export * from "./product"
drizzle/0001_*.sql + meta/                    NUEVO  generado, no editar a mano

src/lib/api-errors.ts                         EDITA  + mapeo de FK violation (23503)
src/lib/constants.ts                          EDITA  + CURRENCY / CURRENCY_LOCALE
src/lib/utils.ts                              EDITA  + formatPriceFromCents()
src/lib/auth.ts                               REUSA  requireAuth() sin cambios
src/lib/axios.ts                              REUSA  instancia `api` sin cambios

src/server/repositories/product.repository.ts NUEVO  única capa que toca Drizzle

src/app/api/products/route.ts                 NUEVO  GET, POST
src/app/api/products/[id]/route.ts            NUEVO  GET, PATCH, DELETE
src/app/api/categories/[id]/route.ts          EDITA  DELETE → 409 si tiene productos

src/modules/products/types/product.types.ts            NUEVO
src/modules/products/schemas/product.schema.ts         NUEVO
src/modules/products/constants.ts                      NUEVO  productKeys + filtros
src/modules/products/services/product.service.ts       NUEVO
src/modules/products/hooks/use-products.ts             NUEVO
src/modules/products/hooks/use-product-mutations.ts    NUEVO
src/modules/products/components/product-form-dialog.tsx  NUEVO
src/modules/products/components/product-columns.tsx      NUEVO
src/modules/products/components/products-table.tsx       NUEVO
src/modules/products/components/delete-product-dialog.tsx NUEVO
src/modules/products/components/products-view.tsx        NUEVO  orquestador "use client"
src/modules/products/store/                            SIN USO (queda .gitkeep)

src/app/(admin)/admin/products/page.tsx       NUEVO  Server Component, solo compone
src/components/shared/admin-nav.tsx           EDITA  + enlace "Productos"

src/modules/categories/hooks/use-categories.ts REUSA  alimenta el Select de categoría
src/components/ui/*                            SIN CAMBIOS (nada que instalar)
```

Frontera de cliente: `page.tsx` es Server Component; `"use client"` entra en
`products-view.tsx` y desciende (regla dura 7).

## 8. Decisiones técnicas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| **FK `ON DELETE RESTRICT`** | `ON DELETE CASCADE` | Con `CASCADE`, borrar una categoría por error borra en silencio todo su catálogo, incluyendo productos ya referenciados por futuros `order_items`: pérdida de datos irreversible desde un clic de la UI. `RESTRICT` convierte ese error en un `409` explicable. Es además lo que 001 §10 dejó anotado. |
| `ON DELETE RESTRICT` sobre `SET NULL` | `ON DELETE SET NULL` con `category_id` nullable | `SET NULL` deja productos huérfanos invisibles en el storefront y obliga a tratar "sin categoría" en cada consulta y en cada filtro. Prefiero el fallo ruidoso al dato silenciosamente inconsistente. |
| `category_id NOT NULL` | Nullable | Un producto sin categoría no es alcanzable por navegación. Relajarlo después es `ALTER COLUMN DROP NOT NULL`, aditivo; endurecerlo después obliga a migrar filas. |
| `ON UPDATE CASCADE` | `ON UPDATE NO ACTION` | Los `id` uuid no se reasignan, así que es inerte hoy; se declara por consistencia y coste cero. |
| **`price_cents integer`** | `numeric(10,2)` / `float` | CLAUDE.md §6: precios en enteros. `float` tiene error de representación en sumas de totales; `numeric` es correcto pero viaja como `string` en el driver y contamina el tipo inferido. |
| Conversión unidades→centavos en el **schema Zod** | Convertir en el componente o en el repositorio | Un solo punto de conversión, compartido por cliente y servidor, y el tipo `output` ya es el de la BD. Convertir en el componente duplicaría la regla en cada formulario. |
| Una sola moneda implícita (`CURRENCY` en `lib/constants.ts`) | Columna `currency` por producto | No hay requisito multi-moneda. Añadirla luego es aditivo con `DEFAULT`. |
| `CHECK (price_cents >= 0)` y `CHECK (stock >= 0)` en BD, además de Zod | Solo validación Zod | La BD es la última línea: un seed, un script o un handler futuro que se salte Zod no debe poder escribir un precio negativo. |
| **Búsqueda global sobre nombre + SKU** con `globalFilterFn` de TanStack Table | Dos inputs separados, o filtro solo por nombre | Quien busca inventario teclea indistintamente `"LAP-001"` o `"Laptop"`. Un solo input cubre ambos sin ambigüedad de UI. |
| **Filtro, orden y paginación en cliente**; el `GET` devuelve la lista completa | Server-side con query params | Mismo criterio que 001: con cientos de filas el coste es imperceptible y evita params, debounce, `placeholderData` e invalidaciones compuestas. Umbral de reapertura en §11 —**más bajo que en categorías**, porque productos sí crece. |
| Join `products ⨝ categories` en el repositorio, devolviendo `categoryName` plano | Dos peticiones y cruce en cliente; o objeto `category` anidado | El cruce en cliente rompe el orden y la búsqueda por categoría; el objeto anidado obliga a un tipo de respuesta a mano. `Product & { categoryName: string }` se compone del tipo inferido. |
| `Select` de categoría alimentado por el `useCategories()` **existente** | Endpoint nuevo `/api/products/categories` | La query ya existe, ya está cacheada por TanStack Query y comparte invalidación. Cero código nuevo. |
| Extender `handleApiError()` con mapeo de `23503` (FK violation) | `try/catch` con `if` en los handlers de productos | Es el mismo helper que ya centraliza `23505`; el mapeo `23503` lo necesitan tanto `POST /api/products` (400) como `DELETE /api/categories/[id]` (409). Segundo consumidor ⇒ va en el helper, con el mensaje inyectado por opción para que el texto de dominio no viva en `lib/`. |
| `image_url text` nullable, una sola imagen | Tabla `product_images` desde ya | Un campo cubre la fila de la tabla y la tarjeta del storefront. La galería exige orden, imagen principal, subida de archivos y storage: es un spec propio. |
| Sin store Zustand | Estado de tabla/diálogos en Zustand | Estado local a una vista. Regla dura 6. |
| Sin extraer `<DataTable>` compartido | Generalizar `categories-table.tsx` y `products-table.tsx` | Es la **segunda** repetición. CLAUDE.md §6: se extrae a la tercera. Cuando llegue la tabla de pedidos, se extrae con tres casos reales a la vista. |
| Slug editable con sugerencia desde el nombre (`slugify()` ya existe) | Derivarlo siempre en servidor | Igual que 001: renombrar no debe romper URLs indexadas. |

**Skills.** Del mapa de CLAUDE.md §8 aplicaban `vercel:nextjs`, `vercel:shadcn`,
`vercel:vercel-storage` y `clerk-nextjs-patterns`: **ninguna está instalada en esta
sesión**, así que el spec se redactó sin ellas, apoyado en `docs/SETUP.md` y en la
lectura directa del código ya implementado en 001. Sí se usó la skill `migration`,
que fundamenta §5 y §10: camino de ida y de vuelta explícitos, pasos destructivos
separados y autorizados aparte, y verificación de la transición antes de cerrar.

## 9. Tareas

- [x] **T1** — Crear el schema Drizzle de `products` según §5, con FK, índices y los dos `check()` · archivo: `src/server/db/schema/product.ts` · verificación: `npm run typecheck`; no importa `server-only`.
- [x] **T2** — Añadir `export * from "./product"` al barrel, sin tocar la línea de `category` · archivo: `src/server/db/schema/index.ts` · verificación: `npm run typecheck`.
- [x] **T3** — Generar la migración con `npm run db:generate` · archivos: `drizzle/0001_*.sql`, `drizzle/meta/*` (generados, no editar) · verificación: el `.sql` contiene `CREATE TABLE "products"`, la FK con `ON DELETE restrict`, los dos únicos, los dos índices y los dos `CHECK`; **ningún** `DROP` ni `ALTER TABLE "categories"`.
- [x] **T4** — Aplicar la migración con `npm run db:migrate` (nunca `db:push`) · verificación: `npm run db:studio` muestra `products` vacía con las 12 columnas de §5 y `categories` intacta con sus filas.
  > **BLOQUEADO** — `npm run db:migrate` fue denegado por el clasificador de permisos del entorno (escritura sobre la base remota de Neon). El `.sql` de T3 quedó revisado y aprobado: es aditivo, sin `DROP` ni `ALTER TABLE "categories"`. Requiere que el usuario ejecute el comando o conceda el permiso; sin él, T25 y AC1–AC12 no son verificables en navegador.
- [x] **T5** — Definir `Product`, `NewProduct` y `ProductListItem` con `import type` · archivo: `src/modules/products/types/product.types.ts` · verificación: `npm run typecheck`.
- [x] **T6** — Escribir los schemas Zod de §6, importando `SLUG_PATTERN` de `category.schema.ts` · archivo: `src/modules/products/schemas/product.schema.ts` · verificación: `npm run typecheck`; sin imports de `@/server/db` en valor; `"1299.90"` → `129990` y `"12.999"` → error.
- [x] **T7** — Extender `handleApiError()` con el código `23503` mapeado vía una opción explícita (`foreignKey?: { status: 400 | 409; message: string }`), reutilizando el `isPostgresError()` existente · archivo: `src/lib/api-errors.ts` · verificación: `npm run typecheck`; el mapeo de `23505` y las tres clases de error siguen intactos; sin `any`.
- [x] **T8** — Añadir `CURRENCY` y `CURRENCY_LOCALE` sin alterar `APP_URL` ni `API_BASE_URL` · archivo: `src/lib/constants.ts` · verificación: `npm run typecheck`.
- [x] **T9** — Añadir `formatPriceFromCents(cents: number): string` con `Intl.NumberFormat` · archivo: `src/lib/utils.ts` · verificación: `formatPriceFromCents(129990)` devuelve el importe con separador de miles y 2 decimales; `cn()` y `slugify()` sin cambios.
- [x] **T10** — Implementar el repositorio: `listProducts` (inner join con `categories`, select explícito de columnas + `categories.name as categoryName`, orden `products.name` asc), `findProductById` (mismo join), `createProduct`, `updateProduct`, `deleteProduct` (con `.returning()`) · archivo: `src/server/repositories/product.repository.ts` · verificación: `npm run typecheck`; es el único archivo nuevo que importa `db`; empieza con `import "server-only"`.
- [x] **T11** — Route Handler de colección: `GET` (lista, sin auth) y `POST` (empieza por `requireAuth()`, valida con `createProductSchema`, luego repositorio, responde `201`) · archivo: `src/app/api/products/route.ts` · verificación: `npm run build`; `POST` sin sesión → `401`; cierra con `handleApiError(error, { conflictMessage: "Ya existe un producto con ese SKU o slug", foreignKey: { status: 400, message: "La categoría seleccionada no existe" } })`; comentario `TODO(spec-rbac)` presente.
- [x] **T12** — Route Handler de detalle: `GET` (sin auth), `PATCH`/`DELETE` (empiezan por `requireAuth()`), validando el `id` con `productIdSchema` y el cuerpo con `updateProductSchema`; `params` resuelto con `await` (Next 16) · archivo: `src/app/api/products/[id]/route.ts` · verificación: `npm run build`; `PATCH`/`DELETE` sin sesión → `401`; `DELETE` → `204` sin cuerpo.
- [x] **T13** — Cerrar la deuda de 001: en el `DELETE` de categorías, pasar `foreignKey: { status: 409, message: "No puedes eliminar una categoría con productos asociados" }` a `handleApiError` · archivo: `src/app/api/categories/[id]/route.ts` · verificación: borrar una categoría con productos responde `409`; una categoría sin productos sigue respondiendo `204`.
- [x] **T14** — Definir `productKeys` y las opciones de filtro (estado y stock) en español · archivo: `src/modules/products/constants.ts` · verificación: `npm run typecheck`.
- [x] **T15** — Service axios tipado (`getProducts`, `createProduct`, `updateProduct`, `deleteProduct`) con la instancia `api` de `@/lib/axios` · archivo: `src/modules/products/services/product.service.ts` · verificación: `npm run typecheck`; sin `fetch` ni `axios` directo.
- [x] **T16** — Hook de lectura `useProducts()` con `useQuery` · archivo: `src/modules/products/hooks/use-products.ts` · verificación: `npm run typecheck`.
- [x] **T17** — Hooks `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct`, invalidando `productKeys.all` y con toast en español · archivo: `src/modules/products/hooks/use-product-mutations.ts` · verificación: `npm run typecheck`; errores propagados, sin `catch {}`.
- [x] **T18** — Diálogo crear/editar (`Dialog` + React Hook Form + `zodResolver` + `Field`) con SKU, nombre, slug (sugerido desde el nombre solo al crear), `Select` de categoría desde `useCategories()`, precio en unidades monetarias, stock, `Textarea` de descripción, URL de imagen y `Switch` de estado; botón deshabilitado mientras `isPending` · archivo: `src/modules/products/components/product-form-dialog.tsx` · verificación: `npm run build`; al editar, el precio se rellena dividiendo `price_cents` entre 100; el `Select` muestra estado de carga si las categorías aún no llegaron.
- [x] **T19** — Columnas de TanStack Table (`getProductColumns({ onEdit, onDelete })`): SKU, Nombre (ordenable), Categoría, Precio (`formatPriceFromCents`, alineado a la derecha, ordenable), Stock (`Badge` destacando `0`), Estado (`Badge`) y Acciones (`DropdownMenu`); `filterFn` propios para estado y stock · archivo: `src/modules/products/components/product-columns.tsx` · verificación: `npm run typecheck`.
- [x] **T20** — Tabla con `useReactTable` + los cuatro row models; toolbar con `Input` de búsqueda global (nombre + SKU vía `globalFilterFn`), `Select` de categoría, `Select` de estado y `Select` de stock; pie con contador y Anterior/Siguiente; fila `"Sin resultados para la búsqueda"` · archivo: `src/modules/products/components/products-table.tsx` · verificación: `npm run build`; los filtros se combinan en AND.
- [x] **T21** — Diálogo de confirmación de borrado con `AlertDialog`, nombrando el producto y su SKU · archivo: `src/modules/products/components/delete-product-dialog.tsx` · verificación: `npm run build`.
- [x] **T22** — Vista orquestadora `"use client"`: consume `useProducts`, resuelve skeleton / error con `"Reintentar"` / vacío con `"Nuevo producto"`, mantiene el diálogo seleccionado y compone T18, T20 y T21 · archivo: `src/modules/products/components/products-view.tsx` · verificación: `npm run build`.
- [x] **T23** — Página Server Component con encabezado y `<ProductsView />`, sin `"use client"` · archivo: `src/app/(admin)/admin/products/page.tsx` · verificación: `/admin/products` renderiza.
- [x] **T24** — Añadir el enlace `Productos` (icono `Package`) a `ADMIN_NAV_ITEMS`, antes de `Categorías` · archivo: `src/components/shared/admin-nav.tsx` · verificación: la sección es alcanzable desde `/admin` sin escribir la URL y marca ruta activa.
- [x] **T25** — Verificación final: `npm run typecheck && npm run lint && npm run build` y recorrido manual de AC1–AC13 en el navegador · verificación: los tres comandos en verde y los criterios marcados. **Cerrado con deuda aceptada explícitamente por el usuario (2026-08-29):** `typecheck`/`lint` en verde; recorrido manual hecho para AC1–4, AC8–10, AC12 (un bug de doble conversión de precio encontrado y corregido, ver nota en AC4). AC5–7 y AC11 quedan sin verificar manualmente —están implementados y trazados en código, revisados por el `reviewer`— y `npm run build` sigue en rojo por el bug de entorno de §10 (casing de carpeta, ajeno a este spec). El usuario decidió aceptar ambos como deuda en vez de bloquear el cierre del spec en ellos.
  > **PARCIAL** — `typecheck` ✓, `lint` ✓ (0 errores; 2 warnings de `react-hooks/incompatible-library` por `useReactTable`, uno preexistente en `categories-table.tsx`), `build` ✓ → AC13 cumplido. El recorrido manual de AC1–AC12 queda pendiente de T4.

## 10. Riesgos y consideraciones

- **Precondición de 001 saltada por decisión explícita del usuario.**
  `001-categories` declara que productos "no arranca hasta que esta fase esté
  aprobada, implementada y probada manualmente por el usuario", y hoy sigue en
  `status: in-review` con **T25 (verificación final y recorrido manual de AC1–AC11)
  pendiente**. Informado de esto, el usuario decidió arrancar productos igualmente.
  Queda registrado aquí, no subsanado. Consecuencias concretas: si el recorrido
  manual de 001 descubre un defecto en el patrón vertical (repositorio, handler,
  hooks, tabla), ese defecto ya estará **copiado** en productos y habrá que
  corregirlo en dos módulos. Mitigación mínima recomendada antes de aprobar este
  spec: ejecutar el AC7 de 001 (crear y borrar una categoría real), porque este
  spec depende de que `categories` tenga filas utilizables.
- **Sin RBAC, cualquier usuario autenticado puede escribir el catálogo.** Un
  cliente registrado desde `/sign-up` puede llamar `POST /api/products`. Se acepta
  solo en desarrollo. El spec de RBAC es **bloqueante antes de cualquier despliegue
  con registro público abierto**.
- **`/api/products(.*)` es pública en el middleware**: no hay red de seguridad del
  borde. Todo método mutador que se añada a estos handlers debe empezar por
  `requireAuth()` explícitamente. Punto de vigilancia en review.
- **Migración — camino de ida y de vuelta.** Ida: `db:generate` → revisar el `.sql`
  → `db:migrate`. Vuelta: `DROP TABLE products;` + borrar el `.sql` generado y su
  entrada en `drizzle/meta/_journal.json`. La migración es aditiva y **no toca
  `categories`**, así que el rollback no pierde datos existentes. Si el `.sql`
  generado contiene cualquier sentencia sobre `categories`, **detenerse y escalar**:
  significa que el schema de 001 se editó por error.
- **No usar `db:push`**: rompe el historial auditable y el camino de rollback.
- **La FK `RESTRICT` cambia el comportamiento de una ruta ya entregada.** Desde
  T4, `DELETE /api/categories/[id]` puede fallar con `23503` donde antes siempre
  tenía éxito. Sin T13 eso se traduciría en un `500` genérico: T13 **no es
  opcional** y debe ir en el mismo cambio que la migración.
- **`23503` frente a `23505`.** Ambos llegan envueltos por `DrizzleQueryError`; el
  `isPostgresError()` de `api-errors.ts` ya recorre la cadena de `cause` hasta 5
  niveles, así que sirve tal cual. No añadir un `as any` para leer `code`.
- **Coma flotante en la conversión de precio.** `1299.90 * 100` da `129989.99…`;
  por eso la conversión es `Math.round(v * 100)` y no `Number(v * 100)`. Un
  truncamiento (`Math.trunc`, `| 0`) produciría un centavo menos en producción.
- **Zod 4: `input` ≠ `output`.** Con `priceToCents` la diferencia es mayor que en
  001 (`string | number` a la entrada, `number` de centavos a la salida). React
  Hook Form se tipa con `z.input<...>` (`ProductFormValues`) y el handler consume
  `z.output<...>`; mezclarlos rompe `zodResolver` con un error ilegible.
- **`updateProductSchema.partial()` y el precio.** Un `PATCH` que no envíe precio no
  debe escribir `0`: el repositorio pasa el objeto validado directamente al `.set()`,
  y Zod omite las claves ausentes. No inicializar campos a `0` "por si acaso".
- **N+1 evitado por diseño**: el listado hace **un** join, no una consulta de
  categoría por fila. Cualquier variante que recorra productos consultando su
  categoría es hallazgo bloqueante en review.
- El filtrado en cliente carga la tabla completa en memoria; ver umbral en §11.
- **`npm run build` en rojo por un bug ajeno al código de este spec.** `typecheck` y
  `lint` pasan limpios. `build` falla con
  `Error [InvariantError]: Invariant: Expected workStore to be initialized. This is
  a bug in Next.js.` Se aisló el fallo excluyendo `/admin/orders` del build: el
  mismo error reapareció en `/_global-error` (ruta interna de Next.js), confirmando
  que **no** es un defecto de `products` ni de `orders`, sino un fallo sistémico del
  prerender de Turbopack. Hipótesis con alta confianza, heredada de la sesión
  anterior: la carpeta del proyecto sigue en disco como `Ecommerce` (mayúscula)
  mientras distintas herramientas la resuelven como `ecommerce`, lo que en Windows
  puede duplicar la instancia del módulo `next` en caché y romper singletons
  internos como `workAsyncStorage`. El rename no se pudo completar porque el propio
  proceso de Claude Code tiene su directorio de trabajo anclado en `Ecommerce`
  (Windows no permite renombrar el cwd de un proceso vivo). **T25 queda abierto**
  hasta que se renombre la carpeta fuera de la sesión y se re-verifique `npm run
  build`.
- `src/lib/api-errors.ts`, `src/lib/utils.ts` y `src/lib/constants.ts` son
  compartidos con categorías: las tres ediciones son **aditivas**, no deben
  cambiar firmas ni comportamiento existente.

## 11. Fuera de alcance / deuda aceptada

| Deuda | Cuándo retomarla |
|---|---|
| `requirePermission('products.*')` en los 5 handlers | Con el spec de RBAC. Reemplazo línea por línea de `requireAuth()`; los `TODO(spec-rbac)` marcan los puntos. |
| `logAudit()` en create/update/delete dentro de la misma transacción | Con el spec de `audit_logs`. `product.created` / `product.updated` / `product.deleted` (SETUP §5.2). |
| Tabla `product_images` (galería, orden, imagen principal, subida a storage) | Cuando el storefront muestre más de una imagen por producto. Aditiva; `image_url` pasaría a ser un derivado o se migraría a la primera fila de la galería. |
| `compare_at_price_cents`, `cost_cents`, `currency` | Con promociones, margen o multi-moneda. Aditivas con `DEFAULT`. |
| `specs jsonb`, `brand`, `weight_grams` | Cuando la ficha del storefront pida tabla de características o cálculo de envío. |
| `low_stock_threshold` + alerta de stock bajo en el dashboard | Junto con el spec del dashboard (SETUP §6 lo menciona en las métricas). |
| Filtrado, orden y paginación server-side | Cuando la tabla supere ~300 filas o el `GET` pase de ~300 ms. El contrato pasaría de `ProductListItem[]` a `{ data, total, page, pageSize }`. Umbral menor que el de categorías. |
| Búsqueda server-side con `ILIKE '%x%'` sobre nombre y SKU | Junto con lo anterior. Requeriría `pg_trgm`, no el btree actual. |
| Extraer `<DataTable>` compartido a `src/components/shared/` | A la **tercera** tabla del admin (previsiblemente pedidos). |
| Borrado lógico (`deleted_at`) | Obligatorio antes de que existan `order_items`: un producto vendido no se puede borrar físicamente sin romper el histórico de pedidos. |
| Seed de categorías + productos coherente en `src/server/db/seed.ts` | Cuando haga falta un entorno de demo o datos para el dashboard. |
| Prefetch en servidor con `HydrationBoundary` | Si el primer render de `/admin/products` se percibe lento. |
