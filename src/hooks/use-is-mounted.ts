"use client";

import { useSyncExternalStore } from "react";

/** No hay store real que observar: el valor solo depende de dónde se ejecuta. */
function noopSubscribe(): () => void {
  return () => {};
}

/**
 * `false` en servidor y en el primer render del cliente, `true` después de
 * hidratar. Sirve para diferir lo que solo existe en el navegador (tema
 * resuelto, hora local) sin provocar un desajuste de hidratación.
 *
 * Con `useSyncExternalStore` y no con `useState` + `useEffect`: React distingue
 * el snapshot de servidor del de cliente sin un render extra en cascada.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
