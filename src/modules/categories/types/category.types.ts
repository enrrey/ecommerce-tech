import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import type { categories } from "@/server/db/schema/category";

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;
