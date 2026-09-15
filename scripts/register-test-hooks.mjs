import { register } from "node:module";

register("./ts-extension-hook.mjs", import.meta.url);

// `src/server/db/index.ts` exige `DATABASE_URL` al importarse (antes de
// cualquier query real) y `new Pool()` no conecta hasta la primera consulta,
// así que un valor dummy es suficiente para todo archivo que solo necesita
// importar un repositorio sin tocar la base de datos de verdad (la propia
// prueba mockea `@/server/db` cuando sí necesita datos).
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
