import { count, desc, eq } from "drizzle-orm";

import type { UsageFilters } from "#/lib/usage/filters";
import { createUsageWhere } from "#/lib/usage/usage-where";
import { db } from "./drizzle/client";
import { provider, usage, type NewUsage, type Usage } from "./drizzle/schema";

export type UsageRecord = Usage & { name: string | null };

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
        upstreamModel: usage.upstreamModel,
        pricingSource: usage.pricingSource,
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
