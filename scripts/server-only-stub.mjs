// Next.js resuelve "server-only" a un módulo vacío en el build de servidor
// (vía alias de webpack/turbopack). Bajo el runner nativo de Node no hay ese
// alias, y el paquete real lanza incondicionalmente al importarse, así que el
// resolve hook de test (ts-extension-hook.mjs) redirige aquí en su lugar.
export {};
