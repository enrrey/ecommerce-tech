import { ShieldAlert } from "lucide-react";

import { can } from "@/lib/permissions";
import { UsersView } from "@/modules/roles/components/users-view";

// Server Component: el guard decide si `UsersView` llega a montarse, así el
// listado no se pide sin permiso. La autorización real la impone el handler.
export default async function AdminRolesPage() {
  const canReadUsers = await can("users.read");

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Roles</h1>
        <p className="text-muted-foreground">
          Consulta los usuarios de la aplicación y los roles que tienen asignados.
        </p>
      </header>

      {canReadUsers ? (
        <UsersView />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <ShieldAlert className="text-muted-foreground size-6" />
          <p className="font-medium">Acceso denegado</p>
          <p className="text-muted-foreground text-sm">
            Necesitas el permiso de lectura de usuarios para ver esta sección.
          </p>
        </div>
      )}
    </section>
  );
}
