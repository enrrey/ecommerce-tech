"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { MyOrdersQueryInput } from "../schemas/order-history.schema";

type PurchasePreset = "month" | "range";

type PurchaseDateFilterProps = {
  value: MyOrdersQueryInput;
  onChange: (range: MyOrdersQueryInput) => void;
};

/** `YYYY-MM-DD` en la zona del navegador; `toISOString()` daría el día en UTC. */
function toInputDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

/** Del día 1 del mes en curso hasta hoy, ambos incluidos. */
export function currentMonthRange(): Required<MyOrdersQueryInput> {
  const today = new Date();

  return {
    from: toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: toInputDate(today),
  };
}

/**
 * Solo emite el rango hacia arriba: no consulta nada. El fetch es del
 * contenedor, así que este componente sirve igual a cualquier lista filtrable
 * por fecha.
 *
 * `<Input type="date">` nativo en vez de `calendar` + `popover`: dos campos no
 * justifican traer `react-day-picker` al bundle del storefront.
 */
export function PurchaseDateFilter({
  value,
  onChange,
}: PurchaseDateFilterProps) {
  const [preset, setPreset] = useState<PurchasePreset>("month");

  function selectMonth() {
    setPreset("month");
    onChange(currentMonthRange());
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-end sm:justify-between">
      <div
        className="flex gap-2"
        role="group"
        aria-label="Periodo del historial"
      >
        <Button
          variant={preset === "month" ? "default" : "outline"}
          aria-pressed={preset === "month"}
          onClick={selectMonth}
        >
          Mes actual
        </Button>
        <Button
          variant={preset === "range" ? "default" : "outline"}
          aria-pressed={preset === "range"}
          onClick={() => setPreset("range")}
        >
          Rango
        </Button>
      </div>

      {preset === "range" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purchases-from">Desde</Label>
            <Input
              id="purchases-from"
              type="date"
              value={value.from ?? ""}
              max={value.to}
              onChange={(event) =>
                onChange({ ...value, from: event.target.value || undefined })
              }
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purchases-to">Hasta</Label>
            <Input
              id="purchases-to"
              type="date"
              value={value.to ?? ""}
              min={value.from}
              onChange={(event) =>
                onChange({ ...value, to: event.target.value || undefined })
              }
              className="w-40"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
