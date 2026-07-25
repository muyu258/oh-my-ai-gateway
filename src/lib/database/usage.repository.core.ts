import { and, count, desc, eq, gte, like, sql, type SQL } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

import * as schema from "./drizzle/schema";
import type { UsageFilters, UsagePeriodFilter } from "#/lib/usage/filters";

const { usage } = schema;

const periodInMilliseconds: Partial<Record<UsagePeriodFilter, number>> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const createUsageWhere = (filters: UsageFilters): SQL | undefined => {
  const conditions: SQL[] = [];
  const model = filters.model?.trim();
  const client = filters.client?.trim();

  if (model) conditions.push(like(usage.model, `%${model}%`));
  if (client) conditions.push(like(usage.client, `%${client}%`));
  if (filters.protocolType) conditions.push(sql`${usage.protocolType} = ${filters.protocolType}`);
  if (filters.stream !== "all") conditions.push(eq(usage.isStream, filters.stream === "stream"));
  if (filters.status === "success") {
    conditions.push(sql`cast(${usage.status} as integer) between 200 and 399`);
  }
  if (filters.status === "error") {
    conditions.push(sql`(${usage.status} is null or cast(${usage.status} as integer) >= 400)`);
  }
  const period = periodInMilliseconds[filters.period];
  if (period) conditions.push(gte(usage.startAt, new Date(Date.now() - period)));
  return and(...conditions);
};

export const createUsageRepository = <TRunResult>(
  database: BaseSQLiteDatabase<"sync", TRunResult, typeof schema>,
) => ({
  saveUsage: async (record: schema.NewUsage): Promise<void> => {
    await database.insert(usage).values(record);
  },

  getUsages: async ({
    filters,
    page,
    pageSize,
  }: {
    filters: UsageFilters;
    page: number;
    pageSize: number;
  }): Promise<{ records: schema.Usage[]; total: number }> => {
    const where = createUsageWhere(filters);
    const [records, [{ total }]] = await Promise.all([
      database
        .select()
        .from(usage)
        .where(where)
        .orderBy(desc(usage.startAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      database.select({ total: count() }).from(usage).where(where),
    ]);

    return { records, total };
  },
});
