import type { Metadata } from "next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchaseHistory } from "@/modules/orders/components/purchase-history";
import { SavedCards } from "@/modules/orders/components/saved-cards";

export const metadata: Metadata = {
  title: "Mi perfil — VOLT",
  description: "Historial de compras, boletas y tarjetas guardadas.",
};

const CARDS_TAB = "cards";
const ORDERS_TAB = "orders";

/** Un parámetro repetido (`?tab=a&tab=b`) llega como array: se ignora. */
function firstValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Server Component sin lectura propia: ambos tabs dependen de datos que el
 * usuario filtra o muta desde el cliente, así que resolver la primera página en
 * servidor solo duplicaría la consulta que TanStack Query hace igualmente al
 * montar.
 *
 * `/profile` no está en `isPublicRoute`, así que `middleware.ts` ya exige sesión
 * y redirige a login sin necesidad de un guard aquí.
 *
 * `?tab=` y `?setup=` se leen aquí y bajan por props: `useSearchParams` obligaría
 * a una frontera de Suspense y a subir el `"use client"` un nivel de más.
 */
export default async function ProfilePage(props: PageProps<"/profile">) {
  const searchParams = await props.searchParams;

  const tab =
    firstValue(searchParams.tab) === CARDS_TAB ? CARDS_TAB : ORDERS_TAB;

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 py-12">
      <header className="mb-8 flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold">Mi perfil</h1>
        <p className="text-muted-foreground">
          Revisa tus compras, consulta el detalle de cada pedido y administra
          tus tarjetas guardadas.
        </p>
      </header>

      {/* `defaultValue` y no `value`: el tab activo lo lleva el propio componente
          una vez montado; la URL solo decide con cuál se abre. */}
      <Tabs defaultValue={tab} className="gap-6">
        <TabsList>
          <TabsTrigger value={ORDERS_TAB}>Mis compras</TabsTrigger>
          <TabsTrigger value={CARDS_TAB}>Mis tarjetas</TabsTrigger>
        </TabsList>

        <TabsContent value={ORDERS_TAB}>
          <PurchaseHistory />
        </TabsContent>

        <TabsContent value={CARDS_TAB}>
          <SavedCards setupStatus={firstValue(searchParams.setup)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
