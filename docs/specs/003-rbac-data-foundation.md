---
id: 003
title: Fundamento de datos RBAC (schema + seed)
status: done
module: auth
scope: admin
---

# 003 — Fundamento de datos RBAC (schema + seed)

## Objetivo
Un operador puede ejecutar `npm run db:seed` sobre una base migrada y obtener los
20 permisos atómicos, los 6 roles de sistema, su matriz rol×permiso y —si
`BOOTSTRAP_SUPER_ADMIN_EMAIL` coincide con un usuario existente— ese usuario con
rol `super_admin`.

## Alcance
Incluye:
- 5 tablas nuevas: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`.
- Migración Drizzle generada y aplicada.
- Seed idempotente: permisos, roles de sistema, matriz por defecto, bootstrap del super admin.
- `docs/SETUP.md §5.1`: reemplazar el set de roles documentado (`customer, admin, manager, support`) por los 6 acordados.

No incluye:
- `audit_logs` (spec 004) · webhook Clerk→`users` (spec 005): aquí `users` nace **vacía**.
- `src/lib/permissions.ts`, `can()`, `requirePermission()` (spec 006) · `logAudit()` (spec 007).
- Retrofit de `/api/categories` y `/api/products` (spec 008) · endpoints y UI de admin (009+).
- Rol por defecto `customer` resuelto en servidor: es lógica, no dato. No se crean filas en `user_roles` para clientes.

## Criterios de aceptación
- [x] AC1 — Dado `db:migrate` aplicado, cuando se inspecciona la base, entonces existen las 5 tablas con las PK compuestas de `role_permissions` y `user_roles`, y `users.clerk_id` es único.
- [x] AC2 — Dado `db:seed`, entonces `permissions` tiene exactamente las 20 filas de §Datos y `roles` las 6 con `is_system = true`.
- [x] AC3 — Dado `db:seed` ejecutado **dos veces**, entonces no hay filas duplicadas ni error: es idempotente (`onConflictDoNothing` por `code`/`slug`).
- [x] AC4 — Dado el seed, entonces `super_admin` tiene los 20 permisos y `admin` 19 (todos menos `roles.manage`).
- [x] AC5 — Dado el seed, entonces `customer` tiene **0** filas en `role_permissions`. Su acceso al propio pedido es por ownership, no por RBAC: no se crea ningún permiso `*.read_own`.
- [x] AC6 — Dado `audit`, entonces tiene solo los 7 permisos de lectura (`products.read`, `categories.read`, `orders.read`, `users.read`, `roles.read`, `audit_logs.read`, `metrics.read`) y ninguno de mutación.
- [x] AC7 — Dado `BOOTSTRAP_SUPER_ADMIN_EMAIL` con un email presente en `users`, entonces el seed le inserta la fila en `user_roles` con `super_admin`; si ya la tiene o el email no existe o la variable no está definida, el seed informa por consola y termina en 0 sin fallar.
- [x] AC8 — `npm run typecheck && npm run lint` en verde.

## Datos
5 tablas **nuevas**. **Requiere migración** (aditiva, no toca `categories` ni `products`).

| Tabla | Columnas | Constraints |
|---|---|---|
| `users` | `id uuid` PK default random · `clerk_id varchar(64)` · `email varchar(255)` · `first_name varchar(80)?` · `last_name varchar(80)?` · `image_url text?` · `is_active boolean` · `created_at`/`updated_at timestamptz` | unique `users_clerk_id_unique`, unique `users_email_unique`, `is_active` default `true` |
| `roles` | `id uuid` PK · `slug varchar(40)` · `name varchar(80)` · `description text?` · `is_system boolean` default `false` · timestamps | unique `roles_slug_unique` |
| `permissions` | `id uuid` PK · `code varchar(60)` · `resource varchar(30)` · `action varchar(30)` · `description text?` · `created_at` | unique `permissions_code_unique`, unique `(resource, action)` |
| `role_permissions` | `role_id uuid` · `permission_id uuid` · `created_at` | PK compuesta `(role_id, permission_id)`; ambas FK `ON DELETE CASCADE`; índice en `permission_id` |
| `user_roles` | `user_id uuid` · `role_id uuid` · `assigned_by uuid?` → `users.id` `ON DELETE SET NULL` · `assigned_at timestamptz` | PK compuesta `(user_id, role_id)`; FK `user_id`/`role_id` `ON DELETE CASCADE`; índice en `role_id` |

Timestamps y estilo: idénticos a `category.ts` (`mode: "string"`, `.defaultNow()`, `.$onUpdate()`), índices en el tercer argumento de `pgTable` como array. **Ningún archivo de schema importa `server-only`.**

Catálogo sembrado — `code = <recurso>.<accion>` (20):
`products.read|create|update|delete` · `categories.read|create|update|delete` ·
`orders.read|update_status|cancel` · `users.read|create|update|deactivate` ·
`users.assign_role` · `roles.read|manage` · `audit_logs.read` · `metrics.read`

Matriz por defecto (`is_system = true` en los 6):

| Rol | Permisos |
|---|---|
| `super_admin` | los 20 |
| `admin` | los 20 menos `roles.manage` |
| `manager` | `products.*`, `categories.*`, `orders.read`, `orders.update_status`, `metrics.read` |
| `employee` | `products.read`, `categories.read`, `orders.read`, `orders.update_status` |
| `customer` | ninguno (acceso por ownership) |
| `audit` | los 7 `*.read` incluido `audit_logs.read`; cero mutación |

## API
Sin endpoints en este spec. Sin schemas Zod nuevos (no hay entrada HTTP que validar).

## Reutilizar
- `src/server/db/schema/category.ts` — patrón exacto de `pgTable`, timestamps e índices. Copiar la forma, no reinventarla.
- `src/server/db/schema/index.ts` — barrel; hoy exporta `./category` y `./product`.
- `src/server/db/seed.ts` — ya trae `dotenv` con `.env.local` y el `.then/.catch(exit)`; se rellena `seed()`, no se reescribe el arranque.
- `src/lib/env.ts` — `requireEnv()` para `DATABASE_URL`. `BOOTSTRAP_SUPER_ADMIN_EMAIL` es **opcional**: leerla con `process.env`, no con `requireEnv()`.
- `drizzle-orm/neon-serverless` + `Pool` — mismo driver que `src/server/db/index.ts`, ya soporta transacciones.
- Sin componentes shadcn ni repositorio nuevo: este spec no tiene capa de UI ni de API.

## Tareas
- [x] T1 — Schema `users` según §Datos · `src/server/db/schema/user.ts`
- [x] T2 — Schema `roles` · `src/server/db/schema/role.ts`
- [x] T3 — Schema `permissions` · `src/server/db/schema/permission.ts`
- [x] T4 — Schema pivote `role_permissions` con PK compuesta · `src/server/db/schema/role-permission.ts`
- [x] T5 — Schema pivote `user_roles` con PK compuesta y `assigned_by` · `src/server/db/schema/user-role.ts`
- [x] T6 — Añadir los 5 `export * from` al barrel sin tocar los existentes · `src/server/db/schema/index.ts`
- [x] T7 — `npm run db:generate` · `drizzle/0002_*.sql` + `meta/`. Revisar: 5 `CREATE TABLE`, ningún `DROP` ni `ALTER TABLE` sobre `categories`/`products`
- [x] T8 — `npm run db:migrate` (nunca `db:push`) · verificar en `db:studio` que las 5 tablas existen vacías
- [x] T9 — Datos del seed como constantes tipadas: catálogo de 20 permisos y matriz de 6 roles · `src/server/db/seed-data.ts`
- [x] T10 — Seed idempotente en una transacción: insertar permisos, roles y `role_permissions` resolviendo ids por `code`/`slug` · `src/server/db/seed.ts`
- [x] T11 — Bootstrap: leer `BOOTSTRAP_SUPER_ADMIN_EMAIL`, buscar el usuario por email y asignar `super_admin` con `onConflictDoNothing`; si no hay variable o no hay usuario, `console.info` y salir en 0 · `src/server/db/seed.ts`
- [x] T12 — Documentar `BOOTSTRAP_SUPER_ADMIN_EMAIL` (opcional, solo seed) en `.env.example` —crearlo, hoy no existe— y en el bloque de variables de `docs/SETUP.md §2`
- [x] T13 — Actualizar la fila `roles` de `docs/SETUP.md §5.1` con los 6 slugs acordados, sin tocar el resto de §5.1 · `docs/SETUP.md`
- [x] T14 — Ejecutar `npm run db:seed` dos veces seguidas y comprobar AC2–AC7 en `db:studio`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- **`src/server/db/index.ts` importa `server-only` y el seed corre con `tsx`, fuera del bundler.** Importarlo desde `seed.ts` lanza en runtime. El seed debe abrir su propio `Pool` + `drizzle(pool, { schema })` e importar el schema por ruta **relativa** (`./schema`), no por el alias `@/`.
- Idempotencia real: los `INSERT` van con `onConflictDoNothing()` sobre los únicos (`permissions.code`, `roles.slug`, PK de los pivotes). Nada de `DELETE` previo — borraría asignaciones hechas desde el panel en el futuro.
- Sin N+1: cargar permisos y roles ya insertados en **una** consulta cada uno y construir un `Map code→id` / `slug→id` en memoria antes de armar `role_permissions`.
- `super_admin` no se privilegia por código: tiene todos los permisos porque están en `role_permissions`. Comparar `role === 'super_admin'` en cualquier capa es hallazgo bloqueante (CLAUDE.md regla dura 8).
- Rollback: `DROP TABLE user_roles, role_permissions, permissions, roles, users;` en ese orden + borrar el `.sql` y su entrada en `drizzle/meta/_journal.json`.
