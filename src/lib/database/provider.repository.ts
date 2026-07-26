import { and, asc, avg, eq, gte, isNotNull, sql, sum } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type { Provider } from "#/lib/provider/provider.types";
import { getTestModel, normalizeProviderModels } from "#/lib/provider/provider-models";
import { protocolTypes } from "#/lib/protocol/protocol.registry";
import type { ProtocolType } from "#/lib/protocol/protocol.types";
import { db, sqlite } from "./drizzle/client";
import { provider, usage, type NewProviderRecord, type ProviderRecord } from "./drizzle/schema";
import {
  insertProviderWithNextOrder,
  moveProviderOrderInDatabase,
  type ProviderOrderPlacement,
} from "./provider-priority.repository";

export type ProviderStatisticsPeriod = "30m" | "1h" | "6h" | "24h" | "7d" | "30d" | "all";

const periodInMilliseconds: Partial<Record<ProviderStatisticsPeriod, number>> = {
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const getTestProtocol = (
  protocols: Provider["protocols"],
  requested: ProtocolType | null | undefined,
): ProtocolType | null =>
  (requested && protocols[requested]?.enabled ? requested : undefined) ??
  protocolTypes.find((protocol) => protocols[protocol]?.enabled) ??
  null;

export type ProviderSummary = Pick<
  ProviderRecord,
  | "id"
  | "name"
  | "order"
  | "models"
  | "testModel"
  | "testProtocol"
  | "protocols"
  | "websiteUrl"
  | "baseUrl"
  | "enabled"
  | "costMultiplier"
  | "pricingOverrides"
  | "updatedAt"
> & {
  averageResponseTimeMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadInputTokens: number | null;
  costMicros: number | null;
  costComplete: boolean;
};

type CreateProviderInput = Omit<NewProviderRecord, "order">;

type UpdateProviderInput = Omit<
  NewProviderRecord,
  "id" | "order" | "createdAt" | "updatedAt" | "token"
> & {
  token?: NewProviderRecord["token"];
};

export const getProviders = async (): Promise<Provider[]> => {
  "use cache";
  cacheTag("providers");
  cacheLife("max");
  return db.select().from(provider).orderBy(asc(provider.order));
};

const getProviderStatistics = async (period: ProviderStatisticsPeriod) => {
  const duration = periodInMilliseconds[period];
  const rows = await db
    .select({
      providerId: usage.providerId,
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
        duration ? gte(usage.startAt, new Date(Date.now() - duration)) : undefined,
        isNotNull(usage.providerId),
      ),
    )
    .groupBy(usage.providerId);

  return rows.map(({ incompleteCostCount, providerId, ...row }) => ({
    providerId: providerId!,
    ...row,
    costComplete: incompleteCostCount === 0,
  }));
};

export const getProviderSummaries = async (
  statisticsPeriod: ProviderStatisticsPeriod = "30m",
): Promise<ProviderSummary[]> => {
  const [providerRecords, statistics] = await Promise.all([
    getProviders(),
    getProviderStatistics(statisticsPeriod),
  ]);
  const statisticsByProvider = new Map(statistics.map((summary) => [summary.providerId, summary]));

  return providerRecords.map((record) => {
    const {
      id,
      name,
      order,
      models,
      testModel,
      testProtocol,
      protocols,
      websiteUrl,
      baseUrl,
      enabled,
      costMultiplier,
      pricingOverrides,
      updatedAt,
    } = record;
    const providerStatistics = statisticsByProvider.get(id);
    return {
      id,
      name,
      order,
      models,
      testModel,
      testProtocol,
      protocols,
      websiteUrl,
      baseUrl,
      enabled,
      costMultiplier,
      pricingOverrides,
      updatedAt,
      averageResponseTimeMs: providerStatistics?.averageResponseTimeMs ?? null,
      inputTokens: providerStatistics?.inputTokens ?? null,
      outputTokens: providerStatistics?.outputTokens ?? null,
      cacheReadInputTokens: providerStatistics?.cacheReadInputTokens ?? null,
      costMicros: providerStatistics?.costMicros ?? null,
      costComplete: providerStatistics?.costComplete ?? true,
    };
  });
};

export const getProvider = async (id: string): Promise<Provider | undefined> => {
  return (await getProviders()).find((provider) => provider.id === id);
};

export const createProvider = async (input: CreateProviderInput): Promise<string> => {
  const models = normalizeProviderModels(input.models);
  const createdAt = input.createdAt instanceof Date ? input.createdAt : new Date();
  const updatedAt = input.updatedAt instanceof Date ? input.updatedAt : createdAt;
  return insertProviderWithNextOrder(sqlite, [
    input.id ?? crypto.randomUUID(),
    input.name,
    JSON.stringify(models),
    getTestModel(models, input.testModel),
    getTestProtocol(input.protocols, input.testProtocol),
    JSON.stringify(input.protocols),
    input.websiteUrl ?? null,
    input.baseUrl ?? null,
    input.token,
    (input.enabled ?? true) ? 1 : 0,
    input.costMultiplier ?? "1",
    input.pricingOverrides ? JSON.stringify(input.pricingOverrides) : null,
    createdAt.getTime(),
    updatedAt.getTime(),
  ]);
};

export const updateProvider = async (id: string, input: UpdateProviderInput): Promise<void> => {
  const models = normalizeProviderModels(input.models);
  await db
    .update(provider)
    .set({
      ...input,
      models,
      testModel: getTestModel(models, input.testModel),
      testProtocol: getTestProtocol(input.protocols, input.testProtocol),
      updatedAt: new Date(),
    })
    .where(eq(provider.id, id));
};

export const setProviderEnabled = async (id: string, enabled: boolean): Promise<void> => {
  await db.update(provider).set({ enabled, updatedAt: new Date() }).where(eq(provider.id, id));
};

export const deleteProvider = async (id: string): Promise<void> => {
  await db.delete(provider).where(eq(provider.id, id));
};

export const moveProviderOrder = async (
  sourceId: string,
  targetId: string,
  placement: ProviderOrderPlacement,
): Promise<void> => {
  moveProviderOrderInDatabase(sqlite, sourceId, targetId, placement);
};
