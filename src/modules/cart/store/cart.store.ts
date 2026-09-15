import { create } from "zustand";

/**
 * Línea del carrito. El precio se congela al añadir y se guarda en centavos
 * enteros, igual que en la base: el subtotal se calcula sumando enteros y solo
 * la vista divide para formatear.
 */
export type CartItem = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
};

export type CartLineInput = Omit<CartItem, "quantity">;

const MIN_QUANTITY = 1;

export const MAX_QUANTITY = 99;

function clampQuantity(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.trunc(quantity)));
}

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: CartLineInput) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  setOpen: (isOpen: boolean) => void;
};

/**
 * Estado de UI puro: el carrito no se persiste en la base en este alcance, así
 * que vive en Zustand y no en TanStack Query. Sobrevive a la navegación de
 * cliente porque el store es un módulo singleton, no estado de un componente.
 */
export const useCartStore = create<CartState>()((set) => ({
  items: [],
  isOpen: false,

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.id === product.id);

      return {
        // Añadir abre el drawer: es la confirmación de que la acción ocurrió.
        isOpen: true,
        items: existing
          ? state.items.map((item) =>
              item.id === product.id
                ? { ...item, quantity: clampQuantity(item.quantity + 1) }
                : item,
            )
          : [...state.items, { ...product, quantity: MIN_QUANTITY }],
      };
    }),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

  setQuantity: (id, quantity) =>
    set((state) => ({
      // Bajar de 1 no borra la línea: para eso está el botón de eliminar, y un
      // borrado accidental por pulsar "−" no es recuperable.
      items: state.items.map((item) =>
        item.id === id ? { ...item, quantity: clampQuantity(quantity) } : item,
      ),
    })),

  clear: () => set({ items: [] }),

  setOpen: (isOpen) => set({ isOpen }),
}));

/**
 * Selectores a nivel de módulo: devuelven primitivos, así que el componente
 * suscrito solo se re-renderiza cuando el número cambia de verdad.
 */
export const selectCartCount = (state: CartState): number =>
  state.items.reduce((total, item) => total + item.quantity, 0);

export const selectCartSubtotalCents = (state: CartState): number =>
  state.items.reduce(
    (total, item) => total + item.priceCents * item.quantity,
    0,
  );
