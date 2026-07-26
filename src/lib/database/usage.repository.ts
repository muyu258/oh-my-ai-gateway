import { and, count, desc, eq, gte, like, sql, type SQL } from "drizzle-orm";

import type { UsageFilters, UsagePeriodFilter } from "#/lib/usage/filters";
import { db } from "./drizzle/client";
import { provider, usage, type NewUsage, type Usage } from "./drizzle/schema";

export type UsageRecord = Usage & { name: string | null };

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

export const saveUsage = async (record: NewUsage): Promise<void> => {
  await db.insert(usage).values(record);
};

export const getUsages = async ({
  filters,
  page,
  pageSize,
}: {
  filters: UsageFilters;
  page: number;
  pageSize: number;
}): Promise<{ records: UsageRecord[]; total: number }> => {
  const where = createUsageWhere(filters);
  const [records, [{ total }]] = await Promise.all([
    db
      .select({
        id: usage.id,
        providerId: usage.providerId,
        name: provider.name,
        model: usage.model,
        client: usage.client,
        protocolType: usage.protocolType,
        status: usage.status,
        isStream: usage.isStream,
        error: usage.error,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheCreationInputTokens: usage.cacheCreationInputTokens,
        cacheReadInputTokens: usage.cacheReadInputTokens,
        costMicros: usage.costMicros,
        costStatus: usage.costStatus,
        costSnapshot: usage.costSnapshot,
        startAt: usage.startAt,
        timeToFirstByteMs: usage.timeToFirstByteMs,
        endAt: usage.endAt,
      })
      .from(usage)
      .leftJoin(provider, eq(usage.providerId, provider.id))
      .where(where)
      .orderBy(desc(usage.startAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(usage).where(where),
  ]);

  return { records, total };
};
