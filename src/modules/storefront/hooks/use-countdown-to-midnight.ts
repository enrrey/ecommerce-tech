"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 1000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function remainingLabel(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  const totalSeconds = Math.max(
    0,
    Math.floor((midnight.getTime() - now.getTime()) / 1000),
  );

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function subscribe(onTick: () => void): () => void {
  const interval = setInterval(onTick, TICK_MS);

  return () => clearInterval(interval);
}

/**
 * Cuenta atrás hasta la medianoche local. Devuelve `null` en el render del
 * servidor: la hora del navegador no existe allí y pintarla en el HTML inicial
 * rompería la hidratación.
 *
 * El reloj es una fuente externa, así que se lee con `useSyncExternalStore` en
 * vez de con un `setState` dentro de un efecto. La cuenta es decorativa: no
 * controla ningún precio ni caduca ninguna oferta.
 */
export function useCountdownToMidnight(): string | null {
  return useSyncExternalStore(subscribe, remainingLabel, () => null);
}
