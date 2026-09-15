import { ProductsView } from "@/modules/products/components/products-view";

// Server Component: solo compone. La frontera de cliente entra en ProductsView.
export default function AdminProductsPage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <p className="text-muted-foreground">
          Gestiona el catálogo: SKU, precio, stock y disponibilidad.
        </p>
      </header>

      <ProductsView />
    </section>
  );
}
