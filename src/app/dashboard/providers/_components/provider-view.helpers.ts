import type { ProviderStatisticsPeriod, ProviderSummary } from "#/lib/database/provider.repository";
import { protocolOptions } from "#/lib/protocol/protocol.registry";
import { ProtocolType } from "#/lib/protocol/protocol.types";
import type { ProviderFormInput } from "../provider-form.types";
import {
  addProviderModel,
  getPublicModels,
  getTestModel,
  normalizeProviderModels,
  type ProviderModels,
} from "#/lib/provider/provider-models";

export const emptyProviderForm: ProviderFormInput = {
  name: "",
  models: {},
  testModel: "",
  testProtocol: ProtocolType.OpenaiCompatible,
  protocols: {
    [ProtocolType.OpenaiCompatible]: { endpoint: "", enabled: true },
  },
  websiteUrl: "",
  baseUrl: "",
  providerToken: "",
  costMultiplier: "1",
  pricingOverrides: "",
  enabled: true,
};

export const createProviderForm = (provider?: ProviderSummary): ProviderFormInput =>
  provider
    ? {
        name: provider.name,
        models: provider.models,
        testModel: getTestModel(provider.models, provider.testModel) ?? "",
        testProtocol: provider.testProtocol,
        protocols: provider.protocols,
        websiteUrl: provider.websiteUrl ?? "",
        baseUrl: provider.baseUrl ?? "",
        providerToken: "",
        costMultiplier: provider.costMultiplier,
        pricingOverrides: provider.pricingOverrides
          ? JSON.stringify(provider.pricingOverrides, null, 2)
          : "",
        enabled: provider.enabled,
      }
    : emptyProviderForm;

export const sortModels = (models: string[]): string[] =>
  [...models].sort((left, right) => left.localeCompare(right));

export const mergeModels = (current: ProviderModels, selected: string[]): ProviderModels =>
  selected.reduce(addProviderModel, current);

export type DiscoveredModelState = "existing" | "selected" | "available";

export const getDiscoveredModelState = (
  model: string,
  currentModels: ReadonlySet<string>,
  selectedModels: ReadonlySet<string>,
): DiscoveredModelState => {
  if (currentModels.has(model)) return "existing";
  return selectedModels.has(model) ? "selected" : "available";
};

export type ProviderOrderPlacement = "before" | "after";

export const moveProviderPriorities = (
  providers: ProviderSummary[],
  sourceId: string,
  targetId: string,
  placement: ProviderOrderPlacement,
): ProviderSummary[] => {
  if (sourceId === targetId) return providers;
  const sourceIndex = providers.findIndex(({ id }) => id === sourceId);
  const targetIndex = providers.findIndex(({ id }) => id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return providers;

  const reordered = [...providers];
  const [source] = reordered.splice(sourceIndex, 1);
  const targetIndexWithoutSource = reordered.findIndex(({ id }) => id === targetId);
  const insertionIndex = targetIndexWithoutSource + (placement === "after" ? 1 : 0);
  reordered.splice(insertionIndex, 0, source);

  if (reordered.every((provider, index) => provider.id === providers[index]?.id)) return providers;

  const orderSlots = providers.map(({ order }) => order);
  return reordered.map((provider, index) => ({ ...provider, order: orderSlots[index]! }));
};

export const toProviderFormInput = (
  form: ProviderFormInput,
  models: ProviderModels,
): ProviderFormInput => {
  const normalizedModels = normalizeProviderModels(models);
  return {
    ...form,
    models: normalizedModels,
    testModel: getTestModel(normalizedModels, form.testModel) ?? "",
  };
};

export const responseTimeBadge = (
  milliseconds: number | null,
): { label: string; className: string } => {
  if (milliseconds === null) {
    return { label: "None", className: "bg-[#f2f4f7] text-[#667085]" };
  }
  if (milliseconds < 3000) {
    return { label: `${Math.round(milliseconds)} ms`, className: "bg-[#ecfdf3] text-[#027a48]" };
  }
  if (milliseconds < 10_000) {
    return { label: `${Math.round(milliseconds)} ms`, className: "bg-[#fffaeb] text-[#b54708]" };
  }
  return { label: `${Math.round(milliseconds)} ms`, className: "bg-[#fef3f2] text-[#b42318]" };
};

export const statisticsPeriodLabels: Record<ProviderStatisticsPeriod, string> = {
  "30m": "30m",
  "1h": "1h",
  "6h": "6h",
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
  all: "all time",
};

export const firstEnabledProtocol = (provider: ProviderSummary): ProtocolType | undefined =>
  (provider.testProtocol && provider.protocols[provider.testProtocol]?.enabled
    ? provider.testProtocol
    : undefined) ?? protocolOptions.find(({ value }) => provider.protocols[value]?.enabled)?.value;

export const providerPublicModels = (models: ProviderModels): string[] => getPublicModels(models);
