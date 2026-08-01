import { describe, expect, test } from "bun:test";

import type { ParsedUsage } from "#/lib/protocol/adapter/adapter.types";
import { ProtocolType } from "#/lib/protocol/protocol.types";
import type { Provider } from "#/lib/provider/provider.types";
import { calculateCost, findPricingModelId } from "../calculate-cost";
import type { ModelPricing, PricingCatalog } from "../pricing.types";

const model = "test-model";
const pricing = (input: string, output = input): ModelPricing => ({
  rates: { input, output, cacheRead: input, cacheWrite: input },
});
const catalog: PricingCatalog = {
  "gpt-5": pricing("1"),
  "gpt-5.6-sol": {
    rates: { input: "5", output: "30", cacheRead: "0.5", cacheWrite: "6.25" },
  },
};
const provider: Provider = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test provider",
  order: 1,
  models: { [model]: { aliases: ["alias-model"] } },
  testModel: model,
  testProtocol: ProtocolType.OpenaiCompatible,
  protocols: { [ProtocolType.OpenaiCompatible]: { endpoint: "", enabled: true } },
  websiteUrl: null,
  baseUrl: null,
  token: "secret",
  enabled: true,
  costMultiplier: "1",
  pricingOverrides: { [model]: pricing("1", "3") },
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const usage = (inputTokens: number): ParsedUsage => ({
  inputTokens,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
});

describe("pricing model matching", () => {
  test("selects the longest unique case-sensitive match", () => {
    expect(findPricingModelId("provider/openai/gpt-5.6-sol", catalog)).toBe("gpt-5.6-sol");
    expect(findPricingModelId("GPT-5.6-SOL", catalog)).toBeNull();
    expect(
      findPricingModelId("vendor-a/vendor-b", {
        ...catalog,
        "vendor-a": pricing("1"),
        "vendor-b": pricing("2"),
      }),
    ).toBeNull();
  });

  test("uses overrides before catalog matches and falls back for missing or ambiguous matches", () => {
    const configured = (upstreamModel: string, pricingOverrides: Provider["pricingOverrides"]) => ({
      ...provider,
      models: { [upstreamModel]: { aliases: [] } },
      pricingOverrides,
    });

    const overridden = calculateCost(
      "provider/gpt-5.6-sol",
      configured("provider/gpt-5.6-sol", { "gpt-5": pricing("9") }),
      usage(1),
      catalog,
    );
    expect(overridden).toMatchObject({
      costMicros: 9,
      pricingSource: "provider_override",
      costSnapshot: { model: "gpt-5" },
    });

    const catalogMatch = calculateCost(
      "provider/gpt-5.6-sol",
      configured("provider/gpt-5.6-sol", null),
      usage(1),
      catalog,
    );
    expect(catalogMatch).toMatchObject({
      costMicros: 5,
      pricingSource: "models_dev_snapshot",
      costSnapshot: { model: "gpt-5.6-sol" },
    });

    for (const upstreamModel of ["unknown", "vendor-a/vendor-b", "GPT-5.6-SOL"]) {
      const result = calculateCost(upstreamModel, configured(upstreamModel, null), usage(1), {
        ...catalog,
        "vendor-a": pricing("1"),
        "vendor-b": pricing("2"),
      });
      expect(result).toMatchObject({
        costMicros: 5,
        pricingSource: "models_dev_fallback",
        costSnapshot: { model: "gpt-5.6-sol" },
      });
    }
  });
});

describe("calculateCost", () => {
  test("applies the multiplier and stores only the selected model, multiplier, and rates", () => {
    expect(calculateCost(model, { ...provider, costMultiplier: "2" }, usage(3), catalog)).toEqual({
      costMicros: 6,
      costStatus: "complete",
      pricingSource: "provider_override",
      costSnapshot: {
        model,
        multiplier: "2",
        rates: pricing("1", "3").rates,
      },
    });
  });

  test("leaves an invalid upstream model unpriced", () => {
    expect(calculateCost("not-configured", provider, usage(1), catalog)).toEqual({
      costMicros: null,
      costStatus: "unpriced",
      pricingSource: null,
    });
  });

  test("selects a tier from total input tokens and prices the entire request with it", () => {
    const tieredProvider = {
      ...provider,
      pricingOverrides: {
        [model]: {
          ...pricing("1"),
          tiers: [{ inputTokensAbove: 10, rates: pricing("2").rates }],
        },
      },
    };
    expect(calculateCost(model, tieredProvider, usage(10), catalog).costMicros).toBe(10);
    const tiered = calculateCost(model, tieredProvider, usage(11), catalog);
    expect(tiered.costMicros).toBe(22);
    expect(tiered.costSnapshot!.rates.input).toBe("2");
  });

  test("prices all components and rounds half-up once", () => {
    expect(
      calculateCost(
        model,
        provider,
        {
          inputTokens: 1,
          outputTokens: 2,
          cacheReadInputTokens: 3,
          cacheCreationInputTokens: 4,
        },
        catalog,
      ).costMicros,
    ).toBe(14);

    const fractional = {
      ...provider,
      models: { fractions: { aliases: [] } },
      pricingOverrides: { fractions: pricing("0.25") },
    };
    expect(
      calculateCost(
        "fractions",
        fractional,
        {
          inputTokens: 1,
          outputTokens: 1,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
        },
        catalog,
      ).costMicros,
    ).toBe(1);
  });

  test("distinguishes partial, unavailable, and explicit zero usage", () => {
    expect(
      calculateCost(
        model,
        provider,
        {
          inputTokens: 1,
          outputTokens: null,
          cacheReadInputTokens: null,
          cacheCreationInputTokens: null,
        },
        catalog,
      ),
    ).toMatchObject({ costMicros: 1, costStatus: "partial" });

    expect(
      calculateCost(
        model,
        provider,
        {
          inputTokens: null,
          outputTokens: null,
          cacheReadInputTokens: null,
          cacheCreationInputTokens: null,
        },
        catalog,
      ),
    ).toMatchObject({ costMicros: null, costStatus: "unavailable" });
    expect(calculateCost(model, provider, usage(0), catalog)).toMatchObject({
      costMicros: 0,
      costStatus: "complete",
    });
  });

  test("keeps missing cache rates unknown while zero-token components remain free", () => {
    const cacheProvider = {
      ...provider,
      models: { cache: { aliases: [] } },
      pricingOverrides: {
        cache: {
          rates: { input: "1", output: "2", cacheRead: null, cacheWrite: null },
        },
      },
    };
    expect(
      calculateCost(
        "cache",
        cacheProvider,
        {
          inputTokens: 2,
          outputTokens: 0,
          cacheReadInputTokens: 3,
          cacheCreationInputTokens: 0,
        },
        catalog,
      ),
    ).toMatchObject({ costMicros: 2, costStatus: "partial" });
    expect(
      calculateCost(
        "cache",
        cacheProvider,
        {
          inputTokens: 2,
          outputTokens: 0,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
        },
        catalog,
      ),
    ).toMatchObject({ costMicros: 2, costStatus: "complete" });
  });
});
