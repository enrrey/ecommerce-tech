---
id: 004
title: Schema y repositorio append-only de audit_logs
status: done
module: shared
scope: admin
---

# 004 — Schema y repositorio append-only de `audit_logs`

## Objetivo
El servidor puede persistir un evento de auditoría inmutable (`audit_logs`) dentro
de la transacción de la mutación que lo origina.

## Alcance
Incluye:
- Schema Drizzle `audit_logs` + `pgEnum` `audit_severity` (primer enum del proyecto).
- Migración generada y aplicada.
- Tipos inferidos en `src/modules/audit/types/`.
- Repositorio mínimo `audit-log.repository.ts` con **solo** `insertAuditLog`, que
  acepta un cliente Drizzle externo (transacción) opcional. Se incluye aquí para
  cerrar la capa de datos completa; el 007 solo lo consume.

No incluye:
- `src/lib/audit.ts::logAudit()` y sus llamadas (spec 007).
- Endpoints, hooks, servicios ni UI de bitácora.
- Job de purga por retención.
- Sanitización/enmascarado de contenido (responsabilidad del llamador, ver AC5).

## Criterios de aceptación
- [x] AC1 — Dado el schema, cuando se corre `npm run db:generate`, entonces el SQL
      crea el tipo enum, la tabla `audit_logs` y los 4 índices, sin `ALTER`/`DROP`
      sobre tablas existentes.
- [x] AC2 — Dado un usuario borrado, cuando se elimina su fila en `users`, entonces
      sus filas de `audit_logs` persisten con `actor_id = null` (`ON DELETE SET NULL`).
- [x] AC3 — Dado el repositorio, cuando se inspecciona su superficie pública,
      entonces expone únicamente `insertAuditLog` — sin `update*`, `delete*` ni
      `purge*` (append-only, SETUP §5.2 regla 1).
- [x] AC4 — Dado un `tx` de `db.transaction(...)`, cuando se llama
      `insertAuditLog(input, tx)`, entonces el insert usa ese cliente y revierte con
      el rollback de la transacción; sin segundo argumento usa `db` (SETUP §5.2 regla 2).
- [x] AC5 — Dado que el repositorio **no** sanitiza `changes` ni `metadata`, entonces
      un comentario en el archivo deja explícito que enmascarar PII, tokens y
      secretos es responsabilidad del llamador (SETUP §5.2 regla 3). No se añade
      lógica de filtrado aquí.

## Datos
**Requiere migración** (nueva tabla + nuevo tipo enum). Fuente: `docs/SETUP.md §5.2`.

`audit_severity` = `pgEnum("audit_severity", ["info", "warning", "error"])`.

| Columna | Tipo Drizzle | Constraint |
|---|---|---|
| `id` | `uuid` | PK `.defaultRandom()` |
| `actor_id` | `uuid` | FK `users.id` · nullable · `onDelete: "set null"` |
| `action` | `text` | not null |
| `entity_type` | `text` | not null |
| `entity_id` | `text` | nullable |
| `changes` | `jsonb` | nullable · `.$type<AuditChanges>()` |
| `metadata` | `jsonb` | nullable · `.$type<Record<string, unknown>>()` |
| `ip_address` | `inet` | nullable |
| `user_agent` | `text` | nullable |
| `severity` | `auditSeverity` | not null · `.default("info")` |
| `created_at` | `timestamp` `{ withTimezone: true, mode: "string" }` | not null · `.defaultNow()` |

Índices (tercer argumento de `pgTable`, mismo estilo que `product.ts`):
`audit_logs_entity_idx` (entity_type, entity_id) · `audit_logs_actor_created_at_idx`
(actor_id, `desc(created_at)`) · `audit_logs_action_idx` (action) ·
`audit_logs_created_at_idx` (`desc(created_at)`).

## API
Sin Route Handlers ni Zod en este spec (capa de datos exclusivamente).

## Reutilizar
- `src/server/db/schema/user-role.ts` — patrón exacto de FK `set null` a `users.id`
  y de `timestamp` con `mode: "string"`; copiar estilo, no reinventar.
- `src/server/db/schema/product.ts` — patrón de índices con `index("nombre").on(...)`.
- `src/server/db/schema/index.ts` — barrel; añadir una línea, no tocar las 7 existentes.
- `src/modules/categories/types/category.types.ts` — patrón `InferSelectModel` /
  `InferInsertModel` para derivar tipos del schema.
- `src/server/repositories/category.repository.ts` — patrón de repositorio:
  `import "server-only"` en la línea 1, funciones async planas, `.returning()`.
- `src/server/db/index.ts` — exporta `db` y `type Database`; usa driver
  `neon-serverless` (WebSocket) precisamente porque soporta transacciones
  multi-sentencia. No modificarlo.
- `src/modules/audit/{types,schemas,...}` ya existen vacíos: usar, no crear.
- Sin componentes shadcn (no hay UI en este spec).

## Tareas
- [x] T1 — `pgEnum` `audit_severity` + `pgTable` `audit_logs` con columnas e índices
      de §Datos · `src/server/db/schema/audit-log.ts`
- [x] T2 — Añadir `export * from "./audit-log";` al barrel · `src/server/db/schema/index.ts`
- [x] T3 — Tipos `AuditLog`, `NewAuditLog`, `AuditSeverity` y `AuditChanges`
      (`{ before?: Record<string, unknown>; after?: Record<string, unknown> }`) ·
      `src/modules/audit/types/audit-log.types.ts`
- [x] T4 — `npm run db:generate` · revisar `drizzle/0003_*.sql`: un `CREATE TYPE`, un
      `CREATE TABLE`, 4 `CREATE INDEX`, ningún `DROP`
- [x] T5 — `npm run db:migrate` (nunca `db:push`) · verificar tabla vacía en `db:studio`
- [x] T6 — `insertAuditLog(input: NewAuditLog, client: DbClient = db): Promise<AuditLog>`
      con comentario de AC5 · `src/server/repositories/audit-log.repository.ts`

Verificación final: `npm run typecheck && npm run lint`

## Notas
- Tipo del cliente transaccional sin importar internos de Drizzle:
  `type DbClient = Database | Parameters<Parameters<Database["transaction"]>[0]>[0]`.
  Si el inferido no compila en strict, declararlo en el propio repositorio y no
  recurrir a `any` (bloqueante).
- Es el primer `pgEnum` del repo (verificado: no hay otro en `src/server/db/schema/`).
  Convención adoptada: nombre de tipo SQL en `snake_case` con prefijo de dominio
  (`audit_severity`), constante exportada en camelCase (`auditSeverity`).
- El enum se crea como tipo Postgres: añadir valores después exige migración propia,
  por eso `severity` queda en los tres valores de SETUP §5.2 y nada más.
- `inet` está disponible en `drizzle-orm/pg-core` (verificado en la versión instalada).
