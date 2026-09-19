import { can } from "@/lib/permissions";
import { AdminOrdersView } from "@/modules/orders/components/admin-orders-view";

// Server Component: solo compone y resuelve qué acciones puede ofrecer la vista.
// La autorización real la impone el Route Handler con `requirePermission`.
export default async function AdminOrdersPage() {
  const [canUpdateStatus, canCancel] = await Promise.all([
    can("orders.update_status"),
    can("orders.cancel"),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Órdenes</h1>
        <p className="text-muted-foreground">
          Consulta todas las compras del sistema: cliente, estado, fecha y
          detalle de cada línea.
        </p>
      </header>

      <AdminOrdersView
        canUpdateStatus={canUpdateStatus}
        canCancel={canCancel}
      />
    </section>
  );
}
