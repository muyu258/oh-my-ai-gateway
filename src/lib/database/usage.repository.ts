import { and, count, desc, eq, exists, gte, like, sql, type SQL } from "drizzle-orm";

import { db } from "./drizzle/client";
import { usage, usageContent, type NewUsage, type NewUsageContent } from "./drizzle/schema";

export const USAGE_CONTENT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const saveUsage = async (record: NewUsage): Promise<void> => {
  await db.insert(usage).values(record);
};

export const saveUsageContent = async (content: NewUsageContent): Promise<void> => {
  await db.insert(usageContent).values(content);
};

export const getUsageContent = async (usageId: string) => {
  return db.select().from(usageContent).where(eq(usageContent.usageId, usageId)).get();
};

export const cleanupExpiredUsageContent = async (now: Date = new Date()): Promise<number> => {
  const threshold = new Date(now.getTime() - USAGE_CONTENT_RETENTION_MS);
  const result = await db.delete(usageContent).where(sql`${usageContent.createdAt} < ${threshold}`);
  return result.changes;
};

export type UsageStatusFilter = "all" | "success" | "error";
export type UsagePeriodFilter = "24h" | "7d" | "30d" | "all";
export type UsageStreamFilter = "all" | "stream" | "nonStream";

export type UsageFilters = {
  model?: string;
  client?: string;
  protocolType?: string;
  stream: UsageStreamFilter;
  status: UsageStatusFilter;
  period: UsagePeriodFilter;
};

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

export const getUsages = async ({
  filters,
  page,
  pageSize,
}: {
  filters: UsageFilters;
  page: number;
  pageSize: number;
}) => {
  const where = createUsageWhere(filters);
  const contentExists = exists(
    db
      .select({ one: sql`1` })
      .from(usageContent)
      .where(eq(usageContent.usageId, usage.id)),
  ).mapWith(Boolean);
  const [records, [{ total }]] = await Promise.all([
    db
      .select({ usage: usage, hasContent: contentExists })
      .from(usage)
      .where(where)
      .orderBy(desc(usage.startAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(usage).where(where),
  ]);

  return {
    records: records.map(({ usage: record, hasContent }) => ({ ...record, hasContent })),
    total,
  };
};

export { getUsages as getUsageRecords };
