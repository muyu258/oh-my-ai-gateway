import { db } from "./drizzle/client";
import { createUsageRepository } from "./usage.repository.core";

export const { getUsages, saveUsage } = createUsageRepository(db);
