import { AdminOrdersView } from "@/modules/orders/components/admin-orders-view";

// Server Component: solo compone. La frontera de cliente entra en AdminOrdersView.
export default function AdminOrdersPage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Órdenes</h1>
        <p className="text-muted-foreground">
          Consulta todas las compras del sistema: cliente, estado, fecha y
          detalle de cada línea.
        </p>
      </header>

      <AdminOrdersView />
    </section>
  );
}
