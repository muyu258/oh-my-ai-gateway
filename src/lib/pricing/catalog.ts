import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "#/lib/database/drizzle/client";
import { keyValue } from "#/lib/database/drizzle/schema";
import { pricingCatalogSchema, type PricingCatalog } from "./pricing.types";

export const getPricingCatalog = async (): Promise<PricingCatalog> => {
  "use cache";
  cacheTag("pricing");
  cacheLife("max");

  const [record] = await db
    .select({ value: keyValue.value })
    .from(keyValue)
    .where(eq(keyValue.key, "pricing"))
    .limit(1);
  if (!record) {
    throw new Error(
      "Database is not initialized: required pricing entry is missing. Run 'bun run db:init'.",
    );
  }
  return pricingCatalogSchema.parse(record.value);
};
