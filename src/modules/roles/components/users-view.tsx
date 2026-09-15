"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useUsers } from "../hooks/use-users";
import { UsersTable } from "./users-table";

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-9 w-full max-w-xs" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function UsersView() {
  const usersQuery = useUsers();

  if (usersQuery.isPending) {
    return <TableSkeleton />;
  }

  if (usersQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <p className="font-medium">No pudimos cargar los usuarios</p>
        <p className="text-muted-foreground text-sm">
          {usersQuery.error.message}
        </p>
        <Button variant="outline" onClick={() => usersQuery.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (usersQuery.data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <p className="font-medium">Todavía no hay usuarios</p>
        <p className="text-muted-foreground text-sm">
          Aparecerán aquí en cuanto se registren en la aplicación.
        </p>
      </div>
    );
  }

  return <UsersTable users={usersQuery.data} />;
}
