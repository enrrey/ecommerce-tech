"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { Autoplay, EffectFade } from "swiper/modules";
import { Swiper, SwiperSlide, type SwiperClass } from "swiper/react";
import { toast } from "sonner";

import "swiper/css";
import "swiper/css/effect-fade";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatPriceFromCents } from "@/lib/utils";
import { useCartStore } from "@/modules/cart/store/cart.store";

import { BRAND_BUTTON_CLASS, HERO_SLIDE_COUNT } from "../constants";
import { usePublicProducts } from "../hooks/use-public-products";
import { CATALOG_PATH } from "../lib/catalog-url";
import type { PublicProduct } from "../types/public-catalog.types";
import { ProductTile } from "./product-tile";

const AUTOPLAY_MS = 6000;

/** Sin campo de "destacado" en la base, el gancho es puramente editorial. */
const EYEBROWS = ["Lo más nuevo", "Recién llegado", "Novedad"] as const;

const HERO_QUERY = { sort: "newest", pageSize: HERO_SLIDE_COUNT } as const;

function HeroSlide({
  product,
  eyebrow,
  isFirst,
}: {
  product: PublicProduct;
  eyebrow: string;
  isFirst: boolean;
}) {
  const addItem = useCartStore((state) => state.addItem);

  function handleAdd() {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
    });

    toast.success("Añadido al carrito", { description: product.name });
  }

  return (
    <div className="mx-auto grid h-full w-full max-w-[1200px] items-center gap-8 px-6 py-10 md:grid-cols-[1.15fr_0.85fr] md:px-16 md:py-0">
      <div className="order-2 md:order-1">
        <p className="text-brand text-xs font-bold tracking-[0.08em] uppercase">
          {eyebrow}
        </p>

        <h1 className="font-display mt-3 text-3xl leading-tight font-bold md:text-[2.6rem]">
          {product.name}
        </h1>

        {product.description ? (
          <p className="mt-3 max-w-115 text-sm leading-relaxed opacity-80 md:text-base">
            {product.description}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold">
            {product.categoryName}
          </span>
          <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold">
            {product.inStock ? "Disponible" : "Sin stock"}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            size="lg"
            className={cn("h-11", BRAND_BUTTON_CLASS)}
            disabled={!product.inStock}
            onClick={handleAdd}
          >
            <ShoppingCartIcon />
            Añadir al carrito
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 border-white/30 bg-transparent text-current hover:bg-white/10 hover:text-current dark:bg-transparent dark:hover:bg-white/10"
          >
            <Link href={CATALOG_PATH}>Ver catálogo</Link>
          </Button>
        </div>
      </div>

      <div className="relative order-1 flex items-center justify-center md:order-2">
        <ProductTile
          name={product.name}
          imageUrl={product.imageUrl}
          className="size-45 rounded-3xl shadow-2xl md:size-65"
          sizes="(min-width: 768px) 260px, 180px"
          fallbackClassName="text-6xl md:text-8xl"
          priority={isFirst}
        />
        <div className="bg-background absolute -bottom-4 left-0 rounded-2xl px-4 py-3 shadow-xl md:left-6">
          <p className="text-muted-foreground text-[0.65rem] font-bold tracking-wider uppercase">
            Desde
          </p>
          <p className="text-brand text-xl font-extrabold tabular-nums">
            {formatPriceFromCents(product.priceCents)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function HeroCarousel() {
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const productsQuery = usePublicProducts(HERO_QUERY);

  const slides = productsQuery.data?.items ?? [];

  return (
    <section className="bg-hero text-hero-foreground relative min-h-130 overflow-hidden">
      {productsQuery.isPending ? (
        <div
          aria-busy="true"
          className="mx-auto flex min-h-130 w-full max-w-[1200px] items-center gap-8 px-6 md:px-16"
        >
          <div className="flex flex-1 flex-col gap-4">
            <Skeleton className="h-4 w-28 bg-white/10" />
            <Skeleton className="h-10 w-3/4 bg-white/10" />
            <Skeleton className="h-4 w-full bg-white/10" />
            <Skeleton className="h-11 w-48 bg-white/10" />
          </div>
          <Skeleton className="hidden size-65 rounded-3xl bg-white/10 md:block" />
        </div>
      ) : productsQuery.isError ? (
        <div
          role="alert"
          className="flex min-h-130 flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <p className="font-medium">No pudimos cargar las novedades</p>
          <p className="text-sm opacity-70">{productsQuery.error.message}</p>
          <Button
            variant="outline"
            className="border-white/30 bg-transparent text-current hover:bg-white/10 hover:text-current dark:bg-transparent"
            onClick={() => productsQuery.refetch()}
          >
            Reintentar
          </Button>
        </div>
      ) : slides.length === 0 ? (
        <div className="flex min-h-130 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-display text-2xl font-bold">
            Catálogo en preparación
          </p>
          <p className="text-sm opacity-70">
            Muy pronto encontrarás aquí las novedades de la tienda.
          </p>
        </div>
      ) : (
        <>
          <Swiper
            modules={[Autoplay, EffectFade]}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            loop={slides.length > 1}
            autoplay={{ delay: AUTOPLAY_MS, disableOnInteraction: false }}
            speed={600}
            onSwiper={setSwiper}
            onSlideChange={(instance) => setActiveIndex(instance.realIndex)}
            className="min-h-130 w-full"
          >
            {slides.map((product, index) => (
              <SwiperSlide key={product.id} className="min-h-130">
                <HeroSlide
                  product={product}
                  eyebrow={EYEBROWS[index % EYEBROWS.length]}
                  isFirst={index === 0}
                />
              </SwiperSlide>
            ))}
          </Swiper>

          {slides.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Diapositiva anterior"
                onClick={() => swiper?.slidePrev()}
                className="absolute top-1/2 left-4 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:bg-white/25"
              >
                <ChevronLeftIcon className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Diapositiva siguiente"
                onClick={() => swiper?.slideNext()}
                className="absolute top-1/2 right-4 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:bg-white/25"
              >
                <ChevronRightIcon className="size-5" />
              </button>

              <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center gap-2">
                {slides.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    aria-label={`Ir a la diapositiva ${index + 1}`}
                    aria-current={index === activeIndex}
                    onClick={() => swiper?.slideToLoop(index)}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      index === activeIndex
                        ? "w-5.5 bg-white"
                        : "w-2 bg-white/35 hover:bg-white/60",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
