import { and, asc, avg, eq, gte, isNotNull } from "drizzle-orm";

import type { Provider } from "#/infra/gateway/provider/provider.types";
import { db } from "./drizzle/client";
import {
  provider,
  requestRecord,
  type NewProviderRecord,
  type ProviderRecord,
} from "./drizzle/schema";

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
  "name" | "models" | "testModel" | "protocols" | "websiteUrl" | "baseUrl" | "enabled" | "updatedAt"
> & {
  averageResponseTimeMs: number | null;
};

export type ProviderResponseTimePeriod = "30m" | "1h" | "6h" | "24h" | "7d" | "30d" | "all";

const responseTimePeriodInMilliseconds: Partial<Record<ProviderResponseTimePeriod, number>> = {
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
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
  responseTimePeriod: ProviderResponseTimePeriod = "30m",
): Promise<ProviderSummary[]> => {
  const responseTimePeriodMs = responseTimePeriodInMilliseconds[responseTimePeriod];
  const [providerRecords, responseTimeAverages] = await Promise.all([
    getProviders(),
    db
      .select({
        name: requestRecord.name,
        averageResponseTimeMs: avg(requestRecord.timeToFirstByteMs).mapWith(Number),
      })
      .from(requestRecord)
      .where(
        and(
          responseTimePeriodMs
            ? gte(requestRecord.startAt, new Date(Date.now() - responseTimePeriodMs))
            : undefined,
          isNotNull(requestRecord.name),
          isNotNull(requestRecord.timeToFirstByteMs),
        ),
      )
      .groupBy(requestRecord.name),
  ]);
  const averageByProvider = new Map(
    responseTimeAverages.map(({ name, averageResponseTimeMs }) => [name, averageResponseTimeMs]),
  );

  return providerRecords.map((record) => {
    const { name, models, testModel, protocols, websiteUrl, baseUrl, enabled, updatedAt } = record;
    return {
      name,
      models,
      testModel,
      protocols,
      websiteUrl,
      baseUrl,
      enabled,
      updatedAt,
      averageResponseTimeMs: averageByProvider.get(name) ?? null,
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
