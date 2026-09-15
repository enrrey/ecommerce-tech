import type { Metadata } from "next";

import { BenefitsStrip } from "@/modules/storefront/components/benefits-strip";
import { BrandsStrip } from "@/modules/storefront/components/brands-strip";
import { CategoryStrip } from "@/modules/storefront/components/category-strip";
import { DealsSection } from "@/modules/storefront/components/deals-section";
import { FeaturedSection } from "@/modules/storefront/components/featured-section";
import { HeroCarousel } from "@/modules/storefront/components/hero-carousel";
import { NewsletterSection } from "@/modules/storefront/components/newsletter-section";
import { Reveal } from "@/modules/storefront/components/reveal";

export const metadata: Metadata = {
  title: "VOLT — Tecnología curada para el uso real",
  description:
    "Laptops, celulares, componentes y accesorios con garantía, envío y soporte técnico.",
};

/**
 * Server Component: solo compone. Cada sección decide por su cuenta si necesita
 * cliente, así que la página en sí no envía JavaScript.
 */
export default function HomePage() {
  return (
    <>
      <HeroCarousel />

      <Reveal>
        <section
          id="categorias"
          className="mx-auto w-full max-w-[1200px] scroll-mt-24 px-5 pt-12 pb-6"
        >
          <h2 className="font-display mb-6 text-2xl font-bold md:text-3xl">
            Explora por categoría
          </h2>
          <CategoryStrip />
        </section>
      </Reveal>

      <Reveal>
        <BrandsStrip />
      </Reveal>

      <Reveal>
        <DealsSection />
      </Reveal>

      <Reveal>
        <FeaturedSection />
      </Reveal>

      <Reveal>
        <BenefitsStrip />
      </Reveal>

      <Reveal>
        <NewsletterSection />
      </Reveal>
    </>
  );
}
