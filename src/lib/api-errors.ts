import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class UnauthorizedError extends Error {
  constructor(message = "Debes iniciar sesión para realizar esta acción") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// 403, no 401: hay sesión válida, lo que falta es el permiso. Distinguirlos
// evita que el cliente mande al usuario a iniciar sesión otra vez en vano.
export class ForbiddenError extends Error {
  constructor(message = "No tienes permiso para realizar esta acción") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Recurso no encontrado") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message = "El recurso ya existe") {
    super(message);
    this.name = "ConflictError";
  }
}

type ApiIssue = { field: string; message: string };

type ApiErrorBody = {
  message: string;
  issues?: ApiIssue[];
};

const UNIQUE_VIOLATION = "23505";

const FOREIGN_KEY_VIOLATION = "23503";

const MAX_CAUSE_DEPTH = 5;

// Drizzle envuelve el error del driver en DrizzleQueryError, así que el código
// de Postgres viaja en `cause`, no en el error de primer nivel.
function isPostgresError(error: unknown, code: string): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (!(current instanceof Error)) {
      return false;
    }

    if ("code" in current && (current as { code: unknown }).code === code) {
      return true;
    }

    current = current.cause;
  }

  return false;
}

type HandleApiErrorOptions = {
  /** Mensaje del 409 por violación de UNIQUE; el texto de dominio no vive en lib. */
  conflictMessage?: string;
  /**
   * Respuesta ante una violación de FK. El estado depende del lado de la
   * relación: 400 al insertar apuntando a un padre inexistente, 409 al borrar
   * un padre que aún tiene hijos.
   */
  foreignKey?: { status: 400 | 409; message: string };
};

export function handleApiError(
  error: unknown,
  options: HandleApiErrorOptions = {},
): NextResponse<ApiErrorBody> {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }

  if (error instanceof ConflictError) {
    return NextResponse.json({ message: error.message }, { status: 409 });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Los datos enviados no son válidos",
        issues: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  // El constraint UNIQUE es la única guardia de unicidad: un SELECT previo
  // tendría carrera entre peticiones concurrentes.
  if (isPostgresError(error, UNIQUE_VIOLATION)) {
    return NextResponse.json(
      {
        message:
          options.conflictMessage ?? "Ya existe un registro con esos datos",
      },
      { status: 409 },
    );
  }

  // Sin mapeo explícito de dominio la FK caería en el 500 genérico: solo se
  // traduce cuando el handler declara qué significa en su contexto.
  if (options.foreignKey && isPostgresError(error, FOREIGN_KEY_VIOLATION)) {
    return NextResponse.json(
      { message: options.foreignKey.message },
      { status: options.foreignKey.status },
    );
  }

  console.error(error);

  return NextResponse.json(
    { message: "Error interno del servidor" },
    { status: 500 },
  );
}
