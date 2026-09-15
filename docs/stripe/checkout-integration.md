# Integración de Stripe Checkout

> **Esto no es un spec SDD.** Es una guía operativa de referencia para
> implementar pagos con Stripe Checkout en este proyecto. No sigue la
> convención `NNN-slug.md` de `docs/specs/` porque no se ejecuta con el flujo
> `orchestrator → spec → developer → reviewer`; sirve como insumo para cuando
> esa integración sí se aborde en modo SDD.

## 1. Alcance

Se integra **Stripe Checkout** (página de pago alojada por Stripe) para
**pagos únicos** (`mode: "payment"`). Es el punto de partida más simple según
la [guía de rutas de integración de Stripe](https://docs.stripe.com/payments/checkout.md):
menor complejidad, sin mantenimiento de UI de pago propia.

### Decisión ya tomada: no sincronizar el catálogo con Stripe

El catálogo de productos sigue viviendo exclusivamente en Neon/Drizzle
(`products`). **No se crean ni mantienen objetos `Product`/`Price` en
Stripe.** En su lugar, cada Checkout Session arma sus `line_items` con
[`price_data`](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-line_items-price_data)
inline, recalculado en el servidor a partir de `products.priceCents` en cada
sesión.

Por qué: sincronizar catálogos añade una superficie completa (webhooks de
`product.created/updated`, mapeo de IDs `stripe_product_id`/`stripe_price_id`,
resolución de conflictos cuando un precio cambia) que no aporta nada para un
catálogo pequeño y ya centralizado en nuestra base. El costo es perder
funciones del Dashboard de Stripe que dependen de tener productos/precios
declarados ahí (reportes de producto, Payment Links reutilizables) — no
hacen falta en este alcance.

### Dentro de alcance

- Checkout Session hosted, pago único, `price_data` inline.
- Persistencia de la orden (`orders`/`order_items`) en nuestra base.
- Webhook de fulfillment (`checkout.session.completed`,
  `checkout.session.async_payment_succeeded`).
- Flujo local de desarrollo con Stripe CLI (sandbox de pruebas).

### Fuera de alcance (por ahora)

| Fuera de alcance | Por qué se deja para después |
|---|---|
| Sincronizar catálogo con Stripe (`Product`/`Price`) | Decisión explícita — ver arriba. |
| Suscripciones / billing recurrente | Este alcance es solo pago único. |
| Stripe Tax | Requiere registro fiscal activo antes de activarlo — no confundir "tax calculado" con "tax realmente cobrado". |
| Stripe Connect / marketplace | No aplica: no hay vendedores terceros. |
| Setup Intents / guardar tarjetas | No hay checkout recurrente ni "comprar con 1 clic" todavía. |
| Reserva de stock al crear la orden | El stock se descuenta al confirmarse el pago (webhook), no al iniciar el checkout. Riesgo aceptado de sobreventa en la ventana entre crear la sesión y pagar. |
| Direcciones de envío/facturación | Checkout hosted sin `shipping_address_collection` activado en esta primera iteración. |
| Reembolsos y disputas desde la app | Se gestionan desde el Dashboard de Stripe por ahora. |
| Modelo de datos completo de `orders` (estados adicionales, permisos RBAC en `/api/admin/orders`, UI de `admin/orders`) | Es trabajo de un spec SDD futuro; aquí solo se define lo mínimo para que Checkout funcione. |

## 2. Arquitectura del flujo

Seguimos el mismo flujo de capas de `docs/SETUP.md` §4
(Componente → hook → service → Route Handler → repositorio → Drizzle):

```
CartDrawer / CheckoutPage (cliente)
  └─ useCreateCheckoutSession()            hook (TanStack Mutation)
       └─ postCheckoutSession(items)       service (axios)
            └─ POST /api/checkout/session  Route Handler (Zod)
                 ├─ order.repository:
                 │    createPendingOrder() ──► Drizzle ──► Neon
                 │    (valida precio/stock reales, NUNCA el precio del cliente)
                 └─ src/lib/stripe.ts:
                      stripe.checkout.sessions.create({ mode: "payment", ... })
                        └─ 303 → checkout.stripe.com (Stripe-hosted)

Stripe ──POST── /api/webhooks/stripe (público, firma verificada)
                 └─ order.repository:
                      markOrderAsPaid()     ──► Drizzle ──► Neon
                      (idempotente, decrementa stock)
```

Piezas nuevas y su capa:

| Archivo | Capa |
|---|---|
| `src/server/db/schema/order.ts`, `order-item.ts` | Schema (Drizzle) |
| `src/server/repositories/order.repository.ts` | Repositorio |
| `src/lib/stripe.ts` | Cliente server-only de Stripe |
| `src/app/api/checkout/session/route.ts` | Route Handler |
| `src/app/api/webhooks/stripe/route.ts` | Route Handler (webhook, público) |
| `src/modules/orders/{schemas,types,services,hooks,components}/*` | Módulo cliente (ya existe vacío) |
| `src/app/(storefront)/checkout/page.tsx` | Página |
| `src/modules/cart/components/cart-drawer.tsx` (editar) | Componente existente |

El módulo `src/modules/orders/` ya existe en el repo (carpetas vacías con
`.gitkeep`) — no hace falta crear un módulo `checkout/` nuevo, la integración
vive en el dominio `orders` que `docs/SETUP.md` ya nombra.

## 3. Modelo de datos mínimo viable

> El spec SDD que aborde esto de verdad deberá cubrir además: direcciones de
> envío/facturación, estados adicionales (reembolsado, disputado), relación
> con `audit_logs`, permisos RBAC sobre `/api/admin/orders`, y la UI real de
> `admin/orders` (hoy `src/app/(admin)/admin/orders/page.tsx` es un placeholder
> `probe-orders` sin lógica). Lo de abajo es lo mínimo para que Checkout
> funcione de punta a punta.

`src/server/db/schema/order.ts`:

```ts
import { sql } from "drizzle-orm";
import {
  check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | paid | canceled
    totalCents: integer("total_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow()
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => [
    uniqueIndex("orders_stripe_checkout_session_id_unique").on(table.stripeCheckoutSessionId),
    uniqueIndex("orders_stripe_payment_intent_id_unique").on(table.stripePaymentIntentId),
    index("orders_user_id_idx").on(table.userId),
    check("orders_total_cents_positive", sql`${table.totalCents} >= 0`),
  ],
);
```

`src/server/db/schema/order-item.ts`:

```ts
import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { orders } from "./order";
import { products } from "./product";

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    // set null: si el producto se borra, la línea histórica del pedido se conserva.
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    // Congelados en la fila: el nombre/precio de Stripe pudo cambiar después.
    productName: varchar("product_name", { length: 120 }).notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    check("order_items_unit_price_cents_positive", sql`${table.unitPriceCents} >= 0`),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);
```

Sumar ambas al barrel `src/server/db/schema/index.ts`
(`export * from "./order"; export * from "./order-item";`).

Luego: `npm run db:generate` y `npm run db:migrate`.

## 4. Variables de entorno

Añadir a `.env.example` y `.env.local` (mismo patrón que Clerk:
`<PROVEEDOR>_SECRET_KEY` / `<PROVEEDOR>_WEBHOOK_SIGNING_SECRET`):

```bash
# Stripe
STRIPE_SECRET_KEY=""
# Firma del endpoint /api/webhooks/stripe (Stripe Dashboard o `stripe listen --print-secret`).
STRIPE_WEBHOOK_SIGNING_SECRET=""
```

- Usar una [Restricted API Key](https://docs.stripe.com/keys/restricted-api-keys.md)
  (`rk_...`) en vez de la secret key completa (`sk_...`) cuando se pase a
  producción — permisos mínimos: Checkout Sessions (write), Webhook Endpoints
  (read si se gestionan desde código).
- `.env.local` nunca se commitea (ya cubierto por `.gitignore`).
- Instalar el SDK: `npm i stripe`.

## 5. Cliente Stripe: `src/lib/stripe.ts`

Mismo patrón que `src/server/db/index.ts` (instancia única, server-only):

```ts
import "server-only";
import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

export const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  typescript: true,
});
```

Nunca usar el patrón global deprecado (`Stripe.setApiKey` / claves a nivel de
módulo) — siempre instanciar y llamar métodos sobre la instancia.

## 6. Crear la Checkout Session: `src/app/api/checkout/session/route.ts`

Es una ruta separada de `/api/orders` a propósito: desacopla "crear una
orden" de "cobrar con un proveedor concreto" — deja espacio a otro método de
pago el día de mañana sin tocar el recurso `orders`.

Contrato de entrada (Zod, `src/modules/orders/schemas/checkout.schema.ts`):

```ts
export const createCheckoutSessionSchema = z.object({
  items: z.array(z.object({
    productId: z.uuid(),
    quantity: z.number().int().min(1).max(MAX_QUANTITY),
  })).min(1),
});
```

**Nunca** se recibe `priceCents` ni `name` del cliente — el repositorio
resuelve el precio real desde `products` en el servidor.

Pasos del handler:

1. `requireAuth()` → `clerkId`; `findActorByClerkId(clerkId)` → `users.id`
   local (ya existe en `src/server/repositories/user.repository.ts`).
2. Parsear el body con Zod.
3. Repositorio: por cada `productId`, verificar `isActive` y `stock >=
   quantity`; si falta stock, lanzar `ConflictError` (ya existe en
   `src/lib/api-errors.ts` — **no crear una subclase nueva de un solo uso**).
4. `db.transaction`: crear `orders` (`status: "pending"`, `totalCents`
   calculado en servidor) + sus `order_items` con precio/nombre congelados.
5. `stripe.checkout.sessions.create({ mode: "payment", line_items: [...],
   success_url, cancel_url })` — `line_items` con `price_data` inline
   (`currency: "usd"`, `unit_amount: unitPriceCents`, `product_data: { name
   }`), **nunca** pasar `payment_method_types` (dynamic payment methods es el
   default correcto).
6. Guardar `stripeCheckoutSessionId` en la orden.
7. Responder `{ url: session.url }`.

`success_url`: `${NEXT_PUBLIC_APP_URL}/orders/{orderId}?session_id={CHECKOUT_SESSION_ID}`.
`cancel_url`: `${NEXT_PUBLIC_APP_URL}/checkout`.

## 7. Webhook de fulfillment: `src/app/api/webhooks/stripe/route.ts`

Ya es pública por `src/middleware.ts` (`/api/webhooks(.*)`, línea 12) — no
hace falta tocar el middleware. Mismo criterio que
`src/app/api/webhooks/clerk/route.ts`: verificar firma **antes** de usar el
body, responder `200` a eventos que no interesan (para que Stripe no
reintente para siempre), `5xx` solo si falla algo nuestro (para que sí
reintente).

Punto crítico: leer el **raw body** con `request.text()`, nunca
`request.json()` antes de verificar la firma:

```ts
import { stripe } from "@/lib/stripe";
import { requireEnv } from "@/lib/env";
import { markOrderAsPaid } from "@/server/repositories/order.repository";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature!,
      requireEnv("STRIPE_WEBHOOK_SIGNING_SECRET"),
    );
  } catch (error) {
    console.error("Firma de webhook de Stripe inválida", error);
    return NextResponse.json({ message: "Firma inválida" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "unpaid") {
      await markOrderAsPaid(session.id, session.payment_intent as string);
    }
  }

  return NextResponse.json({ received: true });
}
```

`markOrderAsPaid` debe ser **idempotente** (Stripe puede reintentar el mismo
evento, o llegar `completed` y `async_payment_succeeded` para la misma
sesión):

```ts
// UPDATE orders SET status = 'paid', stripe_payment_intent_id = $2
// WHERE stripe_checkout_session_id = $1 AND status = 'pending'
```

El `AND status = 'pending'` es lo que vuelve la operación segura de llamar
más de una vez con el mismo `session.id`, sin necesitar una tabla aparte de
eventos procesados. El decremento de stock ocurre aquí, al confirmarse el
pago — no al crear la orden pendiente (ver tabla de "fuera de alcance").

## 8. Módulo cliente `src/modules/orders/`

- `schemas/checkout.schema.ts` — el Zod de la sección 6.
- `types/checkout.types.ts` — `CreateCheckoutSessionInput`,
  `CreateCheckoutSessionResponse = { url: string }`.
- `services/checkout.service.ts` — `postCheckoutSession(items)` vía la
  instancia única de `src/lib/axios.ts`.
- `hooks/use-create-checkout-session.ts` — `useMutation` (mismo patrón que
  `src/modules/products/hooks/use-product-mutations.ts`). En `onSuccess`:
  `useCartStore.getState().clear()` y `window.location.href = data.url`
  (redirect de página completa, no `router.push` — se sale del dominio).
- `components/` — botón/página que dispara el hook. `"use client"` lo más
  abajo posible en el árbol.

## 9. Página `src/app/(storefront)/checkout/page.tsx`

Server Component mínimo que muestra el resumen del carrito (leído por un
client component hijo desde `useCartStore`) y el botón de pago del punto 8.
Queda protegida automáticamente por Clerk: `/checkout` no está en
`isPublicRoute` de `src/middleware.ts`, y una orden necesita `userId`.

## 10. Cambiar el botón del carrito

En `src/modules/cart/components/cart-drawer.tsx:154-162` hoy el botón
"Proceder al pago" está deshabilitado a propósito:

```tsx
{/* El checkout es otro spec: el botón queda deshabilitado en lugar
    de enlazar a una ruta que todavía no existe. */}
<Button size="lg" className={cn("h-11 w-full", BRAND_BUTTON_CLASS)} disabled>
  Proceder al pago
</Button>
```

Reemplazar por un enlace a `/checkout` (o disparar la mutación directo desde
el drawer, a decidir en el spec) y quitar el comentario, que deja de aplicar.

## 11. Desarrollo local con Stripe CLI

Stripe CLI ya está instalado (`stripe --version`). Pasos:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Ready! Your webhook signing secret is 'whsec_...' (^C to quit)
```

Copiar ese `whsec_...` a `STRIPE_WEBHOOK_SIGNING_SECRET` en `.env.local`.

> Si la cuenta autenticada solo tiene modo **live** disponible (sin sandbox
> emparejado), `stripe listen` sin `--live` falla pidiendo crear uno:
> `stripe sandbox create` provisiona un entorno de pruebas aislado (gratis,
> expira si no se reclama vía `claim_url` o `stripe sandbox claim`). Nunca
> usar `--live` para desarrollo local.

Tarjetas de prueba:

| Escenario | Número |
|---|---|
| Pago exitoso | `4242 4242 4242 4242` |
| Requiere 3DS | `4000 0025 0000 3155` |
| Rechazada | `4000 0000 0000 9995` |

Fecha de expiración futura cualquiera, CVV de 3 dígitos cualquiera.

Para disparar un evento manualmente sin pasar por el checkout completo:
`stripe trigger checkout.session.completed`.

## 12. Dashboard / producción

- Crear el [endpoint de webhook](https://docs.stripe.com/webhooks.md#register-webhook)
  real en el Dashboard (modo live y test se configuran por separado),
  apuntando a `https://<dominio>/api/webhooks/stripe`, seleccionando solo
  `checkout.session.completed` y `checkout.session.async_payment_succeeded`.
- Cargar `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SIGNING_SECRET` de producción
  en el proveedor de hosting — nunca reutilizar los de test/sandbox.
- Revisar el [Go Live Checklist](https://docs.stripe.com/get-started/checklist/go-live.md)
  de Stripe antes de aceptar pagos reales.

## 13. Checklist ejecutable (orden sugerido)

1. `npm i stripe`
2. Añadir `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SIGNING_SECRET` a
   `.env.example` y `.env.local`
3. `stripe login` + `stripe listen --forward-to localhost:3000/api/webhooks/stripe`,
   copiar el `whsec_...`
4. Crear `src/lib/stripe.ts`
5. Crear `src/server/db/schema/order.ts` y `order-item.ts`, sumarlos al
   barrel `schema/index.ts`
6. `npm run db:generate` y `npm run db:migrate`
7. Crear `src/server/repositories/order.repository.ts`
   (`createPendingOrder`, `markOrderAsPaid`, `findOrderById`)
8. Crear `src/modules/orders/{schemas,types,services,hooks}` de checkout
9. Crear `src/app/api/checkout/session/route.ts`
10. Crear `src/app/api/webhooks/stripe/route.ts`
11. Crear `src/app/(storefront)/checkout/page.tsx` y su(s) componente(s)
12. Editar `cart-drawer.tsx` (habilitar el botón → `/checkout`)
13. Probar con `4242 4242 4242 4242` y confirmar que `orders.status` pasa a
    `paid` (verlo en el log de `stripe listen`)
14. Probar con la tarjeta de rechazo y confirmar que la orden queda
    `pending`, no `paid`
15. `npm run typecheck && npm run lint && npm run build`
16. (Producción) configurar el endpoint del Dashboard y las variables de
    entorno del hosting
