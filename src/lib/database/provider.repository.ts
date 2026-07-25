import { asc, eq } from "drizzle-orm";

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

export const providers: Provider[] = [];

let providersInitialized = false;
let providersRefresh: Promise<Provider[]> | undefined;

const loadProviders = async (): Promise<Provider[]> => {
  return db.select().from(provider).orderBy(asc(provider.name));
};

export const refreshProviders = async (): Promise<Provider[]> => {
  const previousRefresh = providersRefresh;
  const currentRefresh = (async () => {
    if (previousRefresh) await previousRefresh.catch(() => undefined);
    const refreshedProviders = await loadProviders();
    providers.splice(0, providers.length, ...refreshedProviders);
    providersInitialized = true;
    return providers;
  })();

  providersRefresh = currentRefresh;
  try {
    return await currentRefresh;
  } finally {
    if (providersRefresh === currentRefresh) providersRefresh = undefined;
  }
};

export type ProviderSummary = Pick<
  ProviderRecord,
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

export type UpdateProviderInput = Omit<NewProviderRecord, "createdAt" | "updatedAt" | "token"> & {
  token?: NewProviderRecord["token"];
};

export const getProviders = async (): Promise<Provider[]> => {
  if (providersInitialized) return providers;
  return providersRefresh ?? refreshProviders();
};

export const getProviderSummaries = async (
  statisticsPeriod: ProviderStatisticsPeriod = "30m",
): Promise<ProviderSummary[]> => {
  const { getProviderStatistics } = createProviderStatisticsRepository(db);
  const [providerRecords, statistics] = await Promise.all([
    getProviders(),
    getProviderStatistics(statisticsPeriod),
  ]);
  const statisticsByProvider = new Map(statistics.map((summary) => [summary.name, summary]));

  return providerRecords.map((record) => {
    const {
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
    const providerStatistics = statisticsByProvider.get(name);
    return {
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

export const getProvider = async (name: string): Promise<Provider | undefined> => {
  return (await getProviders()).find((provider) => provider.name === name);
};

export const createProvider = async (input: CreateProviderInput): Promise<void> => {
  const models = sortModels(input.models);
  await db.insert(provider).values({
    ...input,
    models,
    testModel: getTestModel(models, input.testModel) ?? null,
  });
  await refreshProviders();
};

export const updateProvider = async (
  currentName: string,
  input: UpdateProviderInput,
): Promise<void> => {
  const models = sortModels(input.models);
  await db
    .update(provider)
    .set({
      ...input,
      models,
      testModel: getTestModel(models, input.testModel) ?? null,
      updatedAt: new Date(),
    })
    .where(eq(provider.name, currentName));
  await refreshProviders();
};

export const setProviderEnabled = async (name: string, enabled: boolean): Promise<void> => {
  await db.update(provider).set({ enabled, updatedAt: new Date() }).where(eq(provider.name, name));
  await refreshProviders();
};

export const deleteProvider = async (name: string): Promise<void> => {
  await db.delete(provider).where(eq(provider.name, name));
  await refreshProviders();
};
