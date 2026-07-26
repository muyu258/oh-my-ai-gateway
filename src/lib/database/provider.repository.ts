import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type { Provider } from "#/lib/provider/provider.types";
import { db } from "./drizzle/client";
import { provider, type NewProviderRecord, type ProviderRecord } from "./drizzle/schema";
import {
  createProviderStatisticsRepository,
  type ProviderStatisticsPeriod,
} from "./provider-statistics.repository.core";

export type { ProviderStatisticsPeriod } from "./provider-statistics.repository.core";

const sortModels = (models: string[]): string[] =>
  models.sort((left, right) => left.localeCompare(right));
const getTestModel = (
  models: string[],
  testModel: string | null | undefined,
): string | undefined => (testModel && models.includes(testModel) ? testModel : models[0]);

const loadProviders = async (): Promise<Provider[]> => {
  return db.select().from(provider).orderBy(asc(provider.name));
};

export type ProviderSummary = Pick<
  ProviderRecord,
  | "id"
  | "name"
  | "models"
  | "testModel"
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

export type CreateProviderInput = NewProviderRecord;

export type UpdateProviderInput = Omit<
  NewProviderRecord,
  "id" | "createdAt" | "updatedAt" | "token"
> & {
  token?: NewProviderRecord["token"];
};

export const getProviders = async (): Promise<Provider[]> => {
  "use cache";
  cacheTag("providers");
  cacheLife("max");
  return loadProviders();
};

export const getProviderSummaries = async (
  statisticsPeriod: ProviderStatisticsPeriod = "30m",
): Promise<ProviderSummary[]> => {
  const { getProviderStatistics } = createProviderStatisticsRepository(db);
  const [providerRecords, statistics] = await Promise.all([
    getProviders(),
    getProviderStatistics(statisticsPeriod),
  ]);
  const statisticsByProvider = new Map(statistics.map((summary) => [summary.providerId, summary]));

  return providerRecords.map((record) => {
    const {
      id,
      name,
      models,
      testModel,
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
      models,
      testModel,
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

export const createProvider = async (input: CreateProviderInput): Promise<void> => {
  const models = sortModels(input.models);
  await db.insert(provider).values({
    ...input,
    models,
    testModel: getTestModel(models, input.testModel) ?? null,
  });
};

export const updateProvider = async (id: string, input: UpdateProviderInput): Promise<void> => {
  const models = sortModels(input.models);
  await db
    .update(provider)
    .set({
      ...input,
      models,
      testModel: getTestModel(models, input.testModel) ?? null,
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
