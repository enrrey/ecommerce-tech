// Catálogo de permisos y matriz de roles de sistema. Es la fuente de verdad del
// seed: los permisos nacen del código, los roles no de sistema se componen desde
// la UI (SETUP 5.1, regla dura 4).

// El `code` se deriva de recurso y acción para que no puedan desincronizarse:
// `permissions` tiene único por `code` y único por `(resource, action)`.
function permission<R extends string, A extends string>(
  resource: R,
  action: A,
  description: string,
) {
  return {
    code: `${resource}.${action}` as const,
    resource,
    action,
    description,
  };
}

export const PERMISSION_SEED = [
  permission("products", "read", "Ver el catálogo de productos"),
  permission("products", "create", "Crear productos"),
  permission("products", "update", "Editar productos"),
  permission("products", "delete", "Eliminar productos"),
  permission("categories", "read", "Ver las categorías"),
  permission("categories", "create", "Crear categorías"),
  permission("categories", "update", "Editar categorías"),
  permission("categories", "delete", "Eliminar categorías"),
  permission("orders", "read", "Ver los pedidos"),
  permission("orders", "update_status", "Cambiar el estado de un pedido"),
  permission("orders", "cancel", "Cancelar un pedido"),
  permission("users", "read", "Ver los usuarios"),
  permission("users", "create", "Crear usuarios"),
  permission("users", "update", "Editar usuarios"),
  permission("users", "deactivate", "Desactivar usuarios"),
  permission("users", "assign_role", "Asignar roles a un usuario"),
  permission("roles", "read", "Ver roles y su matriz de permisos"),
  permission("roles", "manage", "Crear, editar y borrar roles y sus permisos"),
  permission("audit_logs", "read", "Consultar la bitácora de auditoría"),
  permission("metrics", "read", "Ver las métricas del dashboard"),
];

export type PermissionCode = (typeof PERMISSION_SEED)[number]["code"];

const ALL_PERMISSION_CODES: readonly PermissionCode[] = PERMISSION_SEED.map(
  (item) => item.code,
);

export type RoleSeed = {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly PermissionCode[];
};

// Slug del rol que recibe el bootstrap. Solo lo usa el seed para sembrar datos:
// la autorización en runtime se resuelve por `permission.code`, nunca por slug.
export const SUPER_ADMIN_ROLE_SLUG = "super_admin";

export const ROLE_SEED: readonly RoleSeed[] = [
  {
    slug: SUPER_ADMIN_ROLE_SLUG,
    name: "Super administrador",
    description: "Control total, incluida la gestión de roles y permisos.",
    // Derivado, no listado: un permiso nuevo entra aquí sin tocar la matriz.
    permissions: ALL_PERMISSION_CODES,
  },
  {
    slug: "admin",
    name: "Administrador",
    description: "Opera todo el negocio; no altera la matriz de roles.",
    permissions: ALL_PERMISSION_CODES.filter((code) => code !== "roles.manage"),
  },
  {
    slug: "manager",
    name: "Gerente",
    description: "Catálogo completo, seguimiento de pedidos y métricas.",
    permissions: [
      "products.read",
      "products.create",
      "products.update",
      "products.delete",
      "categories.read",
      "categories.create",
      "categories.update",
      "categories.delete",
      "orders.read",
      "orders.update_status",
      "metrics.read",
    ],
  },
  {
    slug: "employee",
    name: "Empleado",
    description: "Consulta el catálogo y mueve el estado de los pedidos.",
    permissions: [
      "products.read",
      "categories.read",
      "orders.read",
      "orders.update_status",
    ],
  },
  {
    slug: "customer",
    name: "Cliente",
    description:
      "Sin permisos de administración: accede a lo propio por ownership.",
    permissions: [],
  },
  {
    slug: "audit",
    name: "Auditoría",
    description: "Solo lectura sobre todo el sistema; cero mutación.",
    permissions: [
      "products.read",
      "categories.read",
      "orders.read",
      "users.read",
      "roles.read",
      "audit_logs.read",
      "metrics.read",
    ],
  },
];

// Catálogo de demostración. Idempotente por `slug` (categorías) y por `sku`
// (productos): reejecutar el seed no duplica ni pisa lo editado desde el panel.

type CategorySeed = {
  slug: string;
  name: string;
  description: string;
};

export const CATEGORY_SEED: readonly CategorySeed[] = [
  { slug: "laptops", name: "Laptops", description: "Portátiles de trabajo, estudio y juego." },
  { slug: "celulares", name: "Celulares", description: "Smartphones y sus accesorios." },
  { slug: "monitores", name: "Monitores", description: "Pantallas para productividad y gaming." },
  { slug: "audio", name: "Audio", description: "Audífonos, parlantes y micrófonos." },
  { slug: "accesorios", name: "Accesorios", description: "Teclados, ratones y periféricos." },
];

type ProductSeed = {
  categorySlug: string;
  sku: string;
  name: string;
  slug: string;
  brand: string;
  description: string;
  // Centavos enteros, nunca float. `null` en `compareAtPriceCents` = sin oferta.
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  // Foto de stock genérica (Picsum, semilla = slug): no es la foto real del
  // producto, solo evita el fallback de iniciales hasta que el admin suba una.
  imageUrl: string;
};

export const PRODUCT_SEED: readonly ProductSeed[] = [
  {
    categorySlug: "laptops",
    sku: "DELL-XPS13P",
    name: "Dell XPS 13 Plus",
    slug: "dell-xps-13-plus",
    brand: "Dell",
    description: "Ultrabook de 13 pulgadas con pantalla OLED y chasis de aluminio.",
    priceCents: 189_999,
    compareAtPriceCents: 219_999,
    stock: 8,
    imageUrl: "https://picsum.photos/seed/dell-xps-13-plus/800/600",
  },
  {
    categorySlug: "laptops",
    sku: "LEN-TPE14",
    name: "Lenovo ThinkPad E14",
    slug: "lenovo-thinkpad-e14",
    brand: "Lenovo",
    description: "Portátil de trabajo con teclado de referencia y 16 GB de RAM.",
    priceCents: 89_999,
    compareAtPriceCents: null,
    stock: 12,
    imageUrl: "https://picsum.photos/seed/lenovo-thinkpad-e14/800/600",
  },
  {
    categorySlug: "celulares",
    sku: "SAM-GALS24",
    name: "Samsung Galaxy S24",
    slug: "samsung-galaxy-s24",
    brand: "Samsung",
    description: "Pantalla AMOLED de 6,2 pulgadas y cámara principal de 50 MP.",
    priceCents: 79_999,
    compareAtPriceCents: 89_999,
    stock: 10,
    imageUrl: "https://picsum.photos/seed/samsung-galaxy-s24/800/600",
  },
  {
    categorySlug: "monitores",
    sku: "LG-27GP850",
    name: "LG UltraGear 27GP850",
    slug: "lg-ultragear-27gp850",
    brand: "LG",
    description: "Monitor QHD de 27 pulgadas a 165 Hz con panel Nano IPS.",
    priceCents: 39_999,
    compareAtPriceCents: 44_999,
    stock: 6,
    imageUrl: "https://picsum.photos/seed/lg-ultragear-27gp850/800/600",
  },
  {
    categorySlug: "audio",
    sku: "SONY-WH1000XM5",
    name: "Sony WH-1000XM5",
    slug: "sony-wh-1000xm5",
    brand: "Sony",
    description: "Audífonos over-ear con cancelación de ruido y 30 h de batería.",
    priceCents: 34_999,
    compareAtPriceCents: null,
    stock: 15,
    imageUrl: "https://picsum.photos/seed/sony-wh-1000xm5/800/600",
  },
  {
    categorySlug: "accesorios",
    sku: "KEY-K2PRO",
    name: "Keychron K2 Pro",
    slug: "keychron-k2-pro",
    brand: "Keychron",
    description: "Teclado mecánico inalámbrico de 75 % con switches hot-swap.",
    priceCents: 9_999,
    compareAtPriceCents: 12_999,
    stock: 25,
    imageUrl: "https://picsum.photos/seed/keychron-k2-pro/800/600",
  },
  {
    categorySlug: "accesorios",
    sku: "LOG-MXM3S",
    name: "Logitech MX Master 3S",
    slug: "logitech-mx-master-3s",
    brand: "Logitech",
    description: "Ratón de precisión con scroll electromagnético y clics silenciosos.",
    priceCents: 9_499,
    compareAtPriceCents: null,
    // Sin stock a propósito: la tarjeta y el filtro de disponibilidad necesitan
    // al menos un producto agotado para poder verse de verdad.
    stock: 0,
    imageUrl: "https://picsum.photos/seed/logitech-mx-master-3s/800/600",
  },
];
