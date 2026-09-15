"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ALL_FILTER, roleLabel, type UserStatusFilter } from "../constants";
import type { UserWithRoles } from "../types/user-role.types";

/** Nombre visible; un usuario recién sincronizado puede no tener nombre en Clerk. */
export function userDisplayName(user: UserWithRoles): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
}

function initialsOf(user: UserWithRoles): string {
  const source = userDisplayName(user) || user.email;

  return source.slice(0, 2).toUpperCase();
}

export const statusFilterFn: FilterFn<UserWithRoles> = (
  row,
  columnId,
  value,
) => {
  const filter = value as Exclude<UserStatusFilter, typeof ALL_FILTER>;

  return row.getValue<boolean>(columnId) === (filter === "active");
};

// El slug es aquí un dato de la fila para acotar el listado, nunca una decisión
// de autorización (esa la impone `requirePermission` en el handler).
export const roleFilterFn: FilterFn<UserWithRoles> = (row, _columnId, value) =>
  row.original.roleSlugs.includes(value as string);

// Un solo input: quien busca teclea el nombre o el email indistintamente.
export const nameOrEmailFilterFn: FilterFn<UserWithRoles> = (
  row,
  _columnId,
  value,
) => {
  const term = String(value).trim().toLowerCase();

  if (!term) {
    return true;
  }

  return (
    userDisplayName(row.original).toLowerCase().includes(term) ||
    row.original.email.toLowerCase().includes(term)
  );
};

export function getUserColumns(): ColumnDef<UserWithRoles>[] {
  return [
    {
      id: "user",
      accessorFn: (user) => userDisplayName(user) || user.email,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Usuario
          <ArrowUpDown className="size-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original;
        const name = userDisplayName(user);

        return (
          <div className="flex items-center gap-3">
            <Avatar>
              {user.imageUrl ? (
                <AvatarImage src={user.imageUrl} alt="" />
              ) : null}
              <AvatarFallback>{initialsOf(user)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{name || "Sin nombre"}</span>
              <span className="text-muted-foreground text-xs">
                {user.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "outline"}>
          {row.original.isActive ? "Activo" : "Inactivo"}
        </Badge>
      ),
      filterFn: statusFilterFn,
    },
    {
      accessorKey: "roleSlugs",
      header: "Roles",
      enableSorting: false,
      cell: ({ row }) => {
        const slugs = row.original.roleSlugs;

        if (slugs.length === 0) {
          return <span className="text-muted-foreground text-sm">Sin roles</span>;
        }

        return (
          <div className="flex flex-wrap gap-1.5">
            {slugs.map((slug) => (
              <Badge key={slug} variant="secondary">
                {roleLabel(slug)}
              </Badge>
            ))}
          </div>
        );
      },
      filterFn: roleFilterFn,
    },
  ];
}
