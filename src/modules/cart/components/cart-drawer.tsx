"use client";

import Link from "next/link";
import { MinusIcon, PlusIcon, ShoppingCartIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, formatPriceFromCents } from "@/lib/utils";
import { BRAND_BUTTON_CLASS } from "@/modules/storefront/constants";
import { ProductTile } from "@/modules/storefront/components/product-tile";

import {
  MAX_QUANTITY,
  selectCartCount,
  selectCartSubtotalCents,
  useCartStore,
  type CartItem,
} from "../store/cart.store";

function QuantityStepper({ item }: { item: CartItem }) {
  const setQuantity = useCartStore((state) => state.setQuantity);

  return (
    <div className="flex w-fit items-center gap-1 rounded-lg border p-0.5">
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Quitar una unidad de ${item.name}`}
        disabled={item.quantity <= 1}
        onClick={() => setQuantity(item.id, item.quantity - 1)}
      >
        <MinusIcon />
      </Button>
      <span
        className="min-w-6 text-center text-sm font-semibold tabular-nums"
        aria-label={`Cantidad: ${item.quantity}`}
      >
        {item.quantity}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Añadir una unidad de ${item.name}`}
        disabled={item.quantity >= MAX_QUANTITY}
        onClick={() => setQuantity(item.id, item.quantity + 1)}
      >
        <PlusIcon />
      </Button>
    </div>
  );
}

function CartLine({ item }: { item: CartItem }) {
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <li className="flex gap-3 py-4">
      <ProductTile
        name={item.name}
        imageUrl={item.imageUrl}
        className="size-16 shrink-0 rounded-lg"
        sizes="64px"
        fallbackClassName="text-xl"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-bold">{item.name}</p>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Eliminar ${item.name} del carrito`}
            onClick={() => removeItem(item.id)}
          >
            <Trash2Icon />
          </Button>
        </div>

        <p className="text-muted-foreground text-xs tabular-nums">
          {formatPriceFromCents(item.priceCents)} c/u
        </p>

        <div className="mt-1 flex items-center justify-between">
          <QuantityStepper item={item} />
          <span className="text-sm font-bold tabular-nums">
            {formatPriceFromCents(item.priceCents * item.quantity)}
          </span>
        </div>
      </div>
    </li>
  );
}

export function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const setOpen = useCartStore((state) => state.setOpen);
  const items = useCartStore((state) => state.items);
  const count = useCartStore(selectCartCount);
  const subtotalCents = useCartStore(selectCartSubtotalCents);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="p-5">
          <SheetTitle className="text-base font-bold">
            Tu carrito {count > 0 ? `(${count})` : ""}
          </SheetTitle>
          <SheetDescription>
            Los productos se guardan mientras navegas por la tienda.
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-4 py-20 text-center">
              <ShoppingCartIcon className="size-10" strokeWidth={1.5} />
              <p className="text-sm">
                Tu carrito está vacío.
                <br />
                Añade algo de la tienda.
              </p>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Seguir comprando
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <CartLine key={item.id} item={item} />
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 ? (
          <SheetFooter className="border-t p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-semibold">
                Subtotal
              </span>
              <span className="text-lg font-extrabold tabular-nums">
                {formatPriceFromCents(subtotalCents)}
              </span>
            </div>
            <Button
              size="lg"
              className={cn("h-11 w-full", BRAND_BUTTON_CLASS)}
              asChild
            >
              {/* Cierra el drawer al navegar: dejarlo abierto taparía la propia
                  página de checkout a la que acaba de llevar. */}
              <Link href="/checkout" onClick={() => setOpen(false)}>
                Proceder al pago
              </Link>
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
