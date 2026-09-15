# SETUP — E-commerce Tech

Documento único de referencia para el arranque del proyecto y la **arquitectura de
carpetas obligatoria**. Todo agente y toda tarea debe respetar esta estructura.

---

## 1. Stack

| Capa | Tecnología | Versión objetivo |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.x |
| Runtime UI | React | 19.x |
| Lenguaje | TypeScript (strict) | 5.x |
| Estilos | Tailwind CSS | 4.x |
| Componentes | shadcn/ui (Radix + CVA) | latest |
| Base de datos | Neon Postgres (serverless) | — |
| ORM | Drizzle ORM + drizzle-kit | latest |
| Auth | Clerk (`@clerk/nextjs`) | latest |
| Estado servidor | TanStack Query v5 | 5.x |
| Tablas | TanStack Table v8 | 8.x |
| HTTP | Axios | 1.x |
| Estado cliente | Zustand | 5.x |
| Gráficos | Recharts | 2.x |
| Validación | Zod | 4.x |
| Formularios | React Hook Form + @hookform/resolvers | latest |
| Gestor de paquetes | **npm** | — |

---

## 2. Bootstrap del proyecto

```bash
# 1. Scaffold
npx create-next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --turbopack --use-npm

# 2. Datos — Neon + Drizzle
npm i drizzle-orm @neondatabase/serverless
npm i -D drizzle-kit dotenv tsx

# 3. Auth
npm i @clerk/nextjs

# 4. Estado de servidor y tablas
npm i @tanstack/react-query @tanstack/react-table
npm i -D @tanstack/react-query-devtools

# 5. HTTP, estado cliente, gráficos
npm i axios zustand recharts

# 6. Validación y formularios
npm i zod react-hook-form @hookform/resolvers

# 7. UI
npx shadcn@latest init
npx shadcn@latest add button input label card table dialog sheet \
  dropdown-menu select badge separator skeleton sonner form tabs avatar

# 8. Utilidades
npm i class-variance-authority clsx tailwind-merge lucide-react next-themes
npm i -D prettier prettier-plugin-tailwindcss
```

### Variables de entorno (`.env.local`)

```bash
# Neon
DATABASE_URL="postgresql://<user>:<pass>@<host>.neon.tech/<db>?sslmode=require"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
CLERK_WEBHOOK_SIGNING_SECRET="whsec_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Seed — opcional, solo la lee `npm run db:seed`
BOOTSTRAP_SUPER_ADMIN_EMAIL="tu-email@ejemplo.com"
```

`CLERK_WEBHOOK_SIGNING_SECRET` lo emite el Clerk Dashboard al crear el endpoint
`POST /api/webhooks/clerk` (eventos `user.created`, `user.updated`,
`user.deleted`). Ese webhook es el único que crea filas en `users`: sin el
secreto la firma no se puede verificar, el endpoint responde `400` y nadie llega
a existir en la base, así que tampoco es asignable ningún rol.

`BOOTSTRAP_SUPER_ADMIN_EMAIL` asigna el rol `super_admin` al usuario que ya
exista en `users` con ese email. Si no está definida o el email no existe, el
seed lo informa por consola y termina sin error.

`.env.local` va en `.gitignore`. Nunca se commitea. Mantén un `.env.example` con
las claves vacías.

### Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/server/db/seed.ts"
  }
}
```

---

## 3. Arquitectura de carpetas

Estructura **modular por dominio** sobre App Router. La regla base: el `app/`
solo enruta y compone; la lógica vive en `modules/` (cliente) y `server/` (datos).

```
.
├── .claude/
│   └── agents/                  orchestrator · spec · developer · reviewer
├── docs/
│   ├── SETUP.md                 este archivo
│   └── specs/                   NNN-slug.md — specs SDD (documentación viva)
├── drizzle/                     migraciones generadas por drizzle-kit
├── drizzle.config.ts
├── public/
└── src/
    ├── app/
    │   ├── (storefront)/        módulo CLIENTE
    │   │   ├── layout.tsx       header, footer, providers de tienda
    │   │   ├── page.tsx         home
    │   │   ├── products/
    │   │   │   ├── page.tsx     catálogo + filtros
    │   │   │   └── [slug]/page.tsx
    │   │   ├── cart/page.tsx
    │   │   ├── checkout/page.tsx
    │   │   └── orders/
    │   │       ├── page.tsx
    │   │       └── [id]/page.tsx
    │   ├── (admin)/             módulo ADMINISTRACIÓN
    │   │   └── admin/
    │   │       ├── layout.tsx   sidebar + guard de rol
    │   │       ├── page.tsx     dashboard (Recharts)
    │   │       ├── products/    CRUD (TanStack Table)
    │   │       ├── categories/
    │   │       ├── orders/
    │   │       ├── customers/
    │   │       ├── roles/       roles, permisos y asignaciones
    │   │       └── audit-logs/  bitácora (TanStack Table + filtros)
    │   ├── (auth)/
    │   │   ├── sign-in/[[...sign-in]]/page.tsx
    │   │   └── sign-up/[[...sign-up]]/page.tsx
    │   ├── api/                 Route Handlers — única API pública
    │   │   ├── products/route.ts
    │   │   ├── products/[id]/route.ts
    │   │   ├── categories/route.ts
    │   │   ├── cart/route.ts
    │   │   ├── orders/route.ts
    │   │   └── admin/
    │   │       ├── metrics/route.ts
    │   │       ├── roles/route.ts
    │   │       ├── permissions/route.ts
    │   │       └── audit-logs/route.ts
    │   ├── layout.tsx           root: fonts, ClerkProvider, Providers
    │   ├── globals.css
    │   └── not-found.tsx
    │
    ├── modules/                 FEATURES por dominio (lado cliente)
    │   └── <dominio>/           products | categories | cart | orders | customers | dashboard | roles | audit
    │       ├── components/      UI específica del dominio
    │       ├── hooks/           TanStack Query: useProducts, useCreateProduct
    │       ├── services/        llamadas axios tipadas (product.service.ts)
    │       ├── schemas/         Zod: entrada/salida del dominio
    │       ├── store/           Zustand, solo si el dominio tiene estado UI global
    │       ├── types/           tipos derivados del schema Drizzle
    │       └── constants.ts
    │
    ├── server/                  SOLO servidor — nunca importar desde cliente
    │   ├── db/
    │   │   ├── index.ts         cliente Drizzle + Neon
    │   │   ├── schema/          una tabla por archivo + index.ts barrel
    │   │   └── seed.ts
    │   ├── repositories/        acceso a datos (product.repository.ts)
    │   └── services/            reglas de negocio que cruzan repositorios
    │
    ├── components/
    │   ├── ui/                  shadcn — no editar a mano salvo tokens
    │   ├── shared/              header, footer, sidebar, data-table, empty-state
    │   └── providers/           query-provider, theme-provider
    │
    ├── lib/
    │   ├── axios.ts             instancia única con baseURL e interceptores
    │   ├── query-client.ts      config de TanStack Query
    │   ├── utils.ts             cn() y helpers puros
    │   ├── auth.ts              helpers de Clerk: requireAuth, requireAdmin
    │   ├── permissions.ts       PERMISSIONS (códigos), can(), requirePermission()
    │   ├── audit.ts             logAudit() — escribe en audit_logs dentro de la tx
    │   └── constants.ts
    │
    ├── test-utils/              solo mocks/fixtures COMPARTIDOS entre tests — ver sección 8
    │   ├── mocks/               dobles de dependencias externas: db, Clerk, Stripe, axios
    │   └── fixtures/            factories de datos de prueba reutilizables
    │
    ├── hooks/                   hooks transversales (useDebounce, useMediaQuery)
    ├── types/                   tipos globales compartidos
    └── middleware.ts            Clerk: rutas públicas vs protegidas vs admin
```

### Convenciones de nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivo de componente | kebab-case | `product-card.tsx` |
| Componente | PascalCase | `ProductCard` |
| Hook | `use` + camelCase | `useProducts` |
| Service | `<dominio>.service.ts` | `product.service.ts` |
| Repositorio | `<dominio>.repository.ts` | `product.repository.ts` |
| Schema Drizzle | singular | `src/server/db/schema/product.ts` |
| Tabla en Postgres | snake_case plural | `products`, `order_items` |
| Route Handler | `route.ts` | `app/api/products/route.ts` |
| Archivo de test | `<nombre-original>.test.ts`, colocado junto al archivo que prueba | `product.repository.test.ts` |

---

## 4. Flujo de datos

```
Server Component ──────────────────────► repositorio ──► Drizzle ──► Neon
   (lectura inicial, SEO)

Client Component ──► hook (TanStack Query) ──► service (axios)
                                                     │
                                                     ▼
                                          Route Handler (/api)
                                             · Clerk auth
                                             · validación Zod
                                             · repositorio ──► Drizzle ──► Neon
```

**Reglas duras**

1. Un componente **nunca** importa `db`, Drizzle ni un repositorio.
2. Un componente **nunca** llama `axios`/`fetch` directo. Va en `services/`, se consume vía hook.
3. Toda consulta a BD vive en `src/server/repositories/`. Los Route Handlers orquestan, no consultan.
4. Todo Route Handler valida su entrada con Zod antes de llamar al repositorio.
5. Los tipos se **infieren** del schema Drizzle (`InferSelectModel`), no se escriben dos veces.
6. Datos de servidor → TanStack Query. Estado de UI (carrito local, filtros, sidebar) → Zustand. Sin mezclar.
7. `"use client"` lo más abajo posible en el árbol. Nunca en un layout que no lo necesita.

---

## 5. Modelo de datos inicial

El detalle exacto de cada tabla lo define su spec. Precios en **enteros
(centavos)**. Nunca `float`.

### 5.1 Identidad y acceso (RBAC)

| Tabla | Propósito | Relaciones |
|---|---|---|
| `users` | espejo local de Clerk: `clerk_id` (único), email, nombre, `is_active` | N—N `roles`, 1—N `orders`, 1—N `audit_logs` |
| `roles` | rol nombrado: `slug` (`super_admin`, `admin`, `manager`, `employee`, `customer`, `audit`), nombre, descripción, `is_system` | N—N `users`, N—N `permissions` |
| `permissions` | permiso atómico: `code` único `<recurso>.<acción>` (`products.create`, `orders.update_status`), `resource`, `action`, descripción | N—N `roles` |
| `role_permissions` | pivote rol ↔ permiso. PK compuesta (`role_id`, `permission_id`) | N—1 `roles`, N—1 `permissions` |
| `user_roles` | pivote usuario ↔ rol. PK compuesta (`user_id`, `role_id`), `assigned_by`, `assigned_at` | N—1 `users`, N—1 `roles` |

**Cómo convive con Clerk**

- Clerk es la fuente de verdad de la **autenticación** (sesión, credenciales, MFA).
- Postgres es la fuente de verdad de la **autorización** (roles y permisos del dominio).
- `users` se sincroniza desde Clerk vía webhook (`user.created`, `user.updated`, `user.deleted`).
- El set de permisos efectivo se resuelve en servidor: `clerk_id → users → user_roles → role_permissions → permissions`.
- Cachear el set de permisos en `publicMetadata` de Clerk es opcional y **derivado**; ante discrepancia, gana Postgres.

**Reglas duras**

1. La verificación se hace siempre por `permission.code`, nunca por nombre de rol
   quemado en el código (`if (role === 'admin')` es un hallazgo bloqueante).
2. Los roles de sistema (`is_system = true`) no se borran ni se renombran desde la UI.
3. Un usuario sin filas en `user_roles` es `customer` por defecto. Ese default vive
   en un solo lugar del servidor, no repartido por la app.
4. `permissions` es una tabla semilla (`db:seed`), no editable desde el panel. Los
   permisos nacen del código; los roles se componen desde la UI.

### 5.2 Auditoría y logs

| Tabla | Propósito | Relaciones |
|---|---|---|
| `audit_logs` | traza inmutable de toda mutación relevante | N—1 `users` (`actor_id`, nullable) |

Columnas:

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `actor_id` | fk `users.id` nullable | null = acción del sistema, cron o webhook |
| `action` | text | `product.created`, `order.status_changed`, `role.permission_granted`, `auth.login_failed` |
| `entity_type` | text | `product`, `order`, `user`, `role` |
| `entity_id` | text nullable | id del registro afectado |
| `changes` | jsonb nullable | `{ before, after }` — solo los campos que cambiaron |
| `metadata` | jsonb nullable | contexto extra (ruta, motivo, id de request) |
| `ip_address` | inet nullable | |
| `user_agent` | text nullable | |
| `severity` | enum | `info` \| `warning` \| `error` |
| `created_at` | timestamptz | default `now()` |

Índices: `(entity_type, entity_id)`, `(actor_id, created_at desc)`, `(action)`,
`(created_at desc)`.

**Reglas duras**

1. `audit_logs` es **append-only**. Sin `UPDATE`, sin `DELETE` desde la aplicación.
   El único borrado permitido es la purga por retención (job, no request de usuario).
2. Se escribe en la **misma transacción** que la mutación auditada. Si la mutación
   revierte, el log también.
3. Nunca se guarda PII sensible ni secretos en `changes` o `metadata`: sin
   contraseñas, tokens, claves de API ni datos de tarjeta. Los campos sensibles se
   enmascaran antes de serializar.
4. Un fallo al escribir el log **no** debe romper la operación de negocio salvo que
   la acción sea de seguridad (cambio de rol o permiso), donde sí es transaccional
   y bloqueante.
5. Retención sugerida: 180 días para `info`, indefinida para acciones de seguridad.

> `audit_logs` cubre también los eventos de autenticación y de seguridad mediante
> el prefijo de `action` (`auth.*`, `role.*`). Se separa en una tabla propia solo
> si el volumen o los patrones de consulta divergen de verdad.

### 5.3 Catálogo y ventas

| Tabla | Propósito | Relaciones |
|---|---|---|
| `categories` | taxonomía de productos | 1—N `products` |
| `products` | SKU, nombre, slug, precio, stock, specs | N—1 `categories` |
| `product_images` | galería | N—1 `products` |
| `carts` / `cart_items` | carrito persistido | N—1 `users`, `products` |
| `orders` | cabecera: total, estado, dirección | N—1 `users` |
| `order_items` | detalle con precio congelado | N—1 `orders`, `products` |

---

## 6. Módulos funcionales

### Cliente (storefront)
Catálogo con filtros y búsqueda · ficha de producto · carrito · checkout ·
historial y detalle de pedidos · perfil (Clerk).

### Administración
Dashboard con métricas (Recharts: ventas, pedidos, top productos, stock bajo) ·
CRUD de productos y categorías (TanStack Table: paginación, orden, filtros) ·
gestión de pedidos y cambio de estado · listado de clientes.

Gestión de accesos: CRUD de roles, matriz rol × permiso, asignación de roles a
usuarios · bitácora de auditoría filtrable por actor, entidad, acción y fecha.

Acceso admin protegido en dos capas: `middleware.ts` (borde) y verificación por
**código de permiso** en cada Route Handler bajo `/api/admin/`
(`requirePermission('products.create')`), nunca por nombre de rol.

---

## 7. Checklist de arranque

- [ ] `create-next-app` ejecutado con las flags de la sección 2
- [ ] Dependencias instaladas
- [ ] Proyecto Neon creado y `DATABASE_URL` en `.env.local`
- [ ] `drizzle.config.ts` apuntando a `src/server/db/schema`
- [ ] Aplicación Clerk creada y claves en `.env.local`
- [ ] `middleware.ts` con rutas públicas, protegidas y de admin
- [ ] Webhook de Clerk (`user.created/updated/deleted`) sincronizando `users`
- [ ] Seed de `permissions` y roles de sistema ejecutado (`npm run db:seed`)
- [ ] `ClerkProvider` + `QueryProvider` en `src/app/layout.tsx`
- [ ] `shadcn init` ejecutado y componentes base agregados
- [ ] Estructura de carpetas de la sección 3 creada
- [ ] `npm run typecheck`, `npm run lint` y `npm run build` en verde

---

## 8. Testing unitario

`docs/funciones-testeables.md` inventaría **qué** funciones existentes son
candidatas a prueba unitaria. Esta sección define **dónde** viven esos tests y
**cómo** se nombran sus carpetas y archivos — no implementa ningún caso todavía.

### 8.1 Ubicación y nombre de archivo

Cada test se coloca **junto al archivo que prueba** (colocación por dominio,
igual que ya organiza `src/modules/`), no en un árbol paralelo `tests/` ni
`__tests__/`. El nombre es el mismo basename del archivo original con el
sufijo `.test.ts` (ver tabla de convenciones de la sección 3).

| Archivo probado | Archivo de test |
|---|---|
| `src/lib/utils.ts` | `src/lib/utils.test.ts` |
| `src/server/repositories/product.repository.ts` | `src/server/repositories/product.repository.test.ts` |
| `src/modules/products/services/product.service.ts` | `src/modules/products/services/product.service.test.ts` |
| `src/modules/products/schemas/product.schema.ts` | `src/modules/products/schemas/product.schema.test.ts` |
| `src/modules/cart/store/cart.store.ts` | `src/modules/cart/store/cart.store.test.ts` |

### 8.2 Utilidades compartidas entre tests

Los repositorios dependen de `db` (Drizzle), los servicios de `axios`, y
`lib/permissions.ts` / `lib/auth.ts` de Clerk. Esos dobles de prueba
**compartidos** —nunca el test en sí— viven en `src/test-utils/` (sección 3):

```
src/test-utils/
├── mocks/        dobles de dependencias externas: db, Clerk (auth), Stripe, axios
└── fixtures/     datos de prueba reutilizables (factories de producto, orden, usuario)
```

Regla: un mock o fixture entra a `test-utils/` solo a la tercera repetición
entre archivos de test distintos (mismo criterio DRY de la sección 6 de
`CLAUDE.md`). Antes de eso vive inline en el propio `.test.ts`.

### 8.3 Alcance de lo testeable

Solo se escriben tests unitarios para lo listado en
`docs/funciones-testeables.md`: `lib/`, `server/repositories/`,
`server/services/`, `modules/*/services/`, validadores/transformadores de
`modules/*/schemas/` y acciones de `modules/*/store/`. Componentes, páginas,
Route Handlers y hooks quedan fuera de esta convención — su cobertura es de
integración/E2E, no unitaria.

### 8.4 Runner

Node 24 (versión del proyecto) ejecuta `.test.ts` con su test runner nativo
(`node --test`, `node:assert`) sin instalar librerías de terceros, siempre que
el archivo no use JSX ni features no-erasables (enums, decorators) — motivo
por el que 8.3 excluye `.tsx`. `node --test` sin argumentos ya descubre de
forma recursiva todo `*.test.ts` bajo el proyecto (glob propio del runner, no
depende de que el shell expanda `**`, lo que evita romperse en cmd.exe/
PowerShell). El script en `package.json`:

```json
"test": "node --experimental-test-module-mocks --test"
```

**Mocks de dependencias externas** (Clerk, Drizzle `db`, Stripe, `axios`): se
usa `mock.module()` de `node:test`, disponible de forma nativa pero detrás del
flag `--experimental-test-module-mocks` (por eso va en el script `test`, no
solo en `node --test`). Reemplaza los `exports` nombrados del módulo real
mientras dura el mock:

```ts
import { mock } from "node:test";

const dbMock = mock.module("@/server/db", {
  exports: { db: { select: () => /* … */ } },
});
// … test …
dbMock.restore();
```

Sigue siendo cero dependencias de terceros — es una capacidad experimental
del propio Node, no una librería instalada.

**Resolución de imports relativos sin extensión**: el ESM nativo de Node (a
diferencia del resolvedor de TypeScript/bundler configurado en `tsconfig.json`)
no completa la extensión de un specifier relativo (`./utils` falla con
`ERR_MODULE_NOT_FOUND`, hace falta `./utils.ts`). Reescribir así cada import
del código de producción sería un cambio masivo fuera de alcance solo para el
test runner, así que en vez de eso hay un *loader hook* nativo de Node
(`scripts/ts-extension-hook.mjs`, registrado por `scripts/register-test-hooks.mjs`
vía `--import` en el script `test`) que completa `.ts`/`.tsx`/`/index.ts`
automáticamente cuando el specifier relativo no resuelve tal cual. No es una
librería de terceros: usa únicamente el hook de resolución de módulos que
expone `node:module` (`register()`). Con esto, ni el código de producción ni
los tests necesitan extensión explícita en sus imports relativos — sigue
funcionando igual si se pone explícita.

No aplica al alias `@/*` (Node no lo resuelve de todos modos, sección 8.1) ni
a paquetes de `node_modules`.

**Ojo con nombres compuestos** (`product.schema.ts`, `user.repository.ts`):
detectar "ya tiene extensión" con una regex genérica (`/\.[a-zA-Z0-9]+$/`)
confunde `../schemas/public-catalog.schema` con un archivo que ya termina en
`.schema`, y se salta la resolución. El hook compara contra una lista cerrada
de extensiones reales (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.json`),
no contra "cualquier punto seguido de letras".

**`DATABASE_URL` dummy** (en `scripts/register-test-hooks.mjs`): importar
cualquier repositorio importa transitivamente `@/server/db`, que exige
`DATABASE_URL` al cargarse (antes de cualquier query) y lanza si falta.
`new Pool()` no conecta hasta la primera consulta real, así que un valor
dummy alcanza para todo archivo que solo necesita importar el módulo sin
tocar la base de datos — el propio test mockea `@/server/db` cuando sí
necesita datos.

**`src/test-utils/mocks/drizzle.ts`**: fake mínimo y honesto del builder
encadenado de Drizzle (`createSequentialDbMock(...resultados)`) para
repositorios con lógica de negocio real (validaciones, cómputo de totales,
idempotencia) que la justifican. Cada llamada de entrada (`select`/`insert`/
`update`/`delete`) devuelve, en orden, el siguiente resultado de la cola — no
interpreta `where`/`set`, así que no sirve para verificar que un filtro SQL es
correcto. Los repositorios que son solo CRUD sin lógica propia (un
`SELECT`/`INSERT` de una línea) no se testean unitariamente: mockear toda la
cadena ahí no verificaría ningún comportamiento nuestro, solo que Drizzle se
llamó — se anotan como omitidos en `docs/testing/notas-loop.md` y su
cobertura real es de integración contra Postgres.

**`server-only`**: todo archivo de `server/repositories/`, `server/services/` y
`lib/permissions.ts` empieza con `import "server-only"`. Next.js lo resuelve a
un módulo vacío vía alias del bundler en build de servidor; bajo Node puro el
paquete real lanza siempre al importarse. El mismo hook redirige
`"server-only"`/`"client-only"` a `scripts/server-only-stub.mjs` (un módulo
vacío propio, sin dependencias), igual que hace el bundler.
