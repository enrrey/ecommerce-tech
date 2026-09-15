"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsMounted } from "@/hooks/use-is-mounted";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // El servidor no conoce el tema resuelto (vive en localStorage / el sistema).
  // Hasta que el componente monta se renderiza un hueco del mismo tamaño para
  // no provocar un desajuste de hidratación ni un salto de layout.
  const mounted = useIsMounted();

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? "Activar tema claro" : "Activar tema oscuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (
        isDark ? (
          <SunIcon className="size-[1.15rem]" />
        ) : (
          <MoonIcon className="size-[1.15rem]" />
        )
      ) : (
        <span className="size-[1.15rem]" />
      )}
    </Button>
  );
}
