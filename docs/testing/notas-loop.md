# Notas del loop nocturno de unit testing

Log de avance del `/loop` (cron cada hora) que crea las pruebas unitarias de
`docs/funciones-testeables.md`, módulo por módulo. Un módulo no empieza hasta
que el anterior queda completo y en verde (`npm run test`).

## Resumen final

**Loop terminado — los 10 módulos de `docs/funciones-testeables.md` tienen
test completo y en verde.** Suite final: **222/222 tests, 0 fallos**, corrida
con `npm run test` (runner nativo de Node 24, sin librerías de terceros).

- Módulos con lógica real testeada directamente: `lib/`, `server/repositories`
  (parcial — ver detalle por submódulo), `server/services`, `server/db`
  (parcial — `seed-data.ts`), `modules/products`, `modules/categories`,
  `modules/orders` (3 submódulos), `modules/roles`, `modules/cart`,
  `modules/storefront` (4 submódulos).
- Funciones omitidas conscientemente (CRUD de una línea sin lógica propia, o
  módulo no importable de forma segura): ver la sección "Funciones saltadas"
  y el detalle de `server/db` más abajo. Cada una tiene su razón documentada.
- Bugs reales encontrados en código de **producción**: ninguno.
- Bug real encontrado y corregido en la **infraestructura de test** (el hook
  de resolución de módulos): uno, detallado en la sección de
  `modules/storefront` más abajo. Se corrigió la causa raíz, sin tocar ningún
  valor esperado de ningún test.
- Nada quedó bloqueado para reclasificación SDD humana.
- Infraestructura de testing creada esta noche, ahora documentada en
  `docs/SETUP.md` §8: runner nativo + `mock.module()`, resolución de `@/*` y
  de imports sin extensión, stub de `server-only`, `DATABASE_URL` dummy,
  `src/test-utils/mocks/drizzle.ts` para repositorios con lógica real.

Este cron job se cancela con esta corrida (regla 8). Cualquier función nueva
que se agregue al proyecto de aquí en adelante no tiene test automático: hay
que escribirlo a mano siguiendo la convención de `docs/SETUP.md` §8.

## Infraestructura descubierta/creada en el primer tick

No estaba prevista en `docs/SETUP.md` §8 original; se documentó ahí a medida
que apareció. Resumen para no repetir la investigación:

- **`node --experimental-test-module-mocks`**: necesario para `mock.module()`
  nativo de `node:test` (mockear Clerk, `db`, axios, Stripe sin librerías de
  terceros). Ya está en el script `test` de `package.json`.
- **`scripts/ts-extension-hook.mjs`** (registrado vía `scripts/register-test-hooks.mjs`
  con `--import`): resuelve tres cosas que el ESM nativo de Node no resuelve
  igual que el bundler de Next.js:
  1. Imports relativos sin extensión (`./utils` → `./utils.ts`).
  2. El alias `@/*` → `<root>/src/*` (usado por casi todo `server/` y `modules/`).
  3. Subpaths de paquete sin `exports` en su `package.json` que Node no
     completa con `.js` (p. ej. `next/server` → `next/server.js`).
- **`scripts/server-only-stub.mjs`**: `import "server-only"` (primera línea de
  todo archivo en `server/repositories/` y `server/services/`, y de
  `lib/permissions.ts`) lanza siempre bajo Node puro — Next.js lo resuelve a
  vacío solo vía alias de su bundler. El hook redirige ahí.
- **Mocks de módulo con alcance de test**: usar `t.mock.module(...)` (el de la
  firma `test(name, async (t) => {...})`), no el `mock` global importado de
  `"node:test"` — el global no se auto-restaura entre tests del mismo archivo
  y produce `ERR_INVALID_STATE: already mocked` en el segundo uso.
- **Reimport con query string** (`import(`./modulo.ts?case-${Math.random()}`)`):
  necesario cuando el módulo bajo prueba memoiza algo a nivel de módulo (p. ej.
  `loadActor` con `React.cache()` en `lib/permissions.ts`) — sin esto, un test
  puede leer el resultado cacheado de otro test.

## Progreso por módulo

| Módulo | Estado | Tests | Notas |
|---|---|---|---|
| `lib/` | ✅ completo, en verde | 40/40 | Cubre `cn`, `slugify`, `formatPriceFromCents`, `getPermissionCodes`, `can`, `requirePermission`, `handleApiError` (+ `isPostgresError` indirecta), `requireAuth`, `requireEnv`. |
| `server/repositories` (7 submódulos) | ✅ completo, en verde | 34/34 | Ver detalle de qué se testeó y qué se omitió abajo. |
| `server/services` | ✅ completo, en verde | 3/3 | `getOrCreateStripeCustomer`: usuario inexistente, cliente Stripe ya existente (no llama a Stripe), creación + persistencia de uno nuevo. |
| `server/db` (seed) | ✅ completo, en verde | 13/13 | Solo `seed-data.ts` (datos puros). `seed.ts` no es testeable — ver detalle abajo. |
| `modules/products` | ✅ completo, en verde | 27/27 | `product.schema.ts` (23: `priceToCents`, `hasValidCompareAtPrice`, refines de los 4 schemas, `productIdSchema`) + `product.service.ts` (4: los 4 wrappers de axios). |
| `modules/categories` | ✅ completo, en verde | 14/14 | `category.schema.ts` (10) + `category.service.ts` (4, mismo patrón de wrappers axios que `product.service.ts`). |
| `modules/orders` (3 submódulos) | ✅ completo, en verde | 32/32 | `checkout` (schema 9 + service 1), `order-history` (schema 7 + `constants.ts` 6 + service 3), `payment-method` (schema 2 + service 4). |
| `modules/roles` | ✅ completo, en verde | 9/9 | `roleLabel` (3), `getUsers` (1), y `user-role.schema.ts` (5: no estaba en el inventario original por no tener refine/transform propio, pero se testeó por consistencia con el resto de schemas de id/slug ya cubiertos en otros módulos). |
| `modules/cart` | ✅ completo, en verde | 13/13 | `cart.store.ts`: `addItem` (nueva línea, incrementa existente, clamp a `MAX_QUANTITY`), `removeItem`, `setQuantity` (clamp inferior/superior, truncado), `clear` (no cierra el drawer), `setOpen`, `selectCartCount`, `selectCartSubtotalCents`. Store de Zustand testeado vía `getState()`/`setState()`, sin renderizar nada. |
| `modules/storefront` (4 submódulos) | ✅ completo, en verde | 34/34 | `public-catalog.schema` (13), `catalog-url` (13), `public-catalog.service` (4), `constants.tileGradient` (4), `catalog-filters.store` (3, incluye `emptyToUndefined`/`collapseRepeated` internas cubiertas indirectamente). |

**Todos los módulos de `docs/funciones-testeables.md` están completos y en
verde.** Suite final: **222/222 tests**, 0 fallos. Ver el resumen final más
abajo.

### `server/repositories` — detalle

Política aplicada (documentada en `docs/SETUP.md` §8): se testean funciones con
lógica de negocio real; se omiten los CRUD de una línea que solo reenvían a
Drizzle, porque mockear toda la cadena encadenada no verificaría ningún
comportamiento nuestro. Se exportaron 3 helpers internos puros que antes no lo
estaban (cambio trivial, sin efecto en comportamiento) para poder testearlos
directo: `escapeLikePattern` (`product.repository.ts`), `mergeLines` y
`startOfNextDay` (`order.repository.ts`).

Testeado: `escapeLikePattern`, `mergeLines`, `startOfNextDay`,
`createPendingOrder` (merge de líneas, validación de producto inexistente/
inactivo/sin stock, cómputo íntegro del total), `markOrderAsPaid`
(idempotencia sin orden pendiente, descuento de stock, línea con producto
borrado), `findOrderById`, `listOrdersByUser` (agrupación de líneas por
orden), `setDefaultPaymentMethod` (orden de las dos escrituras),
`findActorByClerkId` (dedup de permisos, filtrado de `null`, actor inexistente).

### `server/db` (seed) — detalle

`seed-data.ts` es un módulo de datos puro (sin `server-only`, sin `db`): se
testearon invariantes reales, no solo "existe la constante" — código de
permiso derivado de `resource.action`, unicidad de códigos/slugs/SKUs,
integridad referencial (todo permiso citado por un rol existe en
`PERMISSION_SEED`, todo producto cita una categoría que existe), y la regla
dura de precios en enteros (`Number.isInteger`) más que `compareAtPriceCents`,
cuando existe, sea mayor que `priceCents`.

**`seed.ts` no es testeable tal como está — no es un caso de "mock excesivo",
es que el módulo no es seguro de importar**: sus tres funciones
(`seedRbacCatalog`, `seedCatalog`, `bootstrapSuperAdmin`) no están exportadas,
y el archivo se autoejecuta al importarse terminando en
`seed().then(() => process.exit(0)).catch(() => process.exit(1))` — importarlo
desde un test mataría el proceso del test runner (éxito o error, ambas ramas
llaman `process.exit`). Hacerlo testeable exigiría exportar las tres funciones
y envolver la autoejecución en una guarda (`import.meta.url === process.argv[1]`
o similar) — es un cambio de estructura del script, no un `export` trivial, y
excede el alcance de este loop (es un script de CLI de un solo uso, no código
de runtime de la app; su corrección real se verifica corriendo
`npm run db:seed` contra una base de prueba). Se deja anotado para que el
equipo decida si vale la pena el refactor en un spec aparte.

### `modules/products` — detalle

Se exportó `hasValidCompareAtPrice` en `product.schema.ts` (antes interna),
mismo criterio que los helpers de repositorios: cambio trivial, sin efecto en
comportamiento, solo para poder testearla directo además de a través del
`.refine()` de los schemas que la usan.

### `modules/storefront` — detalle

Se encontró y corrigió un bug real durante este módulo, pero en la
**infraestructura de test** (`scripts/ts-extension-hook.mjs`), no en código de
producción: la detección de "ya tiene extensión" usaba una regex genérica que
confundía `../schemas/public-catalog.schema` (import relativo a un archivo con
nombre compuesto) con un archivo que ya terminaba en `.schema`, y se saltaba
la resolución — `catalog-url.test.ts` fallaba con `ERR_MODULE_NOT_FOUND`. Se
corrigió comparando contra una lista cerrada de extensiones reales. Ver
`docs/SETUP.md` §8.4. No se tocó ningún valor esperado de ningún test para
"hacerlo pasar": se arregló la causa real (el hook), tal como pide la regla 5.

## Bugs reales encontrados

Ninguno en código de producción. El único bug real de esta sesión fue en la
infraestructura de test propia (ver detalle de `modules/storefront` arriba),
corregido en su causa raíz.

## Funciones saltadas (mock excesivo o bloqueo de reclasificación)

`server/repositories` — CRUD de una sola línea sin lógica propia; testearlas
exigiría fingir toda la cadena de Drizzle solo para comprobar que se llamó,
no un comportamiento real. Cobertura real: test de integración contra
Postgres (fuera del alcance de este loop).

- `product.repository.ts`: `listProducts`, `findProductById`, `createProduct`,
  `updateProduct`, `deleteProduct`, `listPublicProducts` (construcción dinámica
  de filtros SQL — ver nota de diseño abajo), `listPublicBrands`.
- `order.repository.ts`: `attachCheckoutSessionToOrder` (un solo `UPDATE` sin
  ramas; `findOrderById` y `listOrdersByUser` sí se testearon por tener lógica
  de agrupación/short-circuit real).
- `category.repository.ts`: `listCategories`, `findCategoryById`,
  `createCategory`, `updateCategory`, `deleteCategory`,
  `listPublicCategoriesWithCount`.
- `payment-method.repository.ts`: `listPaymentMethodsByUser`,
  `savePaymentMethod`, `findPaymentMethodById`, `deletePaymentMethodById`.
- `user.repository.ts`: `upsertUserFromClerk`, `deactivateUserByClerkId`,
  `findUserById`, `setStripeCustomerId`, `findUserByStripeCustomerId`,
  `listUsersWithRoles`.
- `audit-log.repository.ts`: `insertAuditLog` (queda cubierta indirectamente
  por los tests de `user-role.repository.test.ts`, que sí ejercitan una
  transacción real con el mismo mock).

**Nota de diseño (no aplicada, solo observación)**: `listPublicProducts`
mezcla la construcción de condiciones SQL dinámicas (texto, categoría, marca,
precio, stock, oferta) con la ejecución de la consulta en la misma función.
Si en el futuro se quiere cubrir esa lógica de filtrado con un test unitario
honesto, convendría extraer la construcción de `conditions`/`orderBy` a una
función pura separada (p. ej. `buildPublicProductConditions(query)`) que no
toque `db`. No se hizo aquí: es un cambio de diseño, no una prueba ni un bug,
y excede el alcance de este loop.
