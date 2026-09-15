const BRANDS = [
  "INTEL",
  "AMD",
  "NVIDIA",
  "WINDOWS 11",
  "LENOVO",
  "HP",
  "DELL",
  "MSI",
] as const;

/** Contenido editorial fijo: sin datos ni estado, se queda en el servidor. */
export function BrandsStrip() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-5 pt-4 pb-10">
      <p className="text-muted-foreground mb-4 text-center text-xs font-bold tracking-[0.08em] uppercase">
        Marcas con las que trabajamos
      </p>
      <ul className="flex flex-wrap justify-center gap-3">
        {BRANDS.map((brand) => (
          <li
            key={brand}
            className="bg-muted text-muted-foreground font-display rounded-lg border px-4 py-2.5 text-xs font-bold tracking-wider"
          >
            {brand}
          </li>
        ))}
      </ul>
    </section>
  );
}
