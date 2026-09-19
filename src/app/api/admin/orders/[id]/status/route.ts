import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-errors";
import { requirePermission } from "@/lib/permissions";
import {
  orderIdParamSchema,
  updateOrderStatusSchema,
} from "@/modules/orders/schemas/admin-order.schema";
import { updateOrderStatus } from "@/server/repositories/order.repository";

// `params` es una promesa en Next 16: se resuelve dentro del handler.
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    // El body se valida antes de autorizar porque el permiso depende del
    // destino: cancelar y confirmar el pago no son la misma facultad. Sin
    // sesión no se llega hasta aquí, el middleware ya devolvió 401.
    const { status } = updateOrderStatusSchema.parse(await request.json());

    const actorId = await requirePermission(
      status === "canceled" ? "orders.cancel" : "orders.update_status",
    );

    const { id } = orderIdParamSchema.parse(await context.params);

    const order = await updateOrderStatus({
      orderId: id,
      nextStatus: status,
      actorId,
    });

    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}
