import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  useCartStore,
  selectCartCount,
  selectCartSubtotalCents,
  MAX_QUANTITY,
  type CartLineInput,
} from "./cart.store.ts";

const PRODUCT_A: CartLineInput = {
  id: "p1",
  name: "Mouse",
  slug: "mouse",
  priceCents: 1000,
  imageUrl: null,
};

const PRODUCT_B: CartLineInput = {
  id: "p2",
  name: "Teclado",
  slug: "teclado",
  priceCents: 5000,
  imageUrl: null,
};

beforeEach(() => {
  useCartStore.setState({ items: [], isOpen: false });
});

test("addItem adds a new product with quantity 1 and opens the drawer", () => {
  useCartStore.getState().addItem(PRODUCT_A);

  const state = useCartStore.getState();
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].quantity, 1);
  assert.equal(state.isOpen, true);
});

test("addItem increments the quantity of an already-present product instead of duplicating it", () => {
  useCartStore.getState().addItem(PRODUCT_A);
  useCartStore.getState().addItem(PRODUCT_A);

  const state = useCartStore.getState();
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].quantity, 2);
});

test("addItem does not push a product's quantity above MAX_QUANTITY", () => {
  useCartStore.setState({
    items: [{ ...PRODUCT_A, quantity: MAX_QUANTITY }],
    isOpen: false,
  });

  useCartStore.getState().addItem(PRODUCT_A);

  assert.equal(useCartStore.getState().items[0].quantity, MAX_QUANTITY);
});

test("removeItem removes only the matching line", () => {
  useCartStore.getState().addItem(PRODUCT_A);
  useCartStore.getState().addItem(PRODUCT_B);

  useCartStore.getState().removeItem(PRODUCT_A.id);

  const state = useCartStore.getState();
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].id, PRODUCT_B.id);
});

test("setQuantity clamps a value below the minimum up to 1", () => {
  useCartStore.getState().addItem(PRODUCT_A);
  useCartStore.getState().setQuantity(PRODUCT_A.id, -5);

  assert.equal(useCartStore.getState().items[0].quantity, 1);
});

test("setQuantity clamps a value above MAX_QUANTITY down to the maximum", () => {
  useCartStore.getState().addItem(PRODUCT_A);
  useCartStore.getState().setQuantity(PRODUCT_A.id, 500);

  assert.equal(useCartStore.getState().items[0].quantity, MAX_QUANTITY);
});

test("setQuantity truncates a non-integer quantity", () => {
  useCartStore.getState().addItem(PRODUCT_A);
  useCartStore.getState().setQuantity(PRODUCT_A.id, 3.9);

  assert.equal(useCartStore.getState().items[0].quantity, 3);
});

test("clear empties the cart without closing the drawer", () => {
  useCartStore.getState().addItem(PRODUCT_A);
  useCartStore.setState({ isOpen: true });

  useCartStore.getState().clear();

  const state = useCartStore.getState();
  assert.deepEqual(state.items, []);
  assert.equal(state.isOpen, true);
});

test("setOpen toggles the drawer state directly", () => {
  useCartStore.getState().setOpen(true);
  assert.equal(useCartStore.getState().isOpen, true);

  useCartStore.getState().setOpen(false);
  assert.equal(useCartStore.getState().isOpen, false);
});

test("selectCartCount returns 0 for an empty cart", () => {
  assert.equal(selectCartCount(useCartStore.getState()), 0);
});

test("selectCartCount sums the quantity of every line", () => {
  useCartStore.getState().addItem(PRODUCT_A);
  useCartStore.getState().addItem(PRODUCT_B);
  useCartStore.getState().setQuantity(PRODUCT_B.id, 3);

  assert.equal(selectCartCount(useCartStore.getState()), 4);
});

test("selectCartSubtotalCents returns 0 for an empty cart", () => {
  assert.equal(selectCartSubtotalCents(useCartStore.getState()), 0);
});

test("selectCartSubtotalCents sums priceCents times quantity across lines", () => {
  useCartStore.getState().addItem(PRODUCT_A);
  useCartStore.getState().addItem(PRODUCT_B);
  useCartStore.getState().setQuantity(PRODUCT_B.id, 2);

  // 1000*1 + 5000*2 = 11000
  assert.equal(selectCartSubtotalCents(useCartStore.getState()), 11000);
});
