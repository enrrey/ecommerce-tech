import Link from "next/link";
import { ZapIcon } from "lucide-react";

import { CATALOG_SECTION_ID } from "../constants";

const FOOTER_COLUMNS = [
  {
    title: "Tienda",
    links: [
      { label: "Catálogo", href: `#${CATALOG_SECTION_ID}` },
      { label: "Ofertas", href: "#ofertas" },
      { label: "Categorías", href: "#categorias" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { label: "Preguntas frecuentes", href: "#" },
      { label: "Envíos", href: "#" },
      { label: "Devoluciones", href: "#" },
      { label: "Garantía", href: "#" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Nosotros", href: "#" },
      { label: "Contacto", href: "#" },
      { label: "Trabaja con nosotros", href: "#" },
    ],
  },
] as const;

const CURRENT_YEAR = new Date().getFullYear();

/** Estático: se renderiza en el servidor y no envía JavaScript al cliente. */
export function StorefrontFooter() {
  return (
    <footer className="border-t pt-16 pb-8">
      <div className="mx-auto w-full max-w-[1200px] px-5">
        <div className="mb-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="font-display flex items-center gap-2 text-lg">
              <span className="bg-brand text-brand-foreground flex size-7 items-center justify-center rounded-lg">
                <ZapIcon className="size-3.5 fill-current" />
              </span>
              VOLT
            </Link>
            <p className="text-muted-foreground mt-4 max-w-65 text-sm leading-relaxed">
              Tecnología curada para el uso real: rendimiento, garantía y
              soporte en cada compra.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-muted-foreground mb-4 text-xs font-bold tracking-[0.06em] uppercase">
                {column.title}
              </h3>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="hover:text-brand text-sm font-medium transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-4 border-t pt-7 text-xs">
          <p>© {CURRENT_YEAR} VOLT. Todos los derechos reservados.</p>
          <div className="flex gap-2" aria-hidden>
            {Array.from({ length: 4 }, (_, index) => (
              <span
                key={index}
                className="bg-muted h-6.5 w-10 rounded border"
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
