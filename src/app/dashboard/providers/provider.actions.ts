"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { getConfiguredGatewayToken } from "#/lib/auth/auth";
import {
  createProvider,
  deleteProvider,
  getProvider,
  setProviderEnabled,
  updateProvider,
} from "#/lib/database/provider.repository";
import { discoverProviderModels, testProviderProtocol } from "#/lib/provider/provider-discovery";
import { ProtocolType } from "#/lib/protocol/protocol.types";
import type {
  ProviderActionResult,
  ProviderConnectionResult,
  ProviderFormInput,
  ProviderTestResult,
} from "./provider-form.types";

const nameSchema = z.string().trim().min(1, "Name is required.");

const getGatewayBaseUrl = async (): Promise<string> => {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) throw new Error("Unable to determine the gateway URL.");

  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
};

const providerSchema = z.object({
  name: nameSchema,
  models: z.array(z.string().trim().min(1)).min(1, "Add at least one model."),
  testModel: z.string().trim().min(1, "Select a test model."),
  protocols: z.partialRecord(
    z.enum(ProtocolType),
    z.object({
      endpoint: z.string().trim().max(2048, "Endpoint is too long."),
      enabled: z.boolean(),
    }),
  ),
  websiteUrl: z.union([z.literal(""), z.url("Enter a valid website URL.")]),
  baseUrl: z.union([z.literal(""), z.url("Enter a valid base URL.")]),
  providerToken: z.string(),
  enabled: z.boolean(),
});

const normalizeInput = (input: ProviderFormInput): ProviderFormInput => {
  const models = [...new Set(input.models.map((model) => model.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right),
  );
  const requestedTestModel = input.testModel.trim();

  return {
    ...input,
    name: input.name.trim(),
    models,
    testModel: models.includes(requestedTestModel) ? requestedTestModel : (models[0] ?? ""),
    protocols: Object.fromEntries(
      Object.entries(input.protocols).map(([protocol, config]) => [
        protocol,
        { ...config, endpoint: config.endpoint.trim() },
      ]),
    ),
    websiteUrl: input.websiteUrl.trim(),
    baseUrl: input.baseUrl.trim(),
    providerToken: input.providerToken.trim(),
  };
};

const errorResult = (error: unknown): ProviderActionResult => {
  if (error instanceof z.ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "Invalid provider configuration." };
  }

  if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
    return { ok: false, error: "A provider with this name already exists." };
  }

  console.error("Provider configuration update failed", error);
  return { ok: false, error: "The provider configuration could not be saved." };
};

export const createProviderAction = async (
  input: ProviderFormInput,
): Promise<ProviderActionResult> => {
  try {
    const parsed = providerSchema
      .extend({ providerToken: z.string().min(1, "API token is required.") })
      .parse(normalizeInput(input));
    const { providerToken, ...provider } = parsed;
    await createProvider({
      ...provider,
      token: providerToken,
      websiteUrl: parsed.websiteUrl || null,
      baseUrl: parsed.baseUrl || null,
    });
    revalidatePath("/dashboard/providers");
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
};

export const updateProviderAction = async (
  currentName: string,
  input: ProviderFormInput,
): Promise<ProviderActionResult> => {
  try {
    const existingName = nameSchema.parse(currentName);
    const parsed = providerSchema.parse(normalizeInput(input));
    await updateProvider(existingName, {
      name: parsed.name,
      models: parsed.models,
      testModel: parsed.testModel,
      protocols: parsed.protocols,
      websiteUrl: parsed.websiteUrl || null,
      baseUrl: parsed.baseUrl || null,
      token: parsed.providerToken || undefined,
      enabled: parsed.enabled,
    });
    revalidatePath("/dashboard/providers");
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
};

export const discoverProviderModelsAction = async (
  name: string,
  protocol: ProtocolType,
): Promise<ProviderConnectionResult> => {
  try {
    const providerName = nameSchema.parse(name);
    const protocolType = z.enum(ProtocolType).parse(protocol);
    const configuredProvider = await getProvider(providerName);
    if (!configuredProvider) return { ok: false, error: "Provider not found." };

    const result = await discoverProviderModels(configuredProvider, protocolType);
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: "The provider connection could not be tested." };
  }
};

export const testProviderProtocolAction = async (
  name: string,
  protocol: ProtocolType,
): Promise<ProviderTestResult> => {
  try {
    const providerName = nameSchema.parse(name);
    const protocolType = z.enum(ProtocolType).parse(protocol);
    const configuredProvider = await getProvider(providerName);
    if (!configuredProvider) return { ok: false, error: "Provider not found." };

    const result = await testProviderProtocol(configuredProvider, protocolType, {
      baseUrl: await getGatewayBaseUrl(),
      token: getConfiguredGatewayToken(),
    });
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: "The provider connection could not be tested." };
  }
};

export const toggleProviderAction = async (
  name: string,
  enabled: boolean,
): Promise<ProviderActionResult> => {
  try {
    await setProviderEnabled(nameSchema.parse(name), enabled);
    revalidatePath("/dashboard/providers");
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
};

export const deleteProviderAction = async (name: string): Promise<ProviderActionResult> => {
  try {
    await deleteProvider(nameSchema.parse(name));
    revalidatePath("/dashboard/providers");
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
};
