---
id: 006
title: Panel de roles — listado de usuarios y sus roles asignados
status: done
module: auth
scope: admin
---

# 006 — Panel de roles — listado de usuarios y sus roles asignados

## Objetivo
Un operador con `users.read` puede entrar a `/admin/roles` y ver, en una tabla,
todos los usuarios de la aplicación con los roles que tiene asignado cada uno.

## Alcance
Incluye:
- Página `/admin/roles` (Server Component) con guard de permiso `users.read`.
- Service axios + hook TanStack Query sobre el `GET /api/admin/users` ya existente.
- Tabla TanStack Table v8: usuario (avatar + nombre + email), estado, roles como badges.
- Búsqueda por nombre/email, filtro por rol, filtro por estado, paginación.
- Estados de carga, error y vacío.
- Entrada "Roles" en la navegación de admin.

No incluye:
- **Asignar o revocar roles desde la UI.** El backend (`POST`/`DELETE`) ya existe
  (spec 005), pero el requerimiento es "ver". Mutaciones = spec 007.
- CRUD de roles, matriz rol×permiso, columna de permisos efectivos.
- Paginación/búsqueda en servidor: `listUsersWithRoles()` devuelve todo y la
  tabla filtra en cliente. Suficiente hasta ~1k usuarios.
- Ocultar el enlace del nav según permiso (el guard de la página ya cubre el acceso).

## Dependencia bloqueante
Spec 005 está en `status: in-review`. Verificado en el árbol: el endpoint
`src/app/api/admin/users/route.ts`, los tipos y `src/lib/permissions.ts` **ya
existen**, así que la implementación no está técnicamente bloqueada. Lo que sí
depende de 005 son sus tareas de operación T13–T14 (webhook de Clerk + seed):
sin ellas la tabla renderiza vacía y ningún usuario tiene `users.read`. No dar
por cumplido AC1 ni AC6 hasta que 005 pase a `done`.

## Criterios de aceptación
- [x] AC1 — Dado un operador con `users.read`, cuando abre `/admin/roles`, entonces ve una fila por usuario con su email y sus roles.
- [x] AC2 — Dado un usuario sin roles, entonces su celda de roles muestra "Sin roles" (no una celda vacía).
- [x] AC3 — Dado un usuario autenticado **sin** `users.read`, cuando abre `/admin/roles`, entonces ve un bloque de acceso denegado y **no** se dispara ninguna petición al listado.
- [x] AC4 — Dado el listado cargando, entonces se muestra el skeleton; si el `GET` falla, un bloque de error con el mensaje y botón "Reintentar".
- [x] AC5 — Dado el filtro por rol en `admin`, entonces solo quedan las filas cuyo `roleSlugs` incluye `admin`.
- [x] AC6 — Dado el badge de un rol, entonces muestra el nombre legible de `ROLE_SEED` (p. ej. "Super administrador"), no el slug crudo.
- [x] AC7 — `npm run typecheck && npm run lint` en verde.

## Datos
Sin cambios de esquema. Solo lectura sobre `users` + `user_roles` + `roles`
vía el repositorio existente.

## API
Sin endpoints nuevos. Se consume el ya implementado:

| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/admin/users` | `requirePermission("users.read")` | — | `200` `UserWithRoles[]` · `401` · `403` |

Zod: ninguno nuevo. Es una lectura sin entrada de usuario; la respuesta no se
revalida en cliente (mismo criterio que `product.service.ts`).

## Reutilizar
- `src/app/api/admin/users/route.ts` — endpoint listo. **No tocar.**
- `src/modules/roles/types/user-role.types.ts` — `UserWithRoles` ya existe (`id`, `email`, `firstName`, `lastName`, `imageUrl`, `isActive`, `roleSlugs[]`). Tipar el service con él.
- `src/lib/permissions.ts` — `can("users.read")` para el guard de la página (sin efectos, ya cacheado por request).
- `src/lib/axios.ts` — `api`; su interceptor ya convierte el error en `Error` con `message`.
- `src/server/db/seed-data.ts` — `ROLE_SEED` para slug → nombre legible y para las opciones del filtro. **Sin `server-only`: importable desde un componente cliente.**
- `src/modules/products/components/products-table.tsx` — patrón exacto de tabla (estado de sorting/filtros, `flexRender`, paginación). Copiar la forma, no el contenido.
- `src/modules/products/components/product-columns.tsx` — patrón de `ColumnDef` + `FilterFn` + `Badge`.
- `src/modules/products/components/products-view.tsx` — patrón de los tres estados (`isPending` / `isError` / vacío) y `TableSkeleton`.
- `src/modules/products/constants.ts` — patrón de query keys y del centinela `ALL_FILTER`.
- `src/components/ui/` — `table`, `badge`, `avatar`, `input`, `select`, `button`, `skeleton` ya instalados. **No hace falta instalar ningún componente shadcn.**
- `src/middleware.ts` — `/admin(.*)` ya protegido. Sin cambios.

## Tareas
- [x] T1 — `userKeys` + `ALL_FILTER`, `USER_STATUS_FILTERS` y `roleLabel(slug)` derivado de `ROLE_SEED` · `src/modules/roles/constants.ts`
- [x] T2 — `getUsers(): Promise<UserWithRoles[]>` sobre `GET /admin/users` · `src/modules/roles/services/user.service.ts`
- [x] T3 — `useUsers()` con `useQuery` y `userKeys.list()` · `src/modules/roles/hooks/use-users.ts`
- [x] T4 — `getUserColumns()`: usuario (avatar + nombre + email), estado, roles (badges); `FilterFn` por rol y por estado · `src/modules/roles/components/user-columns.tsx`
- [x] T5 — `UsersTable`: búsqueda global nombre/email, dos `Select` de filtro, paginación · `src/modules/roles/components/users-table.tsx`
- [x] T6 — `UsersView` (`"use client"`): consume `useUsers()` y resuelve carga/error/vacío · `src/modules/roles/components/users-view.tsx`
- [x] T7 — Página con guard `can("users.read")` → bloque 403 o `<UsersView />` · `src/app/(admin)/admin/roles/page.tsx`
- [x] T8 — Enlace "Roles" (icono `ShieldCheck`) en la navegación · `src/components/shared/admin-nav.tsx`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- La frontera `"use client"` empieza en `UsersView` (T6). La página se queda Server
  Component porque `can()` importa `server-only`; si el guard falla, `UsersView`
  no se monta y por eso AC3 no dispara la petición.
- **No mostrar columna de fecha de alta.** `createdAt` viaja como `string` en el
  JSON pero `UserWithRoles` lo tipa como `Date`: renderizarlo obliga a un tipo
  cliente aparte. Fuera del alcance, se evita el problema.
- `roleSlugs` puede llegar como `[]` (el `array_agg` del repositorio ya hace
  `coalesce` a `'{}'`), nunca `null`.
- El guard de la página es UX, no seguridad: la autorización real la impone
  `requirePermission("users.read")` en el handler. No comparar slugs de rol en
  ningún punto de la UI (CLAUDE.md regla dura 8); el filtro por rol usa el slug
  como **dato de tabla**, no como decisión de permiso.
