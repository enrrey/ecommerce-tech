// `@types/node` still types `mock.module()`'s named-exports option as
// `namedExports`, but Node.js itself renamed it to `exports` and deprecated
// `namedExports` (warns at runtime). This augments the ambient `node:test`
// module so test files can use the current, non-deprecated option name.
// Remove once DefinitelyTyped ships `exports` upstream.
declare module "node:test" {
  interface MockModuleOptions {
    exports?: object | undefined;
  }
}
