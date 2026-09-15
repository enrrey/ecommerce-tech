# Funciones testeables por módulo

Inventario de las funciones que existen hoy en el código y que son candidatas
a pruebas unitarias: lógica pura, validadores, transformadores, repositorios y
servicios de servidor, acciones de store. **No se incluyen** componentes
(`.tsx` con JSX), Route Handlers de `src/app/api/**` (orquestación, no lógica
unitaria), páginas/layouts, ni hooks (`src/hooks/**` y `src/modules/*/hooks/**`)
por depender del ciclo de render y de TanStack Query — eso es flujo entre
componentes, no lógica aislable. Las fábricas de query keys (`*Keys`, usadas
solo por los hooks) también quedan fuera por el mismo motivo.

Las funciones marcadas como *interna* no se exportan del archivo, pero se
listan porque contienen lógica propia que otra función exportada delega en
ellas.

---

## lib/

| Función | Ubicación | Descripción |
|---|---|---|
| `cn` | `src/lib/utils.ts` | Combina clases de Tailwind con `clsx` y resuelve conflictos con `twMerge`. |
| `slugify` | `src/lib/utils.ts` | Normaliza un texto a slug: quita diacríticos, pasa a minúsculas y reemplaza caracteres no alfanuméricos por guiones. |
| `formatPriceFromCents` | `src/lib/utils.ts` | Formatea un entero en centavos como moneda localizada (`Intl.NumberFormat`). |
| `getPermissionCodes` | `src/lib/permissions.ts` | Devuelve los códigos de permiso efectivos de un `clerkId`, o `[]` si el actor no existe. |
| `can` | `src/lib/permissions.ts` | Comprueba (sin lanzar) si el usuario autenticado actual tiene un código de permiso dado. |
| `requirePermission` | `src/lib/permissions.ts` | Exige sesión y permiso para un código dado; lanza `UnauthorizedError`/`ForbiddenError` o devuelve el `users.id` del actor. |
| `isPostgresError` *(interna)* | `src/lib/api-errors.ts` | Recorre la cadena `cause` de un error hasta `MAX_CAUSE_DEPTH` buscando un código de error de Postgres específico. |
| `handleApiError` | `src/lib/api-errors.ts` | Traduce una excepción (errores de dominio, `ZodError`, violaciones de unicidad/FK de Postgres) a una `NextResponse` con el status y cuerpo correctos. |
| `requireAuth` | `src/lib/auth.ts` | Exige sesión de Clerk activa; lanza `UnauthorizedError` o devuelve el `clerkId`. |
| `requireEnv` | `src/lib/env.ts` | Lee una variable de entorno y lanza si está ausente o vacía. |

---

## server/repositories

### product.repository

| Función | Ubicación | Descripción |
|---|---|---|
| `listProducts` | `src/server/repositories/product.repository.ts` | Lista todos los productos con el nombre de su categoría, ordenados por nombre. |
| `findProductById` | `src/server/repositories/product.repository.ts` | Busca un producto por id junto con el nombre de su categoría. |
| `createProduct` | `src/server/repositories/product.repository.ts` | Inserta un producto y devuelve la fila creada. |
| `updateProduct` | `src/server/repositories/product.repository.ts` | Actualiza solo los campos enviados de un producto por id. |
| `deleteProduct` | `src/server/repositories/product.repository.ts` | Elimina un producto por id y devuelve la fila borrada, o `null`. |
| `escapeLikePattern` *(interna)* | `src/server/repositories/product.repository.ts` | Escapa `%` y `_` en un término de búsqueda antes de usarlo en un `ILIKE`. |
| `listPublicProducts` | `src/server/repositories/product.repository.ts` | Construye y ejecuta la consulta paginada del catálogo público aplicando filtros de texto, categoría, marca, precio, stock y oferta, y normaliza `compareAtPriceCents`. |
| `listPublicBrands` | `src/server/repositories/product.repository.ts` | Devuelve las marcas distintas con catálogo activo visible, para la faceta de filtro. |

### category.repository

| Función | Ubicación | Descripción |
|---|---|---|
| `listCategories` | `src/server/repositories/category.repository.ts` | Lista todas las categorías ordenadas por nombre. |
| `findCategoryById` | `src/server/repositories/category.repository.ts` | Busca una categoría por id. |
| `createCategory` | `src/server/repositories/category.repository.ts` | Inserta una categoría y devuelve la fila creada. |
| `updateCategory` | `src/server/repositories/category.repository.ts` | Actualiza solo los campos enviados de una categoría por id. |
| `deleteCategory` | `src/server/repositories/category.repository.ts` | Elimina una categoría por id y devuelve la fila borrada, o `null`. |
| `listPublicCategoriesWithCount` | `src/server/repositories/category.repository.ts` | Lista categorías activas junto con el número de productos activos de cada una. |

### order.repository

| Función | Ubicación | Descripción |
|---|---|---|
| `mergeLines` *(interna)* | `src/server/repositories/order.repository.ts` | Suma las cantidades de líneas de carrito repetidas por `productId` en un único mapa. |
| `createPendingOrder` | `src/server/repositories/order.repository.ts` | Crea una orden `pending` con sus líneas dentro de una transacción, validando existencia, estado activo y stock de cada producto. |
| `attachCheckoutSessionToOrder` | `src/server/repositories/order.repository.ts` | Guarda el id de sesión de Stripe Checkout en la orden correspondiente. |
| `markOrderAsPaid` | `src/server/repositories/order.repository.ts` | Marca una orden `pending` como `paid` de forma idempotente y descuenta el stock comprado en la misma transacción. |
| `findOrderById` | `src/server/repositories/order.repository.ts` | Busca una orden por id junto con sus líneas. |
| `startOfNextDay` *(interna)* | `src/server/repositories/order.repository.ts` | Convierte una fecha `YYYY-MM-DD` en el ISO-timestamp UTC del inicio del día siguiente. |
| `listOrdersByUser` | `src/server/repositories/order.repository.ts` | Lista las órdenes de un usuario (con líneas) filtradas por rango de fechas opcional. |

### payment-method.repository

| Función | Ubicación | Descripción |
|---|---|---|
| `listPaymentMethodsByUser` | `src/server/repositories/payment-method.repository.ts` | Lista las tarjetas guardadas de un usuario, la predeterminada primero. |
| `savePaymentMethod` | `src/server/repositories/payment-method.repository.ts` | Inserta un método de pago de forma idempotente (ignora duplicados por `stripePaymentMethodId`). |
| `findPaymentMethodById` | `src/server/repositories/payment-method.repository.ts` | Busca un método de pago por id. |
| `deletePaymentMethodById` | `src/server/repositories/payment-method.repository.ts` | Elimina un método de pago por id. |
| `setDefaultPaymentMethod` | `src/server/repositories/payment-method.repository.ts` | Desmarca la tarjeta predeterminada actual del usuario y marca la indicada, en una transacción. |

### user.repository

| Función | Ubicación | Descripción |
|---|---|---|
| `upsertUserFromClerk` | `src/server/repositories/user.repository.ts` | Inserta o actualiza (por `clerkId`) el espejo local de un usuario de Clerk. |
| `deactivateUserByClerkId` | `src/server/repositories/user.repository.ts` | Marca `isActive = false` en el usuario correspondiente a un `clerkId`. |
| `findUserById` | `src/server/repositories/user.repository.ts` | Busca un usuario por su id local. |
| `setStripeCustomerId` | `src/server/repositories/user.repository.ts` | Guarda el id de Customer de Stripe en el usuario. |
| `findUserByStripeCustomerId` | `src/server/repositories/user.repository.ts` | Busca un usuario por su id de Customer de Stripe. |
| `findActorByClerkId` | `src/server/repositories/user.repository.ts` | Resuelve identidad y permisos efectivos de un actor activo a partir de su `clerkId`. |
| `listUsersWithRoles` | `src/server/repositories/user.repository.ts` | Lista usuarios junto con los slugs de sus roles asignados. |

### user-role.repository

| Función | Ubicación | Descripción |
|---|---|---|
| `findRoleIdBySlug` *(interna)* | `src/server/repositories/user-role.repository.ts` | Resuelve el id de un rol a partir de su slug; lanza `NotFoundError` si no existe. |
| `assignRoleToUser` | `src/server/repositories/user-role.repository.ts` | Asigna un rol a un usuario y registra el evento en `audit_logs`, en una sola transacción. |
| `revokeRoleFromUser` | `src/server/repositories/user-role.repository.ts` | Revoca un rol de un usuario y audita el evento; devuelve `null` si el usuario no tenía ese rol. |

### audit-log.repository

| Función | Ubicación | Descripción |
|---|---|---|
| `insertAuditLog` | `src/server/repositories/audit-log.repository.ts` | Inserta una fila en `audit_logs` (append-only), opcionalmente dentro de una transacción recibida. |

---

## server/services

| Función | Ubicación | Descripción |
|---|---|---|
| `getOrCreateStripeCustomer` | `src/server/services/stripe-customer.service.ts` | Devuelve el `stripeCustomerId` del usuario, creando el Customer en Stripe y persistiéndolo si aún no existe. |

---

## server/db (seed)

| Función | Ubicación | Descripción |
|---|---|---|
| `permission` *(interna)* | `src/server/db/seed-data.ts` | Construye un registro de permiso derivando su `code` de `resource` y `action`. |
| `seedRbacCatalog` | `src/server/db/seed.ts` | Inserta permisos, roles de sistema y la matriz rol×permiso de forma idempotente. |
| `seedCatalog` | `src/server/db/seed.ts` | Inserta categorías y productos de demostración de forma idempotente. |
| `bootstrapSuperAdmin` | `src/server/db/seed.ts` | Asigna el rol `super_admin` al usuario cuyo email coincide con `BOOTSTRAP_SUPER_ADMIN_EMAIL`, si existe. |

---

## modules/products

| Función | Ubicación | Descripción |
|---|---|---|
| `hasValidCompareAtPrice` | `src/modules/products/schemas/product.schema.ts` | Verifica que `compareAtPriceCents` sea nulo o mayor que `priceCents`. |
| `priceToCents` (schema) | `src/modules/products/schemas/product.schema.ts` | Convierte un precio en unidades monetarias (string o number, hasta 2 decimales) a centavos enteros, validando rango y precisión. |
| `getProducts` | `src/modules/products/services/product.service.ts` | Llama a `GET /products` y devuelve el listado. |
| `createProduct` | `src/modules/products/services/product.service.ts` | Llama a `POST /products` con el input dado y devuelve el producto creado. |
| `updateProduct` | `src/modules/products/services/product.service.ts` | Llama a `PATCH /products/:id` con los campos a actualizar. |
| `deleteProduct` | `src/modules/products/services/product.service.ts` | Llama a `DELETE /products/:id`. |

---

## modules/categories

| Función | Ubicación | Descripción |
|---|---|---|
| `getCategories` | `src/modules/categories/services/category.service.ts` | Llama a `GET /categories` y devuelve el listado. |
| `createCategory` | `src/modules/categories/services/category.service.ts` | Llama a `POST /categories` con el input dado. |
| `updateCategory` | `src/modules/categories/services/category.service.ts` | Llama a `PATCH /categories/:id` con los campos a actualizar. |
| `deleteCategory` | `src/modules/categories/services/category.service.ts` | Llama a `DELETE /categories/:id`. |

---

## modules/orders

### checkout

| Función | Ubicación | Descripción |
|---|---|---|
| `postCheckoutSession` | `src/modules/orders/services/checkout.service.ts` | Llama a `POST /checkout/session` con las líneas del carrito y devuelve la URL de Stripe Checkout. |

### order-history

| Función | Ubicación | Descripción |
|---|---|---|
| `emptyToUndefined` *(interna)* | `src/modules/orders/schemas/order-history.schema.ts` | Normaliza una cadena vacía a `undefined` antes de validar un parámetro de fecha. |
| `getMyOrders` | `src/modules/orders/services/order-history.service.ts` | Llama a `GET /orders/mine` con un rango de fechas opcional y devuelve el historial. |
| `getOrderReceipt` | `src/modules/orders/services/order-history.service.ts` | Llama a `GET /orders/:id/receipt` y devuelve el comprobante de una orden. |
| `cardBrandLabel` | `src/modules/orders/constants.ts` | Traduce el código de marca de tarjeta de Stripe a un nombre presentable, o lo devuelve tal cual si no está mapeado. |
| `formatCardExpiry` | `src/modules/orders/constants.ts` | Formatea mes/año de vencimiento de una tarjeta como `MM/AAAA`. |
| `orderStatusPresentation` | `src/modules/orders/constants.ts` | Resuelve la etiqueta, variante visual y aviso asociados a un estado de orden, con fallback para estados no mapeados. |

### payment-method

| Función | Ubicación | Descripción |
|---|---|---|
| `postSetupSession` | `src/modules/orders/services/payment-method.service.ts` | Llama a `POST /payment-methods/setup-session` para iniciar el guardado de una tarjeta. |
| `getPaymentMethods` | `src/modules/orders/services/payment-method.service.ts` | Llama a `GET /payment-methods` y devuelve las tarjetas guardadas. |
| `deletePaymentMethod` | `src/modules/orders/services/payment-method.service.ts` | Llama a `DELETE /payment-methods/:id`. |
| `setDefaultPaymentMethod` | `src/modules/orders/services/payment-method.service.ts` | Llama a `PATCH /payment-methods/:id/default`. |

---

## modules/roles

| Función | Ubicación | Descripción |
|---|---|---|
| `getUsers` | `src/modules/roles/services/user.service.ts` | Llama a `GET /admin/users` y devuelve los usuarios con sus roles. |
| `roleLabel` | `src/modules/roles/constants.ts` | Traduce el slug de un rol a su nombre legible según la semilla de roles, o devuelve el slug si no está en ella. |

---

## modules/cart

| Función | Ubicación | Descripción |
|---|---|---|
| `clampQuantity` *(interna)* | `src/modules/cart/store/cart.store.ts` | Acota una cantidad al rango entero `[1, MAX_QUANTITY]`. |
| `addItem` (acción del store) | `src/modules/cart/store/cart.store.ts` | Agrega un producto al carrito o incrementa su cantidad si ya existe, y abre el drawer. |
| `removeItem` (acción del store) | `src/modules/cart/store/cart.store.ts` | Quita una línea del carrito por id. |
| `setQuantity` (acción del store) | `src/modules/cart/store/cart.store.ts` | Fija la cantidad de una línea del carrito, acotada por `clampQuantity`. |
| `clear` (acción del store) | `src/modules/cart/store/cart.store.ts` | Vacía todas las líneas del carrito. |
| `setOpen` (acción del store) | `src/modules/cart/store/cart.store.ts` | Abre o cierra el drawer del carrito. |
| `selectCartCount` | `src/modules/cart/store/cart.store.ts` | Selector: suma las cantidades de todas las líneas del carrito. |
| `selectCartSubtotalCents` | `src/modules/cart/store/cart.store.ts` | Selector: suma el subtotal en centavos de todas las líneas del carrito. |

---

## modules/storefront

### catalog-url (`lib/`)

| Función | Ubicación | Descripción |
|---|---|---|
| `isActivePriceBucket` | `src/modules/storefront/lib/catalog-url.ts` | Determina si un rango de precio predefinido coincide con el filtro de precio actual de la query. |
| `collapseRepeated` *(interna)* | `src/modules/storefront/lib/catalog-url.ts` | Colapsa parámetros de URL repetidos a su último valor. |
| `parseCatalogSearchParams` | `src/modules/storefront/lib/catalog-url.ts` | Valida de forma tolerante los `searchParams` crudos de la página de catálogo; si fallan, devuelve la query por defecto. |
| `buildCatalogHref` | `src/modules/storefront/lib/catalog-url.ts` | Construye la URL canónica del catálogo aplicando un parche sobre la query actual, omitiendo valores por defecto. |
| `hasActiveFilters` | `src/modules/storefront/lib/catalog-url.ts` | Indica si la query del catálogo tiene algún filtro distinto de los valores por defecto. |

### public-catalog (schema + service)

| Función | Ubicación | Descripción |
|---|---|---|
| `emptyToUndefined` *(interna)* | `src/modules/storefront/schemas/public-catalog.schema.ts` | Normaliza una cadena vacía a `undefined` antes de validar un parámetro de query. |
| `getPublicProducts` | `src/modules/storefront/services/public-catalog.service.ts` | Llama a `GET /public/products` con la query dada y devuelve la página de resultados. |
| `getPublicCategories` | `src/modules/storefront/services/public-catalog.service.ts` | Llama a `GET /public/categories` y devuelve las categorías públicas. |
| `getPublicBrands` | `src/modules/storefront/services/public-catalog.service.ts` | Llama a `GET /public/brands` y devuelve las marcas disponibles. |

### presentación

| Función | Ubicación | Descripción |
|---|---|---|
| `tileGradient` | `src/modules/storefront/constants.ts` | Deriva de forma estable un degradado de tarjeta a partir de un texto semilla (hash simple por suma de códigos de carácter). |

### store

| Función | Ubicación | Descripción |
|---|---|---|
| `setTerm` (acción del store) | `src/modules/storefront/store/catalog-filters.store.ts` | Fija el término de búsqueda del preview de la landing. |
| `reset` (acción del store) | `src/modules/storefront/store/catalog-filters.store.ts` | Limpia el término de búsqueda. |
