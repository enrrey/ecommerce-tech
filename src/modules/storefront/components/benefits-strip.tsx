import {
  HeadphonesIcon,
  ShieldCheckIcon,
  TruckIcon,
  LockIcon,
} from "lucide-react";

const BENEFITS = [
  {
    icon: TruckIcon,
    title: "Envío gratis",
    description: "En compras desde 199",
  },
  {
    icon: ShieldCheckIcon,
    title: "Garantía extendida",
    description: "Hasta 24 meses en tecnología",
  },
  {
    icon: LockIcon,
    title: "Pago seguro",
    description: "Tarjetas, billeteras y contraentrega",
  },
  {
    icon: HeadphonesIcon,
    title: "Soporte 24/7",
    description: "Asesoría técnica cuando la necesites",
  },
] as const;

/** Contenido editorial fijo: sin datos ni estado, se queda en el servidor. */
export function BenefitsStrip() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-5 py-16">
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex items-start gap-4">
            <span className="bg-muted text-brand flex size-11 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-5" />
            </span>
            <span>
              <span className="block font-bold">{title}</span>
              <span className="text-muted-foreground block text-sm">
                {description}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
