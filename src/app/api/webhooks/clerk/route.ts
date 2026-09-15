import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook, type WebhookEvent } from "@clerk/nextjs/webhooks";

import { handleApiError } from "@/lib/api-errors";
import { requireEnv } from "@/lib/env";
import type { ClerkUserSyncInput } from "@/modules/roles/types/user-role.types";
import {
  deactivateUserByClerkId,
  upsertUserFromClerk,
} from "@/server/repositories/user.repository";

type ClerkUserData = Extract<
  WebhookEvent,
  { type: "user.created" | "user.updated" }
>["data"];

function findPrimaryEmail(data: ClerkUserData): string | null {
  const primary = data.email_addresses.find(
    (address) => address.id === data.primary_email_address_id,
  );

  return (
    primary?.email_address ?? data.email_addresses[0]?.email_address ?? null
  );
}

function toSyncInput(data: ClerkUserData): ClerkUserSyncInput | null {
  const email = findPrimaryEmail(data);

  if (!email) {
    return null;
  }

  return {
    clerkId: data.id,
    email,
    firstName: data.first_name,
    lastName: data.last_name,
    imageUrl: data.image_url,
  };
}

/**
 * Única ruta pública que escribe en `users`: sin verificar la firma cualquiera
 * podría crear cuentas espejo. Se verifica **antes** de leer el cuerpo.
 *
 * Un fallo de base de datos sale como 5xx a propósito: Clerk reintenta. Un
 * evento que no nos interesa, o uno sin email utilizable, se responde 200 para
 * que no se reintente eternamente.
 */
export async function POST(request: NextRequest) {
  try {
    const signingSecret = requireEnv("CLERK_WEBHOOK_SIGNING_SECRET");

    let event: WebhookEvent;

    try {
      event = await verifyWebhook(request, { signingSecret });
    } catch (error) {
      console.error("Firma de webhook de Clerk inválida", error);

      return NextResponse.json(
        { message: "Firma de webhook inválida" },
        { status: 400 },
      );
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const input = toSyncInput(event.data);

        if (!input) {
          console.warn(
            `Evento ${event.type} ignorado: el usuario de Clerk no tiene email.`,
          );
          break;
        }

        await upsertUserFromClerk(input);
        break;
      }

      case "user.deleted": {
        if (event.data.id) {
          await deactivateUserByClerkId(event.data.id);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return handleApiError(error);
  }
}
