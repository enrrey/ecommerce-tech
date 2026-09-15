"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { BRAND_BUTTON_CLASS } from "../constants";
import {
  newsletterSchema,
  type NewsletterFormValues,
} from "../schemas/newsletter.schema";

/**
 * El backend del newsletter queda fuera del alcance del spec 007: el submit
 * valida y confirma, pero no persiste nada. No hay petición que fallar, así que
 * tampoco hay estado de error de red que mostrar.
 */
export function NewsletterSection() {
  const { formState, handleSubmit, register, reset } =
    useForm<NewsletterFormValues>({
      resolver: zodResolver(newsletterSchema),
      defaultValues: { email: "" },
    });

  function onSubmit(values: NewsletterFormValues) {
    toast.success("¡Listo! Revisa tu correo.", { description: values.email });
    reset();
  }

  return (
    <section className="mx-auto w-full max-w-[1200px] px-5 pb-24">
      <div className="bg-foreground text-background flex flex-col justify-between gap-8 rounded-3xl px-8 py-12 md:flex-row md:items-center md:px-16">
        <div>
          <h2 className="font-display text-xl font-bold md:text-2xl">
            No te pierdas ninguna oferta
          </h2>
          <p className="mt-2 text-sm opacity-75 md:text-base">
            Ofertas exclusivas y lanzamientos, directo a tu correo.
          </p>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start"
        >
          <Field data-invalid={Boolean(formState.errors.email)}>
            <Input
              type="email"
              placeholder="tu@correo.com"
              aria-label="Correo electrónico"
              aria-invalid={Boolean(formState.errors.email)}
              className="h-11 border-current/25 bg-transparent text-current placeholder:text-current/50 sm:w-70"
              {...register("email")}
            />
            <FieldError errors={[formState.errors.email]} />
          </Field>

          <Button
            type="submit"
            size="lg"
            className={cn("h-11", BRAND_BUTTON_CLASS)}
          >
            Suscribirme
          </Button>
        </form>
      </div>
    </section>
  );
}
