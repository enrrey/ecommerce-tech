import { z } from "zod";

export const newsletterSchema = z.object({
  email: z
    .email("Escribe un correo válido")
    .max(160, "El correo no puede superar 160 caracteres"),
});

export type NewsletterFormValues = z.output<typeof newsletterSchema>;
