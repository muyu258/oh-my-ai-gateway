import { and, avg, gte, isNotNull, sql, sum } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

import * as schema from "./drizzle/schema";

const { usage } = schema;

export type ProviderStatisticsPeriod = "30m" | "1h" | "6h" | "24h" | "7d" | "30d" | "all";

const periodInMilliseconds: Partial<Record<ProviderStatisticsPeriod, number>> = {
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export const createProviderStatisticsRepository = <TRunResult>(
  database: BaseSQLiteDatabase<"sync", TRunResult, typeof schema>,
) => ({
  getProviderStatistics: async (
    period: ProviderStatisticsPeriod,
    now = new Date(),
  ): Promise<
    Array<{
      name: string | null;
      averageResponseTimeMs: number | null;
      inputTokens: number | null;
      outputTokens: number | null;
      cacheReadInputTokens: number | null;
      costMicros: number | null;
      costComplete: boolean;
    }>
  > => {
    const duration = periodInMilliseconds[period];
    const rows = await database
      .select({
        name: usage.name,
        averageResponseTimeMs: avg(usage.timeToFirstByteMs).mapWith(Number),
        inputTokens: sum(
          sql<number>`case
            when ${usage.inputTokens} is null
              and ${usage.cacheCreationInputTokens} is null
              and ${usage.cacheReadInputTokens} is null then null
            else coalesce(${usage.inputTokens}, 0)
              + coalesce(${usage.cacheCreationInputTokens}, 0)
              + coalesce(${usage.cacheReadInputTokens}, 0)
          end`,
        ).mapWith(Number),
        outputTokens: sum(usage.outputTokens).mapWith(Number),
        cacheReadInputTokens: sum(usage.cacheReadInputTokens).mapWith(Number),
        costMicros: sum(usage.costMicros).mapWith(Number),
        incompleteCostCount:
          sql<number>`sum(case when ${usage.costStatus} = 'complete' then 0 else 1 end)`.mapWith(
            Number,
          ),
      })
      .from(usage)
      .where(
        and(
          duration ? gte(usage.startAt, new Date(now.getTime() - duration)) : undefined,
          isNotNull(usage.name),
        ),
      )
      .groupBy(usage.name);

    return rows.map(({ incompleteCostCount, ...row }) => ({
      ...row,
      costComplete: incompleteCostCount === 0,
    }));
  },
});
