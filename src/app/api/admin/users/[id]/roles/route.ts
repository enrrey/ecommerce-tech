import { NextResponse } from "next/server";

import { ConflictError, handleApiError, NotFoundError } from "@/lib/api-errors";
import { requirePermission } from "@/lib/permissions";
import {
  assignRoleSchema,
  userIdParamSchema,
} from "@/modules/roles/schemas/user-role.schema";
import { findUserById } from "@/server/repositories/user.repository";
import { assignRoleToUser } from "@/server/repositories/user-role.repository";

const USER_NOT_FOUND_MESSAGE =
  "El usuario no existe en la base de datos: debe iniciar sesión al menos una vez para que el webhook cree su ficha";
const SELF_ASSIGNMENT_MESSAGE = "No puedes modificar tus propios roles";
const ALREADY_ASSIGNED_MESSAGE = "El usuario ya tiene ese rol asignado";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const actorId = await requirePermission("users.assign_role");

    const { id } = userIdParamSchema.parse(await context.params);
    const { roleSlug } = assignRoleSchema.parse(await request.json());

    // Nadie escala ni se desarma a sí mismo: evita quedarse sin ningún actor
    // capaz de administrar roles.
    if (id === actorId) {
      throw new ConflictError(SELF_ASSIGNMENT_MESSAGE);
    }

    // La FK de `user_roles` daría 23503, que no se puede traducir a 404 sin
    // adivinar cuál de las dos referencias falló.
    if (!(await findUserById(id))) {
      throw new NotFoundError(USER_NOT_FOUND_MESSAGE);
    }

    const assignment = await assignRoleToUser({
      userId: id,
      roleSlug,
      actorId,
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    return handleApiError(error, {
      conflictMessage: ALREADY_ASSIGNED_MESSAGE,
    });
  }
}
