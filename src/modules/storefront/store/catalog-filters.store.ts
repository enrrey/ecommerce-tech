import { create } from "zustand";

type CatalogFiltersState = {
  term: string;
  setTerm: (term: string) => void;
  reset: () => void;
};

/**
 * Búsqueda del preview de la landing. Es estado de UI, no datos de servidor: el
 * hook de TanStack Query lo recibe como parte de su clave.
 *
 * Vive en Zustand y no en un `useState` porque el buscador está en el header
 * (dentro del layout) y la grilla en la página: son ramas hermanas del árbol,
 * sin ancestro cliente común donde levantar el estado.
 *
 * Solo cubre la home. `/products` tiene la URL como único estado: duplicarlo
 * aquí desincronizaría el botón "atrás" del navegador con lo que se ve.
 */
export const useCatalogFiltersStore = create<CatalogFiltersState>()((set) => ({
  term: "",

  setTerm: (term) => set({ term }),

  reset: () => set({ term: "" }),
}));
