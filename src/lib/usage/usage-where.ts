import { and, eq, gte, ilike, isNull, or, sql, type SQL } from "drizzle-orm";

import { usage } from "#/lib/database/drizzle/schema";
import type { UsageFilters, UsagePeriodFilter } from "./filters";

const periodInMilliseconds: Partial<Record<UsagePeriodFilter, number>> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export const createUsageWhere = (filters: UsageFilters): SQL | undefined => {
  const conditions: SQL[] = [];
  const model = filters.model?.trim();
  const client = filters.client?.trim();

  if (model) {
    conditions.push(
      or(ilike(usage.model, `%${model}%`), ilike(usage.upstreamModel, `%${model}%`))!,
    );
  }
  if (client) conditions.push(ilike(usage.client, `%${client}%`));
  if (filters.protocolType) conditions.push(sql`${usage.protocolType} = ${filters.protocolType}`);
  if (filters.stream !== "all") conditions.push(eq(usage.isStream, filters.stream === "stream"));
  if (filters.status === "success") {
    conditions.push(sql`cast(${usage.status} as integer) between 200 and 399`);
  }
  if (filters.status === "error") {
    conditions.push(sql`(${usage.status} is null or cast(${usage.status} as integer) >= 400)`);
  }
  if (filters.pricingSource === "unknown") conditions.push(isNull(usage.pricingSource));
  else if (filters.pricingSource !== "all") {
    conditions.push(eq(usage.pricingSource, filters.pricingSource));
  }
  const period = periodInMilliseconds[filters.period];
  if (period) conditions.push(gte(usage.startAt, new Date(Date.now() - period)));
  return and(...conditions);
};
