import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = new URL("../", import.meta.url);
const ALIAS_PREFIX = "@/";

const RELATIVE_CANDIDATES = [".ts", ".tsx", "/index.ts"];
const BARE_SPECIFIER_CANDIDATES = [".js", ".mjs", ".cjs"];

// Solo extensiones reales: muchos archivos del proyecto usan nombres
// compuestos (`product.schema.ts`, `user.repository.ts`), así que una regex
// genérica tipo `/\.[a-zA-Z0-9]+$/` confunde ".schema" o ".repository" con una
// extensión real y se salta la resolución de abajo.
const KNOWN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];

function hasKnownExtension(specifier) {
  return KNOWN_EXTENSIONS.some((ext) => specifier.endsWith(ext));
}

function resolveWithExtension(basePath) {
  for (const ext of RELATIVE_CANDIDATES) {
    if (existsSync(basePath + ext)) {
      return pathToFileURL(basePath + ext).href;
    }
  }

  return null;
}

// Next.js resuelve estos paquetes marcadores a un módulo vacío vía alias del
// bundler (servidor: no-op; cliente: lanza). Bajo Node puro el paquete real
// siempre lanza al importarse, así que se redirigen a un stub propio.
const BUNDLER_ONLY_STUBS = new Set(["server-only", "client-only"]);

export async function resolve(specifier, context, nextResolve) {
  if (BUNDLER_ONLY_STUBS.has(specifier)) {
    return nextResolve(
      new URL("./server-only-stub.mjs", import.meta.url).href,
      context,
    );
  }

  // `tsconfig.json` mapea "@/*" a "./src/*" para el bundler; Node ESM no
  // conoce ese alias, así que se resuelve aquí a mano antes de delegar.
  if (specifier.startsWith(ALIAS_PREFIX)) {
    const basePath = fileURLToPath(
      new URL(`src/${specifier.slice(ALIAS_PREFIX.length)}`, PROJECT_ROOT),
    );
    const resolved = resolveWithExtension(basePath);

    if (resolved) {
      return nextResolve(resolved, context);
    }
  }

  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  const hasExtension = hasKnownExtension(specifier);

  // El resolvedor "bundler" de tsconfig.json completa la extensión de un
  // specifier relativo; el ESM nativo de Node no. En vez de reescribir cada
  // import del código de producción, se completa aquí antes de resolver.
  if (isRelative && !hasExtension) {
    const basePath = fileURLToPath(new URL(specifier, context.parentURL));
    const resolved = resolveWithExtension(basePath);

    if (resolved) {
      return nextResolve(resolved, context);
    }
  }

  // Algunos paquetes (p. ej. `next`) exponen subpaths como `next/server` sin
  // declarar `exports` en su package.json: el archivo real es `server.js`,
  // pero Node ESM no prueba extensiones para un specifier de paquete. Si la
  // resolución tal cual falla, se reintenta con extensiones de archivo
  // habituales antes de rendirse.
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND" || hasExtension) {
      throw error;
    }

    for (const ext of BARE_SPECIFIER_CANDIDATES) {
      try {
        return await nextResolve(specifier + ext, context);
      } catch {
        // sigue con la siguiente extensión candidata
      }
    }

    throw error;
  }
}
