import type { ProviderStatisticsPeriod, ProviderSummary } from "#/lib/database/provider.repository";
import { protocolOptions } from "#/lib/protocol/protocol.registry";
import { ProtocolType } from "#/lib/protocol/protocol.types";
import type { ProviderFormInput } from "../provider-form.types";

export const emptyProviderForm: ProviderFormInput = {
  name: "",
  models: [],
  testModel: "",
  protocols: {
    [ProtocolType.OpenaiCompatible]: { endpoint: "", enabled: true },
  },
  websiteUrl: "",
  baseUrl: "",
  providerToken: "",
  costMultiplier: "1",
  pricingOverrides: "{}",
  enabled: true,
};

export const createProviderForm = (provider?: ProviderSummary): ProviderFormInput =>
  provider
    ? {
        name: provider.name,
        models: provider.models,
        testModel: provider.testModel ?? provider.models[0] ?? "",
        protocols: provider.protocols,
        websiteUrl: provider.websiteUrl ?? "",
        baseUrl: provider.baseUrl ?? "",
        providerToken: "",
        costMultiplier: provider.costMultiplier,
        pricingOverrides: JSON.stringify(provider.pricingOverrides, null, 2),
        enabled: provider.enabled,
      }
    : emptyProviderForm;

export const sortModels = (models: string[]): string[] =>
  [...models].sort((left, right) => left.localeCompare(right));

export const mergeModels = (current: string[], selected: string[]): string[] =>
  sortModels([...new Set([...current, ...selected])]);

export const toProviderFormInput = (
  form: ProviderFormInput,
  models: string[],
): ProviderFormInput => {
  const sortedModels = sortModels(models);
  return {
    ...form,
    models: sortedModels,
    testModel: sortedModels.includes(form.testModel) ? form.testModel : (sortedModels[0] ?? ""),
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
  protocolOptions.find(({ value }) => provider.protocols[value]?.enabled)?.value;
