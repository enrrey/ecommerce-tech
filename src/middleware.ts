import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/products(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/products(.*)",
  "/api/categories(.*)",
  // Catálogo del storefront: solo lectura y solo registros activos.
  "/api/public(.*)",
  "/api/webhooks(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

// Capa de borde: solo exige sesión. La autorización por código de permiso vive
// en cada Route Handler (requirePermission), nunca aquí.
export default clerkMiddleware(async (auth, request) => {
  if (isAdminRoute(request) || !isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)", "/api/(.*)"],
};
