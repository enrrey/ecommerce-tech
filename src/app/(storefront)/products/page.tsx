import { Suspense } from "react";
import type { Metadata } from "next";

import { Skeleton } from "@/components/ui/skeleton";
import { CatalogView } from "@/modules/storefront/components/catalog-view";
import { parseCatalogSearchParams } from "@/modules/storefront/lib/catalog-url";
import { listPublicProducts } from "@/server/repositories/product.repository";

export const metadata: Metadata = {
  title: "Catálogo — VOLT",
  description:
    "Todo el catálogo de VOLT: laptops, celulares, componentes y accesorios, filtrables por categoría, marca, precio y disponibilidad.",
};

function CatalogFallback() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-10" aria-busy="true">
      <Skeleton className="h-9 w-48" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <Skeleton className="hidden h-96 w-full lg:block" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

/**
 * Lectura inicial en servidor: el HTML ya sale con la primera página de la
 * grilla, sin spinner, y `CatalogView` la recibe como `initialData` en lugar de
 * repetir la petición al hidratar.
 *
 * `searchParams` es una Promise en Next 16 y se lee con la misma función
 * tolerante que usa el cliente, así que servidor y navegador interpretan la URL
 * igual. `CatalogView` usa `useSearchParams`, que exige frontera de `Suspense`.
 */
export default async function ProductsPage(props: PageProps<"/products">) {
  const query = parseCatalogSearchParams(await props.searchParams);
  const initialPage = await listPublicProducts(query);

  return (
    <Suspense fallback={<CatalogFallback />}>
      <CatalogView initialPage={initialPage} />
    </Suspense>
  );
}
