/**
 * Fake mínimo del builder encadenado de Drizzle para repositorios cuya lógica
 * de negocio vale la pena aislar (validaciones, cómputo de totales,
 * idempotencia) sin levantar Postgres. No simula SQL: cada llamada de entrada
 * (`select`/`insert`/`update`/`delete`) devuelve, en orden, el siguiente
 * resultado que el test dejó en cola — el mock no interpreta `where`, así que
 * no sirve para verificar que un filtro SQL es correcto (eso es
 * responsabilidad de un test de integración contra Postgres real). Sí registra
 * cada llamada (`calls`) para poder comprobar, por ejemplo, qué se pasó a
 * `.values()` antes de un INSERT.
 */
export type RecordedCall = { method: string; args: unknown[] };

function chainable<T>(rows: T, calls: RecordedCall[]) {
  const builder: Record<string, unknown> = {
    then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
    catch: (reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).catch(reject),
  };

  for (const method of [
    "from",
    "where",
    "innerJoin",
    "leftJoin",
    "orderBy",
    "limit",
    "offset",
    "groupBy",
    "values",
    "set",
    "returning",
    "selectDistinct",
  ]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }

  return builder;
}

/**
 * Crea un `db`/`tx` falso que devuelve, en orden estricto de llamada, los
 * resultados dados — sin importar si la llamada de entrada fue `select`,
 * `insert`, `update` o `delete`. Sirve porque el código que se prueba sigue
 * una secuencia de consultas fija (sin ramas que cambien el orden) para el
 * caso probado. `transaction(fn)` invoca `fn` con el mismo mock, así que la
 * secuencia sigue siendo una sola cola compartida dentro y fuera de la tx.
 *
 * `mock.calls` acumula cada llamada de encadenamiento (incluidas `values` y
 * `set`) en orden, para poder comprobar qué datos se intentaron escribir.
 */
export function createSequentialDbMock(...resultsInOrder: unknown[]) {
  let cursor = 0;
  const calls: RecordedCall[] = [];

  const next = () => {
    if (cursor >= resultsInOrder.length) {
      throw new Error(
        `createSequentialDbMock: no hay resultado en cola para la llamada #${cursor + 1}`,
      );
    }

    return resultsInOrder[cursor++];
  };

  const entryPoint = (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return chainable(next(), calls);
    };

  const mock = {
    select: entryPoint("select"),
    insert: entryPoint("insert"),
    update: entryPoint("update"),
    delete: entryPoint("delete"),
    selectDistinct: entryPoint("selectDistinct"),
    transaction: async (fn: (tx: typeof mock) => unknown) => fn(mock),
    calls,
  };

  return mock;
}
