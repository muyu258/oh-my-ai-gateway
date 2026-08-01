export const usageStatusFilters = ["all", "success", "error"] as const;
export const usagePeriodFilters = ["24h", "7d", "30d", "all"] as const;
export const usageStreamFilters = ["all", "stream", "nonStream"] as const;
export const usagePricingSourceFilters = [
  "all",
  "provider_override",
  "models_dev_snapshot",
  "models_dev_fallback",
  "global_catalog",
  "global_fallback",
  "unknown",
] as const;

export type UsageStatusFilter = (typeof usageStatusFilters)[number];
export type UsagePeriodFilter = (typeof usagePeriodFilters)[number];
export type UsageStreamFilter = (typeof usageStreamFilters)[number];
export type UsagePricingSourceFilter = (typeof usagePricingSourceFilters)[number];

const includes = <Values extends readonly string[]>(
  values: Values,
  value: string | undefined,
): value is Values[number] => value !== undefined && values.includes(value);

export const isUsageStatusFilter = (value: string | undefined): value is UsageStatusFilter =>
  includes(usageStatusFilters, value);

export const isUsagePeriodFilter = (value: string | undefined): value is UsagePeriodFilter =>
  includes(usagePeriodFilters, value);

export const isUsageStreamFilter = (value: string | undefined): value is UsageStreamFilter =>
  includes(usageStreamFilters, value);

export const isUsagePricingSourceFilter = (
  value: string | undefined,
): value is UsagePricingSourceFilter => includes(usagePricingSourceFilters, value);

export type UsageFilters = {
  model?: string;
  client?: string;
  protocolType?: string;
  stream: UsageStreamFilter;
  status: UsageStatusFilter;
  period: UsagePeriodFilter;
  pricingSource: UsagePricingSourceFilter;
};
