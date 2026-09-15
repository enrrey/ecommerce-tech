"use client";

import { useEffect, useState } from "react";

/**
 * Retrasa la propagación de un valor que cambia en cada pulsación. Sin esto el
 * buscador dispararía una petición por carácter.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);

    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
