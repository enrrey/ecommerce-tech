import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import type { auditLogs, auditSeverity } from "@/server/db/schema/audit-log";

export type { AuditChanges } from "@/server/db/schema/audit-log";

export type AuditLog = InferSelectModel<typeof auditLogs>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;
export type AuditSeverity = (typeof auditSeverity.enumValues)[number];
