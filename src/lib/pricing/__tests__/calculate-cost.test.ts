import { describe, expect, test } from "bun:test";

import type { ParsedUsage } from "#/lib/protocol/adapter/adapter.types";
import { ProtocolType } from "#/lib/protocol/protocol.types";
import type { Provider } from "#/lib/provider/provider.types";
import { calculateCost } from "../calculate-cost";

const model = "test-model";
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
  pricingOverrides: {
    [model]: {
      rates: { input: "1", output: "3", cacheRead: "0.25", cacheWrite: "1.25" },
      tiers: [
        {
          inputTokensAbove: 10,
          rates: { input: "2", output: "6", cacheRead: "0.5", cacheWrite: "2.5" },
        },
      ],
    },
  },
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const usage = (inputTokens: number): ParsedUsage => ({
  inputTokens,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
});

describe("calculateCost", () => {
  test("uses provider overrides and applies the multiplier", () => {
    expect(calculateCost(model, { ...provider, costMultiplier: "2" }, usage(3))).toMatchObject({
      costMicros: 6,
      costStatus: "complete",
      pricingSource: "provider_override",
      costSnapshot: { multiplier: "2", rates: { input: "1" } },
    });
  });

  test("reports global exact and fallback pricing sources with nullable overrides", () => {
    const withoutOverrides = { ...provider, pricingOverrides: null };
    expect(calculateCost("gpt-5.6-sol", withoutOverrides, usage(1)).pricingSource).toBe(
      "global_catalog",
    );
    expect(calculateCost("not-in-the-catalog", withoutOverrides, usage(1)).pricingSource).toBe(
      "global_fallback",
    );
  });

  test("prices an alias using its upstream real model", () => {
    expect(calculateCost(model, provider, usage(3))).toMatchObject({
      costMicros: 3,
      pricingSource: "provider_override",
    });
  });

  test("selects a tier from total input tokens and prices the entire request with it", () => {
    expect(calculateCost(model, provider, usage(10)).costMicros).toBe(10);
    const tiered = calculateCost(model, provider, usage(11));
    expect(tiered.costMicros).toBe(22);
    expect(tiered.costSnapshot.rates.input).toBe("2");
  });

  test("prices all token components and rounds half-up once", () => {
    expect(
      calculateCost(model, provider, {
        inputTokens: 1,
        outputTokens: 2,
        cacheReadInputTokens: 3,
        cacheCreationInputTokens: 4,
      }).costMicros,
    ).toBe(13);

    const quarterRates = {
      ...provider,
      pricingOverrides: {
        fractions: {
          rates: { input: "0.25", output: "0.25", cacheRead: "0", cacheWrite: "0" },
        },
      },
    } satisfies Provider;
    expect(
      calculateCost("fractions", quarterRates, {
        inputTokens: 1,
        outputTokens: 1,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      }).costMicros,
    ).toBe(1);
  });

  test("distinguishes partial, unavailable, and explicit zero usage", () => {
    expect(
      calculateCost(model, provider, {
        inputTokens: 1,
        outputTokens: null,
        cacheReadInputTokens: null,
        cacheCreationInputTokens: null,
      }),
    ).toMatchObject({ costMicros: 1, costStatus: "partial" });

    expect(
      calculateCost(model, provider, {
        inputTokens: null,
        outputTokens: null,
        cacheReadInputTokens: null,
        cacheCreationInputTokens: null,
      }),
    ).toMatchObject({ costMicros: null, costStatus: "unavailable" });
    expect(calculateCost(model, provider, usage(0))).toMatchObject({
      costMicros: 0,
      costStatus: "complete",
    });
  });
});
