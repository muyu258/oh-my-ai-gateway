import { and, asc, avg, eq, gte, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { ProtocolType } from "#/infra/gateway/protocol/protocol.types";
import type { Provider } from "#/infra/gateway/provider/provider.types";
import { db } from "./drizzle/client";
import { provider, requestRecord } from "./drizzle/schema";

const protocolsSchema = z.array(z.enum(ProtocolType));
const protocolEndpointsSchema = z.partialRecord(z.enum(ProtocolType), z.string());

export type ProviderSummary = {
  name: string;
  models: string[];
  protocols: ProtocolType[];
  protocolEndpoints: Partial<Record<ProtocolType, string>>;
  websiteUrl: string | null;
  baseUrl: string | null;
  enabled: boolean;
  averageResponseTimeMs: number | null;
  updatedAt: Date;
};

export type CreateProviderInput = Omit<Provider, "models" | "protocols"> & {
  models: string[];
  protocols: ProtocolType[];
};

export type UpdateProviderInput = Omit<CreateProviderInput, "providerToken"> & {
  providerToken?: string;
};

export const getProviders = async (): Promise<Provider[]> => {
  const records = await db.select().from(provider).orderBy(asc(provider.name));

  return records.map((record) => ({
    name: record.name,
    models: record.models,
    protocols: protocolsSchema.parse(record.protocols),
    protocolEndpoints: protocolEndpointsSchema.parse(record.protocolEndpoints),
    websiteUrl: record.websiteUrl ?? undefined,
    baseUrl: record.baseUrl ?? undefined,
    providerToken: record.providerToken,
    enabled: record.enabled,
  }));
};

export const getProviderSummaries = async (): Promise<ProviderSummary[]> => {
  const [records, responseTimeAverages] = await Promise.all([
    db
      .select({
        name: provider.name,
        models: provider.models,
        protocols: provider.protocols,
        protocolEndpoints: provider.protocolEndpoints,
        websiteUrl: provider.websiteUrl,
        baseUrl: provider.baseUrl,
        enabled: provider.enabled,
        updatedAt: provider.updatedAt,
      })
      .from(provider)
      .orderBy(asc(provider.name)),
    db
      .select({
        name: requestRecord.name,
        averageResponseTimeMs: avg(requestRecord.timeToFirstByteMs).mapWith(Number),
      })
      .from(requestRecord)
      .where(
        and(
          gte(requestRecord.startAt, new Date(Date.now() - 30 * 60 * 1000)),
          isNotNull(requestRecord.name),
          isNotNull(requestRecord.timeToFirstByteMs),
        ),
      )
      .groupBy(requestRecord.name),
  ]);
  const averageByProvider = new Map(
    responseTimeAverages.map(({ name, averageResponseTimeMs }) => [name, averageResponseTimeMs]),
  );

  return records.map((record) => ({
    ...record,
    protocols: protocolsSchema.parse(record.protocols),
    protocolEndpoints: protocolEndpointsSchema.parse(record.protocolEndpoints),
    averageResponseTimeMs: averageByProvider.get(record.name) ?? null,
  }));
};

export const getProvider = async (name: string): Promise<Provider | undefined> => {
  const record = await db.query.provider.findFirst({ where: eq(provider.name, name) });
  if (!record) return undefined;

  return {
    name: record.name,
    models: record.models,
    protocols: protocolsSchema.parse(record.protocols),
    protocolEndpoints: protocolEndpointsSchema.parse(record.protocolEndpoints),
    websiteUrl: record.websiteUrl ?? undefined,
    baseUrl: record.baseUrl ?? undefined,
    providerToken: record.providerToken,
    enabled: record.enabled,
  };
};

export const createProvider = async (input: CreateProviderInput): Promise<void> => {
  await db.insert(provider).values(input);
};

export const updateProvider = async (
  currentName: string,
  input: UpdateProviderInput,
): Promise<void> => {
  await db
    .update(provider)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(provider.name, currentName));
};

export const setProviderEnabled = async (name: string, enabled: boolean): Promise<void> => {
  await db.update(provider).set({ enabled, updatedAt: new Date() }).where(eq(provider.name, name));
};

export const deleteProvider = async (name: string): Promise<void> => {
  await db.delete(provider).where(eq(provider.name, name));
};
