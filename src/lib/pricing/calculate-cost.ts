import type { ParsedUsage } from "#/lib/protocol/adapter/adapter.types";
import type { Provider } from "#/lib/provider/provider.types";
import { pricingCatalog } from "./catalog";
import {
  multiplierSchema,
  pricingOverridesSchema,
  type ModelPricing,
  type Rates,
} from "./pricing.types";

export type CostStatus = "complete" | "partial" | "unavailable" | "error";

export type CostSnapshot = {
  multiplier: string;
  rates: Rates;
};

type CostResult = {
  costMicros: number | null;
  costStatus: Exclude<CostStatus, "error">;
  costSnapshot: CostSnapshot;
};

const DECIMAL_SCALE = BigInt(1_000_000);

const decimalToScaledInteger = (value: string): bigint => {
  const [integer, fraction = ""] = value.split(".");
  return BigInt(integer!) * DECIMAL_SCALE + BigInt(fraction.padEnd(6, "0"));
};

const resolveModelPricing = (model: string, provider: Provider): ModelPricing => {
  const overrides = pricingOverridesSchema.parse(provider.pricingOverrides);
  return (
    overrides[model] ??
    pricingCatalog.models[model] ??
    pricingCatalog.models[pricingCatalog.fallbackModel]!
  );
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
): CostResult => {
  const multiplier = multiplierSchema.parse(provider.costMultiplier);
  const pricing = resolveModelPricing(model, provider);
  const rates = selectRates(pricing, usage);
  const components = {
    input: { tokens: usage.inputTokens, rate: rates.input },
    output: { tokens: usage.outputTokens, rate: rates.output },
    cacheRead: { tokens: usage.cacheReadInputTokens, rate: rates.cacheRead },
    cacheWrite: { tokens: usage.cacheCreationInputTokens, rate: rates.cacheWrite },
  };
  const knownComponents = Object.values(components).filter(({ tokens }) => tokens !== null);
  const status =
    knownComponents.length === 0
      ? "unavailable"
      : knownComponents.length === Object.keys(components).length
        ? "complete"
        : "partial";

  let costMicros: number | null = null;
  if (knownComponents.length > 0) {
    const multiplierScaled = decimalToScaledInteger(multiplier);
    const numerator = knownComponents.reduce(
      (sum, { tokens, rate }) =>
        sum + BigInt(tokens!) * decimalToScaledInteger(rate) * multiplierScaled,
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
      multiplier,
      rates,
    },
  };
};
