import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  handleApiError,
} from "./api-errors.ts";

// Construye una cadena real de `cause` de la profundidad exacta pedida, con el
// código de Postgres solo en el eslabón más profundo.
function buildCauseChain(code: string, hops: number): Error {
  let deepest: Error = Object.assign(new Error("pg error"), { code });

  for (let i = 0; i < hops; i += 1) {
    const wrapper = new Error(`wrapper-${i}`);
    (wrapper as Error & { cause?: unknown }).cause = deepest;
    deepest = wrapper;
  }

  return deepest;
}

async function bodyOf(response: Response) {
  return { status: response.status, body: await response.json() };
}

test("handleApiError maps UnauthorizedError to 401", async () => {
  const { status, body } = await bodyOf(
    handleApiError(new UnauthorizedError()),
  );
  assert.equal(status, 401);
  assert.equal(body.message, "Debes iniciar sesión para realizar esta acción");
});

test("handleApiError maps ForbiddenError to 403", async () => {
  const { status, body } = await bodyOf(handleApiError(new ForbiddenError()));
  assert.equal(status, 403);
  assert.equal(body.message, "No tienes permiso para realizar esta acción");
});

test("handleApiError maps NotFoundError to 404", async () => {
  const { status, body } = await bodyOf(handleApiError(new NotFoundError()));
  assert.equal(status, 404);
  assert.equal(body.message, "Recurso no encontrado");
});

test("handleApiError maps ConflictError to 409", async () => {
  const { status, body } = await bodyOf(handleApiError(new ConflictError()));
  assert.equal(status, 409);
  assert.equal(body.message, "El recurso ya existe");
});

test("handleApiError maps a ZodError to 400 with field issues", async () => {
  const schema = z.object({ name: z.string().min(1) });
  const result = schema.safeParse({ name: "" });
  assert.equal(result.success, false);

  const { status, body } = await bodyOf(
    handleApiError(result.error),
  );
  assert.equal(status, 400);
  assert.equal(body.message, "Los datos enviados no son válidos");
  assert.equal(body.issues[0].field, "name");
});

test("handleApiError maps a unique-violation Postgres error to 409 with the default message", async () => {
  const error = buildCauseChain("23505", 2);
  const { status, body } = await bodyOf(handleApiError(error));
  assert.equal(status, 409);
  assert.equal(body.message, "Ya existe un registro con esos datos");
});

test("handleApiError uses the custom conflictMessage for a unique violation", async () => {
  const error = buildCauseChain("23505", 0);
  const { status, body } = await bodyOf(
    handleApiError(error, { conflictMessage: "Ese SKU ya existe" }),
  );
  assert.equal(status, 409);
  assert.equal(body.message, "Ese SKU ya existe");
});

test("handleApiError finds a Postgres code nested at the deepest checked cause level", async () => {
  // MAX_CAUSE_DEPTH es 5: el bucle revisa el error de primer nivel más 4
  // saltos de `cause` (5 objetos en total, índices 0..4).
  const error = buildCauseChain("23505", 4);
  const { status } = await bodyOf(handleApiError(error));
  assert.equal(status, 409);
});

test("handleApiError does not find a Postgres code beyond MAX_CAUSE_DEPTH", async () => {
  const error = buildCauseChain("23505", 5);
  const { status } = await bodyOf(handleApiError(error));
  assert.equal(status, 500);
});

test("handleApiError maps a foreign-key violation using the caller's status and message", async () => {
  const error = buildCauseChain("23503", 1);
  const { status, body } = await bodyOf(
    handleApiError(error, {
      foreignKey: { status: 400, message: "La categoría no existe" },
    }),
  );
  assert.equal(status, 400);
  assert.equal(body.message, "La categoría no existe");
});

test("handleApiError falls back to 500 for a foreign-key violation when the caller declared no mapping", async () => {
  const error = buildCauseChain("23503", 1);
  const { status } = await bodyOf(handleApiError(error));
  assert.equal(status, 500);
});

test("handleApiError falls back to a generic 500 for an unrecognized error", async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const { status, body } = await bodyOf(handleApiError(new Error("boom")));
    assert.equal(status, 500);
    assert.equal(body.message, "Error interno del servidor");
  } finally {
    console.error = originalConsoleError;
  }
});
