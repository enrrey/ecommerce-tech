"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShieldCheck,
  ShoppingBag,
  Tags,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Productos", icon: Package, exact: false },
  { href: "/admin/categories", label: "Categorías", icon: Tags, exact: false },
  { href: "/admin/orders", label: "Órdenes", icon: ShoppingBag, exact: false },
  { href: "/admin/roles", label: "Roles", icon: ShieldCheck, exact: false },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación de administración" className="flex flex-wrap items-center gap-1">
      {ADMIN_NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
              isActive
                ? "bg-brand-soft text-brand font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
