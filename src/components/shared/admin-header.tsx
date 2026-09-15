"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { StoreIcon, ZapIcon } from "lucide-react";

import { AdminNav } from "@/components/shared/admin-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function AdminBrand() {
  return (
    <Link href="/admin" className="font-display flex items-center gap-2 text-xl">
      <span className="bg-brand text-brand-foreground flex size-8 items-center justify-center rounded-lg">
        <ZapIcon className="size-4 fill-current" />
      </span>
      VOLT
      <Badge className="bg-brand-soft text-brand">Admin</Badge>
    </Link>
  );
}

// El rótulo se oculta en móvil para que la fila de marca no compita con el
// toggle de tema y el avatar; el icono conserva el nombre accesible.
function ViewStoreLink() {
  return (
    <Button variant="ghost" size="lg" asChild>
      <Link href="/" aria-label="Ver tienda">
        <StoreIcon />
        <span className="hidden lg:inline">Ver tienda</span>
      </Link>
    </Button>
  );
}

export function AdminHeader() {
  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-5 py-3 lg:h-19 lg:flex-row lg:items-center lg:gap-7 lg:py-0">
        <div className="flex items-center justify-between gap-3">
          <AdminBrand />

          <div className="flex items-center gap-2 lg:hidden">
            <ViewStoreLink />
            <ThemeToggle />
            <UserButton />
          </div>
        </div>

        <AdminNav />

        <div className="hidden shrink-0 items-center gap-2 lg:ml-auto lg:flex">
          <ViewStoreLink />
          <ThemeToggle />
          <UserButton />
        </div>
      </div>
    </header>
  );
}
