import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-errors";
import { requirePermission } from "@/lib/permissions";
import { listUsersWithRoles } from "@/server/repositories/user.repository";

export async function GET() {
  try {
    await requirePermission("users.read");

    const users = await listUsersWithRoles();

    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}
