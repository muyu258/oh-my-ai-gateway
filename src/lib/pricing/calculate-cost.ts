import type { ParsedUsage } from "#/lib/protocol/adapter/adapter.types";
import type { Provider } from "#/lib/provider/provider.types";
import type { PricingSource } from "#/lib/database/drizzle/schema";
import {
  multiplierSchema,
  pricingOverridesSchema,
  PRICING_FALLBACK_MODEL,
  type ModelPricing,
  type PricingCatalog,
  type Rates,
} from "./pricing.types";

export type CostStatus = "complete" | "partial" | "unavailable" | "unpriced" | "error";

export type CostSnapshot = {
  model: string;
  multiplier: string;
  rates: Rates;
};

type CostResult = {
  costMicros: number | null;
  costStatus: Exclude<CostStatus, "error">;
  costSnapshot?: CostSnapshot;
  pricingSource: PricingSource | null;
};

const DECIMAL_SCALE = BigInt(1_000_000);

const decimalToScaledInteger = (value: string): bigint => {
  const [integer, fraction = ""] = value.split(".");
  return BigInt(integer!) * DECIMAL_SCALE + BigInt(fraction.padEnd(6, "0"));
};

export const findPricingModelId = (
  requestedModel: string,
  catalog: PricingCatalog,
): string | null => {
  const matches = Object.keys(catalog).filter((modelId) => requestedModel.includes(modelId));
  if (matches.length === 0) return null;

  const longestLength = Math.max(...matches.map((modelId) => modelId.length));
  const longestMatches = matches.filter((modelId) => modelId.length === longestLength);
  return longestMatches.length === 1 ? longestMatches[0]! : null;
};

const resolveModelPricing = (
  model: string,
  provider: Provider,
  catalog: PricingCatalog,
): { model: string; pricing: ModelPricing; pricingSource: PricingSource } => {
  const overrides = pricingOverridesSchema.parse(provider.pricingOverrides ?? {});
  const overrideModel = findPricingModelId(model, overrides);
  if (overrideModel) {
    return {
      model: overrideModel,
      pricing: overrides[overrideModel]!,
      pricingSource: "provider_override",
    };
  }

  const catalogModel = findPricingModelId(model, catalog);
  if (catalogModel) {
    return {
      model: catalogModel,
      pricing: catalog[catalogModel]!,
      pricingSource: "models_dev_snapshot",
    };
  }

  return {
    model: PRICING_FALLBACK_MODEL,
    pricing: catalog[PRICING_FALLBACK_MODEL]!,
    pricingSource: "models_dev_fallback",
  };
};

const selectRates = (pricing: ModelPricing, usage: ParsedUsage): Rates => {
  const inputParts = [
    usage.inputTokens,
    usage.cacheReadInputTokens,
    usage.cacheCreationInputTokens,
  ];
  if (inputParts.some((value) => value === null)) {
    return pricing.rates;
  }

  const totalInput = inputParts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const tier = [...(pricing.tiers ?? [])]
    .reverse()
    .find(({ inputTokensAbove }) => totalInput > inputTokensAbove);
  return tier?.rates ?? pricing.rates;
};

export const calculateCost = (
  model: string,
  provider: Provider,
  usage: ParsedUsage,
  catalog: PricingCatalog,
): CostResult => {
  const multiplier = multiplierSchema.parse(provider.costMultiplier);
  if (!Object.hasOwn(provider.models, model)) {
    return {
      costMicros: null,
      costStatus: "unpriced",
      pricingSource: null,
    };
  }

  const {
    model: pricingModel,
    pricing,
    pricingSource,
  } = resolveModelPricing(model, provider, catalog);
  const rates = selectRates(pricing, usage);
  const components = {
    input: { tokens: usage.inputTokens, rate: rates.input },
    output: { tokens: usage.outputTokens, rate: rates.output },
    cacheRead: { tokens: usage.cacheReadInputTokens, rate: rates.cacheRead },
    cacheWrite: { tokens: usage.cacheCreationInputTokens, rate: rates.cacheWrite },
  };
  const knownComponents = Object.values(components).filter(
    ({ tokens, rate }) => tokens !== null && (tokens === 0 || rate !== null),
  );
  const hasKnownTokens = Object.values(components).some(({ tokens }) => tokens !== null);
  const status =
    !hasKnownTokens || knownComponents.length === 0
      ? "unavailable"
      : knownComponents.length === Object.keys(components).length
        ? "complete"
        : "partial";

  let costMicros: number | null = null;
  if (knownComponents.length > 0) {
    const multiplierScaled = decimalToScaledInteger(multiplier);
    const numerator = knownComponents.reduce(
      (sum, { tokens, rate }) =>
        sum +
        (tokens === 0
          ? BigInt(0)
          : BigInt(tokens!) * decimalToScaledInteger(rate!) * multiplierScaled),
      BigInt(0),
    );
    const denominator = DECIMAL_SCALE * DECIMAL_SCALE;
    const rounded = (numerator + denominator / BigInt(2)) / denominator;
    costMicros = Number(rounded);
    if (!Number.isSafeInteger(costMicros)) throw new Error("Calculated cost exceeds safe range.");
  }

  return {
    costMicros,
    costStatus: status,
    costSnapshot: {
      model: pricingModel,
      multiplier,
      rates,
    },
    pricingSource,
  };
};
