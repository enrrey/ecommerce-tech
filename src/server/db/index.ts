import "server-only";

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

// El driver WebSocket (no el HTTP) es el único que soporta transacciones
// multi-sentencia, requisito de audit_logs (SETUP 5.2).
const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });

export const db = drizzle(pool, { schema });

export type Database = typeof db;
