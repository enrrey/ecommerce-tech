import { NextResponse } from "next/server";

import { ConflictError, handleApiError, NotFoundError } from "@/lib/api-errors";
import { requirePermission } from "@/lib/permissions";
import { revokeRoleParamsSchema } from "@/modules/roles/schemas/user-role.schema";
import { findUserById } from "@/server/repositories/user.repository";
import { revokeRoleFromUser } from "@/server/repositories/user-role.repository";

const USER_NOT_FOUND_MESSAGE =
  "El usuario no existe en la base de datos: debe iniciar sesión al menos una vez para que el webhook cree su ficha";
const SELF_ASSIGNMENT_MESSAGE = "No puedes modificar tus propios roles";
const ROLE_NOT_ASSIGNED_MESSAGE = "El usuario no tiene asignado ese rol";

type RouteContext = { params: Promise<{ id: string; roleSlug: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const actorId = await requirePermission("users.assign_role");

    const { id, roleSlug } = revokeRoleParamsSchema.parse(await context.params);

    // Mismo guard que en la asignación: el último super admin no puede
    // revocarse a sí mismo y dejar el panel sin nadie que administre roles.
    if (id === actorId) {
      throw new ConflictError(SELF_ASSIGNMENT_MESSAGE);
    }

    if (!(await findUserById(id))) {
      throw new NotFoundError(USER_NOT_FOUND_MESSAGE);
    }

    const revoked = await revokeRoleFromUser({ userId: id, roleSlug, actorId });

    if (!revoked) {
      throw new NotFoundError(ROLE_NOT_ASSIGNED_MESSAGE);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
