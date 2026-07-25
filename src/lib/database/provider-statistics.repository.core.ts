import { and, avg, gte, isNotNull } from "drizzle-orm";
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
  getAverageResponseTimes: async (
    period: ProviderStatisticsPeriod,
    now = new Date(),
  ): Promise<Array<{ name: string | null; averageResponseTimeMs: number }>> => {
    const duration = periodInMilliseconds[period];
    return database
      .select({
        name: usage.name,
        averageResponseTimeMs: avg(usage.timeToFirstByteMs).mapWith(Number),
      })
      .from(usage)
      .where(
        and(
          duration ? gte(usage.startAt, new Date(now.getTime() - duration)) : undefined,
          isNotNull(usage.name),
          isNotNull(usage.timeToFirstByteMs),
        ),
      )
      .groupBy(usage.name);
  },
});
