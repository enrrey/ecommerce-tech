"use client";

import { useCallback } from "react";

import { CATALOG_SECTION_ID } from "../constants";

/**
 * Lleva la vista a la grilla del catálogo. Buscar o elegir categoría desde el
 * header cambia una sección que puede estar fuera de pantalla; sin el scroll el
 * usuario no vería el efecto de su acción.
 */
export function useScrollToCatalog(): () => void {
  return useCallback(() => {
    document
      .getElementById(CATALOG_SECTION_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
}
