"use client";

import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { SearchIcon, ShoppingCartIcon, ZapIcon } from "lucide-react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { selectCartCount, useCartStore } from "@/modules/cart/store/cart.store";

import { useScrollToCatalog } from "../hooks/use-scroll-to-catalog";
import {
  buildCatalogHref,
  CATALOG_PATH,
  parseCatalogSearchParams,
} from "../lib/catalog-url";
import { useCatalogFiltersStore } from "../store/catalog-filters.store";

type NavLink = { label: string; href: string; highlight?: boolean };

// Anclas absolutas (`/#…`): el header vive en el layout y desde `/products` un
// `#categorias` a secas no llevaría a ninguna parte.
const NAV_LINKS: readonly NavLink[] = [
  { label: "Categorías", href: "/#categorias" },
  { label: "Ofertas", href: "/#ofertas", highlight: true },
  { label: "Catálogo", href: CATALOG_PATH },
];

const HOME_PATH = "/";

const PROFILE_PATH = "/profile";

function BrandLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("font-display flex items-center gap-2 text-xl", className)}
    >
      <span className="bg-brand text-brand-foreground flex size-8 items-center justify-center rounded-lg">
        <ZapIcon className="size-4 fill-current" />
      </span>
      VOLT
    </Link>
  );
}

function SearchField() {
  const term = useCatalogFiltersStore((state) => state.term);
  const setTerm = useCatalogFiltersStore((state) => state.setTerm);
  const scrollToCatalog = useScrollToCatalog();
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === HOME_PATH;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;

    setTerm(next);

    // Solo en la home y solo al arrancar la búsqueda: hacerlo en cada pulsación
    // pelearía con el scroll manual del usuario mientras sigue escribiendo.
    if (isHome && term.length === 0 && next.length > 0) {
      scrollToCatalog();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // En la home el preview ya reacciona al store: solo hay que traerlo a la
    // vista. Fuera de ella la búsqueda es una navegación al catálogo.
    if (isHome) {
      scrollToCatalog();
      return;
    }

    // La URL actual se lee de `window.location` dentro del handler y no con
    // `useSearchParams`: el header vive en el layout y el hook obligaría a una
    // frontera de Suspense en todas las páginas del storefront, incluida la
    // home prerenderizada. Estando en el catálogo se conservan los demás
    // filtros; desde otra página se parte de cero.
    const current =
      pathname === CATALOG_PATH
        ? parseCatalogSearchParams(
            Object.fromEntries(new URLSearchParams(window.location.search)),
          )
        : {};

    router.push(buildCatalogHref(current, { q: term || undefined }));
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="relative w-full">
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="search"
        value={term}
        onChange={handleChange}
        aria-label="Buscar productos"
        placeholder="Buscar laptops, celulares, accesorios…"
        className="bg-muted focus-visible:border-brand h-11 pl-9"
      />
    </form>
  );
}

function CartButton() {
  const count = useCartStore(selectCartCount);
  const setOpen = useCartStore((state) => state.setOpen);

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      aria-label={`Abrir carrito${count > 0 ? ` (${count} artículos)` : ""}`}
      onClick={() => setOpen(true)}
    >
      <ShoppingCartIcon className="size-[1.15rem]" />
      {count > 0 ? (
        <span className="bg-deal text-deal-foreground absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[0.65rem] font-extrabold tabular-nums">
          {count}
        </span>
      ) : null}
    </Button>
  );
}

export function StorefrontHeader() {
  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-5 py-3 lg:h-19 lg:flex-row lg:items-center lg:gap-7 lg:py-0">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo />

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <CartButton />
          </div>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "hover:bg-muted hover:text-foreground rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                link.highlight ? "text-deal" : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="lg:ml-auto lg:max-w-105 lg:flex-1">
          <SearchField />
        </div>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <ThemeToggle />
          <CartButton />
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <Button variant="ghost" size="lg">
                Entrar
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Button variant="ghost" size="lg" asChild>
              <Link href={PROFILE_PATH}>Mi perfil</Link>
            </Button>
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
