---
id: 005
title: Provisión del super administrador (sync Clerk→users + asignación de roles)
status: done
module: auth
scope: admin
---

# 005 — Provisión del super administrador (sync Clerk→users + asignación de roles)

## Objetivo
Un operador con `users.assign_role` puede otorgar y revocar el rol `super_admin`
a un usuario existente, y `ronaldreyesramirez@gmail.com` queda con `super_admin`
en `user_roles`.

## Alcance
Incluye:
- Webhook Clerk (`user.created|updated|deleted`) que sincroniza `users`. Sin él nadie tiene fila y nada es asignable.
- `src/lib/permissions.ts`: `getPermissionCodes()`, `can()`, `requirePermission()`.
- `user.repository.ts` (sync + lectura) y `user-role.repository.ts` (asignar/revocar en tx con `audit_logs`).
- 3 Route Handlers bajo `/api/admin/`.
- Bootstrap final del email del objetivo vía `npm run db:seed`.

No incluye:
- UI de admin (`/admin/roles`, `/admin/customers`), hooks, services axios, componentes.
- CRUD de roles ni matriz rol×permiso. Solo se asignan roles ya sembrados.
- Retrofit de `/api/products` y `/api/categories` a `requirePermission` (spec aparte).
- Cachear permisos en `publicMetadata` de Clerk.
- **Pre-provisión de filas en `users` sin `clerk_id`.** `users.clerk_id` es `NOT NULL UNIQUE`: inventar filas fantasma rompe el invariante. El usuario objetivo inicia sesión una vez y el webhook crea la fila.

## Criterios de aceptación
- [ ] AC1 — Dado el webhook configurado, cuando un usuario nuevo se registra o inicia sesión por primera vez, entonces existe su fila en `users` con `clerk_id`, `email` e `is_active = true`.
- [ ] AC2 — Dado `user.deleted` de Clerk, entonces la fila NO se borra: pasa a `is_active = false` (preserva FK de `audit_logs` y `orders`).
- [ ] AC3 — Dado `ronaldreyesramirez@gmail.com` ya en `users`, cuando se ejecuta `npm run db:seed` con `BOOTSTRAP_SUPER_ADMIN_EMAIL` igual a ese email, entonces tiene la fila en `user_roles` con `super_admin`. **Aquí se cumple el objetivo.**
- [ ] AC4 — Dado un actor sin `users.assign_role`, cuando hace `POST /api/admin/users/:id/roles`, entonces recibe `403` y NO hay escritura en `user_roles`.
- [ ] AC5 — Dado un actor con `users.assign_role`, cuando asigna un rol, entonces se crea la fila en `user_roles` con `assigned_by` = id del actor y, **en la misma transacción**, un `audit_logs` con `action = "user.role_assigned"`, `severity = "warning"`.
- [ ] AC6 — Dado un `userId` uuid válido sin fila en `users`, entonces `404` con mensaje que indica que el usuario debe iniciar sesión al menos una vez.
- [ ] AC7 — Dado un actor que intenta modificar sus **propios** roles, entonces `409`. Evita el auto-bloqueo del último super admin.
- [ ] AC8 — Dado un usuario con `is_active = false`, entonces `getPermissionCodes()` devuelve `[]` aunque tenga filas en `user_roles`.
- [ ] AC9 — Dado un POST con firma de webhook inválida, entonces `400` y cero escrituras.
- [x] AC10 — `npm run typecheck && npm run lint` en verde (lint: 0 errores; 2 warnings preexistentes de `useReactTable`, ajenas a este spec).

## Datos
**Sin cambios de esquema.** Las 5 tablas RBAC (spec 003) y `audit_logs` (spec 004) ya existen. Sin migración.

Filas de `audit_logs` que este spec escribe (`entity_type = "user"`, `entity_id` = uuid del usuario afectado):

| action | severity | changes | metadata |
|---|---|---|---|
| `user.role_assigned` | `warning` | `{ before: null, after: { roleSlug } }` | `{ roleSlug }` |
| `user.role_revoked` | `warning` | `{ before: { roleSlug }, after: null }` | `{ roleSlug }` |

Sin email, sin `clerk_id`, sin nombre en `changes`/`metadata`: solo uuid y slug (SETUP §5.2 regla 3).

## API
| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/webhooks/clerk` | firma Svix (`verifyWebhook`) | evento Clerk | `200` / `400` |
| GET | `/api/admin/users` | `requirePermission("users.read")` | — | `200` lista de usuarios con sus `roleSlugs[]` |
| POST | `/api/admin/users/[id]/roles` | `requirePermission("users.assign_role")` | `{ roleSlug }` | `201` asignación · `403` · `404` · `409` |
| DELETE | `/api/admin/users/[id]/roles/[roleSlug]` | `requirePermission("users.assign_role")` | — | `204` · `403` · `404` · `409` |

Zod (en `src/modules/roles/schemas/user-role.schema.ts`):
- `assignRoleSchema` — `roleSlug`: enum derivado de los slugs de `ROLE_SEED`.
- `userIdParamSchema` — `id`: uuid.

`requirePermission(code)` devuelve el `users.id` del actor (no el `clerkId`), que alimenta `assigned_by` y `actor_id`. Lanza `UnauthorizedError` sin sesión y `ForbiddenError` sin el permiso.

## Reutilizar
- `src/lib/api-errors.ts` — `UnauthorizedError`, `NotFoundError`, `ConflictError` y `handleApiError()`. Falta `ForbiddenError` → añadirla ahí, con su rama `403`.
- `src/lib/auth.ts` — patrón de `requireAuth()` (lanza, no devuelve `null`). `permissions.ts` lo imita.
- `src/server/repositories/audit-log.repository.ts` — `insertAuditLog(input, client)` ya acepta el `tx`. **No escribir otro insert de auditoría.**
- `src/server/repositories/category.repository.ts` — forma de repositorio (`import "server-only"`, funciones sueltas).
- `src/app/api/categories/route.ts` — forma exacta de Route Handler: `try` → guard → `schema.parse` → repositorio → `handleApiError(error)`.
- `src/server/db/seed-data.ts` — `ROLE_SEED`, `SUPER_ADMIN_ROLE_SLUG`, `PermissionCode`. Sin `server-only`: importable desde `modules/`.
- `src/server/db/seed.ts` — `bootstrapSuperAdmin()` ya resuelve AC3. **No tocar el archivo**, solo ejecutarlo.
- `src/middleware.ts` — ya cubre ambos casos: `/api/webhooks(.*)` público y `/api/admin(.*)` con `auth.protect()`. **Sin cambios.**
- `verifyWebhook` de `@clerk/nextjs/webhooks` — firma en `node_modules/@clerk/nextjs/dist/types/webhooks.d.ts`. Lee `CLERK_WEBHOOK_SIGNING_SECRET`. `standardwebhooks` ya viene con `@clerk/backend`: **no instalar `svix`**.
- `src/lib/env.ts` — `requireEnv()` para el secreto del webhook.
- Sin componentes shadcn: este spec no tiene UI.

## Tareas
- [x] T1 — `ForbiddenError` (403) + su rama en `handleApiError` · `src/lib/api-errors.ts`
- [x] T2 — `getPermissionCodes(clerkId)` (join `users→user_roles→role_permissions→permissions`, filtra `is_active`), `can()`, `requirePermission()` envuelto en `cache()` de React · `src/lib/permissions.ts`
- [x] T3 — Repositorio de sync: `upsertUserFromClerk`, `deactivateUserByClerkId`, `findUserById` · `src/server/repositories/user.repository.ts`
- [x] T4 — Lectura de usuarios con sus slugs de rol, en una sola consulta agregada (sin N+1) · `src/server/repositories/user.repository.ts`
- [x] T5 — `assignRoleToUser` / `revokeRoleFromUser`: resolver `roleId` por slug, escribir `user_roles` y `insertAuditLog` dentro de `db.transaction` · `src/server/repositories/user-role.repository.ts`
- [x] T6 — Tipos derivados del schema Drizzle (`InferSelectModel`) · `src/modules/roles/types/user-role.types.ts`
- [x] T7 — Schemas Zod `assignRoleSchema` y `userIdParamSchema` · `src/modules/roles/schemas/user-role.schema.ts`
- [x] T8 — Handler del webhook: `verifyWebhook`, switch por `evt.type`, `200` siempre que se procese · `src/app/api/webhooks/clerk/route.ts`
- [x] T9 — `GET /api/admin/users` con `requirePermission("users.read")` · `src/app/api/admin/users/route.ts`
- [x] T10 — `POST` de asignación, con el guard de auto-modificación (AC7) · `src/app/api/admin/users/[id]/roles/route.ts`
- [x] T11 — `DELETE` de revocación, mismo guard · `src/app/api/admin/users/[id]/roles/[roleSlug]/route.ts`
- [x] T12 — Documentar `CLERK_WEBHOOK_SIGNING_SECRET` · `.env.example` y `docs/SETUP.md §2`
- [ ] T13 — Operación: crear el endpoint en Clerk Dashboard → Webhooks, copiar el secreto a `.env.local`, pedir a `ronaldreyesramirez@gmail.com` que inicie sesión, verificar la fila en `db:studio`
- [ ] T14 — Operación: `BOOTSTRAP_SUPER_ADMIN_EMAIL=ronaldreyesramirez@gmail.com` en `.env.local` + `npm run db:seed`; comprobar AC3

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- **El reviewer debe pasar la skill `security-review`**: este spec toca autenticación, autorización y superficie de ataque pública (webhook sin sesión).
- El objetivo de negocio se cumple en T13–T14. T1–T12 existen para que la próxima asignación no requiera acceso a `.env.local` ni a la consola de la base.
- **Ninguna comparación de slug de rol para autorizar.** `super_admin` manda porque tiene los 20 permisos en `role_permissions`, no porque el código lo trate distinto (CLAUDE.md regla dura 8). El único uso legítimo del slug es como *dato* de entrada en el body.
- El webhook es la única ruta pública que escribe en `users`: sin `verifyWebhook` cualquiera podría crear usuarios. Verificar firma **antes** de leer el body.
- Clerk reintenta los webhooks: `upsertUserFromClerk` debe ser idempotente (`onConflictDoUpdate` sobre `users_clerk_id_unique`). Los eventos pueden llegar desordenados; `user.updated` sobre una fila inexistente también debe insertar.
- Si el usuario objetivo ya inició sesión **antes** de configurar el webhook, no hay evento pendiente: reenviarlo desde el Dashboard de Clerk o forzar un `user.updated` editando su perfil.
### Decisiones tomadas al implementar (T1–T12)
- El join de permisos vive en `user.repository.ts` (`findActorByClerkId`), no en `lib/permissions.ts`: toda consulta a BD va en `repositories/` (CLAUDE.md regla dura 3). `permissions.ts` orquesta, cachea con `cache()` y expone `getPermissionCodes` / `can` / `requirePermission`.
- La misma consulta devuelve `users.id` y los códigos, así `requirePermission` no dispara un segundo SELECT para el `assigned_by`.
- Sin permiso **o** sin fila activa en `users` → `ForbiddenError` (403), no 401: la sesión de Clerk es válida, lo que falta es autorización.
- `AuditChanges` declara `before?/after?` opcionales, no nullables: se **omite** la clave en lugar de escribir `null`. El JSON resultante es equivalente al de la tabla de arriba.
- `upsertUserFromClerk` no toca `is_active` en el `DO UPDATE`: un `user.updated` de Clerk (cambio de avatar) no debe revertir una baja hecha desde el panel o por `user.deleted`.
- El DELETE necesita validar dos segmentos de ruta: `revokeRoleParamsSchema = userIdParamSchema.extend({ roleSlug })`, reutilizando el enum en vez de duplicarlo.
- La existencia del usuario (AC6) se comprueba en el handler con `findUserById`; la FK de `user_roles` daría `23503`, indistinguible entre usuario y rol inexistente.
- `getPermissionCodes` corre en cada request de admin. Envolver en `cache()` evita repetir el join dentro del mismo request; no usar caché entre requests: una revocación debe surtir efecto inmediato.
