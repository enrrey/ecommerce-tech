import { spaceGrotesk } from "@/lib/fonts";
import { CartDrawer } from "@/modules/cart/components/cart-drawer";
import { StorefrontFooter } from "@/modules/storefront/components/storefront-footer";
import { StorefrontHeader } from "@/modules/storefront/components/storefront-header";
import { TrustTicker } from "@/modules/storefront/components/trust-ticker";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <div className={`${spaceGrotesk.variable} flex flex-1 flex-col`}>
      <TrustTicker />
      <StorefrontHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <StorefrontFooter />
      {/* Montado en el layout: el carrito debe sobrevivir a la navegación entre
          páginas del storefront, no desmontarse con la home. */}
      <CartDrawer />
    </div>
  );
}
