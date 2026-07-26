"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { getConfiguredGatewayToken } from "#/lib/auth/auth";
import {
  createProvider,
  deleteProvider,
  getProvider,
  setProviderEnabled,
  moveProviderOrder,
  updateProvider,
} from "#/lib/database/provider.repository";
import { discoverProviderModels, testProviderProtocol } from "#/lib/provider/provider-discovery";
import { ProtocolType } from "#/lib/protocol/protocol.types";
import { multiplierSchema, pricingOverridesSchema } from "#/lib/pricing/pricing.types";
import type {
  ProviderActionResult,
  CreateProviderActionResult,
  ProviderConnectionResult,
  ProviderFormInput,
  ProviderTestResult,
} from "./provider-form.types";

const nameSchema = z.string().trim().min(1, "Name is required.");
const providerIdSchema = z.uuid("Invalid provider ID.");
const providerOrderPlacementSchema = z.enum(["before", "after"]);

const invalidateProviders = (): void => {
  updateTag("providers");
  revalidatePath("/dashboard/providers");
};

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
  costMultiplier: multiplierSchema,
  pricingOverrides: pricingOverridesSchema,
});

const parsePricingOverrides = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Pricing overrides must be valid JSON.");
  }
};

const normalizeInput = (input: ProviderFormInput) => {
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
    costMultiplier: input.costMultiplier.trim(),
    pricingOverrides: parsePricingOverrides(input.pricingOverrides),
  };
};

const errorResult = (error: unknown): Extract<ProviderActionResult, { ok: false }> => {
  if (error instanceof z.ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "Invalid provider configuration." };
  }

  if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
    return { ok: false, error: "A provider with this name already exists." };
  }

  if (error instanceof Error && error.message === "Pricing overrides must be valid JSON.") {
    return { ok: false, error: error.message };
  }

  console.error("Provider configuration update failed", error);
  return { ok: false, error: "The provider configuration could not be saved." };
};

export const createProviderAction = async (
  input: ProviderFormInput,
): Promise<CreateProviderActionResult> => {
  try {
    const parsed = providerSchema
      .extend({ providerToken: z.string().min(1, "API token is required.") })
      .parse(normalizeInput(input));
    const { providerToken, ...provider } = parsed;
    const providerId = await createProvider({
      ...provider,
      token: providerToken,
      websiteUrl: parsed.websiteUrl || null,
      baseUrl: parsed.baseUrl || null,
    });
    invalidateProviders();
    return { ok: true, providerId };
  } catch (error) {
    return errorResult(error);
  }
};

export const updateProviderAction = async (
  providerId: string,
  input: ProviderFormInput,
): Promise<ProviderActionResult> => {
  try {
    const id = providerIdSchema.parse(providerId);
    const parsed = providerSchema.parse(normalizeInput(input));
    await updateProvider(id, {
      name: parsed.name,
      models: parsed.models,
      testModel: parsed.testModel,
      protocols: parsed.protocols,
      websiteUrl: parsed.websiteUrl || null,
      baseUrl: parsed.baseUrl || null,
      token: parsed.providerToken || undefined,
      enabled: parsed.enabled,
      costMultiplier: parsed.costMultiplier,
      pricingOverrides: parsed.pricingOverrides,
    });
    invalidateProviders();
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
};

export const discoverProviderModelsAction = async (
  providerId: string,
  protocol: ProtocolType,
): Promise<ProviderConnectionResult> => {
  try {
    const id = providerIdSchema.parse(providerId);
    const protocolType = z.enum(ProtocolType).parse(protocol);
    const configuredProvider = await getProvider(id);
    if (!configuredProvider) return { ok: false, error: "Provider not found." };

    const result = await discoverProviderModels(configuredProvider, protocolType);
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: "The provider connection could not be tested." };
  }
};

export const testProviderProtocolAction = async (
  providerId: string,
  protocol: ProtocolType,
): Promise<ProviderTestResult> => {
  try {
    const id = providerIdSchema.parse(providerId);
    const protocolType = z.enum(ProtocolType).parse(protocol);
    const configuredProvider = await getProvider(id);
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
  providerId: string,
  enabled: boolean,
): Promise<ProviderActionResult> => {
  try {
    await setProviderEnabled(providerIdSchema.parse(providerId), enabled);
    invalidateProviders();
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
};

export const deleteProviderAction = async (providerId: string): Promise<ProviderActionResult> => {
  try {
    await deleteProvider(providerIdSchema.parse(providerId));
    invalidateProviders();
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
};

export const moveProviderOrderAction = async (
  sourceProviderId: string,
  targetProviderId: string,
  placement: "before" | "after",
): Promise<ProviderActionResult> => {
  try {
    const [sourceId, targetId, parsedPlacement] = z
      .tuple([providerIdSchema, providerIdSchema, providerOrderPlacementSchema])
      .parse([sourceProviderId, targetProviderId, placement]);
    await moveProviderOrder(sourceId, targetId, parsedPlacement);
    invalidateProviders();
    return { ok: true };
  } catch (error) {
    console.error("Provider priority update failed", error);
    return { ok: false, error: "The provider priority could not be saved." };
  }
};
