"use client";

import { ClockIcon } from "lucide-react";

import { DEALS_COUNT } from "../constants";
import { useCountdownToMidnight } from "../hooks/use-countdown-to-midnight";
import { ProductGrid } from "./product-grid";

const DEALS_QUERY = { sort: "deals", pageSize: DEALS_COUNT } as const;

const PLACEHOLDER_LABEL = "--:--:--";

/**
 * El orden `deals` pone delante los productos con precio anterior real (spec
 * 008) y completa la grilla con los más baratos. Es orden y no filtro a
 * propósito: `#ofertas` es ancla de navegación del header y del footer, así que
 * la sección no puede quedar vacía cuando no hay descuentos vigentes.
 */
export function DealsSection() {
  const countdown = useCountdownToMidnight();

  return (
    <section id="ofertas" className="mx-auto w-full max-w-[1200px] px-5 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-brand text-xs font-bold tracking-[0.08em] uppercase">
            Por tiempo limitado
          </p>
          <h2 className="font-display mt-1.5 text-2xl font-bold md:text-3xl">
            Ofertas del día
          </h2>
        </div>

        <p className="bg-deal-soft text-deal inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold">
          <ClockIcon className="size-4" />
          Termina en{" "}
          <span className="tabular-nums">{countdown ?? PLACEHOLDER_LABEL}</span>
        </p>
      </div>

      <ProductGrid
        query={DEALS_QUERY}
        emptyMessage="No hay ofertas disponibles ahora mismo."
      />
    </section>
  );
}
