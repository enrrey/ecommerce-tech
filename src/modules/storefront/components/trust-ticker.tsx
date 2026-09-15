"use client";

import { motion, useReducedMotion } from "motion/react";

const MESSAGES = [
  "Tecnología real, sin relleno",
  "Garantía en toda la tienda",
  "Soporte técnico experto",
  "Envíos a todo el país",
  "Devoluciones sin complicaciones",
] as const;

const LOOP_SECONDS = 26;

function TickerRun({ ariaHidden }: { ariaHidden: boolean }) {
  return (
    <span
      className="flex shrink-0 items-center gap-6 pr-6"
      aria-hidden={ariaHidden || undefined}
    >
      {MESSAGES.map((message) => (
        <span key={message} className="flex items-center gap-6">
          {message}
          <span className="opacity-40">·</span>
        </span>
      ))}
    </span>
  );
}

export function TrustTicker() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="bg-foreground text-background overflow-hidden py-2 text-xs font-bold tracking-wide">
      {shouldReduceMotion ? (
        // Sin animación el segundo pase sobra: se muestra una sola tirada
        // recortada por el overflow del contenedor.
        <div className="flex w-max px-4">
          <TickerRun ariaHidden={false} />
        </div>
      ) : (
        <motion.div
          className="flex w-max"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: LOOP_SECONDS,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          {/* Dos pases idénticos: al desplazar el 50% exacto la costura entre
              el final del primero y el inicio del segundo es invisible. */}
          <TickerRun ariaHidden={false} />
          <TickerRun ariaHidden />
        </motion.div>
      )}
    </div>
  );
}
