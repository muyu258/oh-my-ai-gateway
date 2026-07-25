import { describe, expect, test } from "bun:test";

import type { ParsedUsage } from "#/lib/protocol/adapter/adapter.types";
import { ProtocolType } from "#/lib/protocol/protocol.types";
import type { Provider } from "#/lib/provider/provider.types";
import { calculateCost } from "./calculate-cost";
import { modelPricingSchema, multiplierSchema } from "./pricing.types";

const provider: Provider = {
  name: "Test provider",
  models: ["gpt-5.6-sol"],
  testModel: "gpt-5.6-sol",
  protocols: { [ProtocolType.OpenaiCompatible]: { endpoint: "", enabled: true } },
  websiteUrl: null,
  baseUrl: null,
  token: "secret",
  enabled: true,
  costMultiplier: "1",
  pricingOverrides: {},
  createdAt: new Date(0),
  updatedAt: new Date("2026-07-26T00:00:00.000Z"),
};

const usage = (inputTokens: number): ParsedUsage => ({
  inputTokens,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
});

describe("calculateCost", () => {
  test("resolves provider override, global model, then fallback and applies multiplier", () => {
    const overridden = {
      ...provider,
      costMultiplier: "2",
      pricingOverrides: {
        custom: {
          rates: { input: "1", output: "1", cacheRead: "1", cacheWrite: "1" },
        },
      },
    } satisfies Provider;

    expect(calculateCost("custom", overridden, usage(3))).toMatchObject({
      costMicros: 6,
      costSnapshot: { multiplier: "2", rates: { input: "1" } },
    });
    expect(calculateCost("gpt-5.6-sol", provider, usage(1))).toMatchObject({
      costMicros: 5,
      costSnapshot: {
        rates: { input: "5" },
      },
    });
    expect(calculateCost("unknown", provider, usage(1))).toMatchObject({
      costMicros: 5,
      costSnapshot: { rates: { input: "5" } },
    });
  });

  test("uses the base tier at 272K and the high tier for the entire 272001-token request", () => {
    expect(calculateCost("gpt-5.6-sol", provider, usage(272_000)).costMicros).toBe(1_360_000);
    const highTier = calculateCost("gpt-5.6-sol", provider, usage(272_001));
    expect(highTier.costMicros).toBe(2_720_010);
    expect(highTier.costSnapshot.rates.input).toBe("10");
  });

  test("prices all four exclusive token components and rounds half-up once", () => {
    const allComponents: ParsedUsage = {
      inputTokens: 1,
      outputTokens: 1,
      cacheReadInputTokens: 1,
      cacheCreationInputTokens: 1,
    };
    expect(calculateCost("gpt-5.6-sol", provider, allComponents).costMicros).toBe(42);

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
    const partial = calculateCost("gpt-5.6-sol", provider, {
      inputTokens: 1,
      outputTokens: null,
      cacheReadInputTokens: null,
      cacheCreationInputTokens: null,
    });
    expect(partial).toMatchObject({
      costMicros: 5,
      costStatus: "partial",
      costSnapshot: { rates: { input: "5" } },
    });

    expect(
      calculateCost("gpt-5.6-sol", provider, {
        inputTokens: null,
        outputTokens: null,
        cacheReadInputTokens: null,
        cacheCreationInputTokens: null,
      }),
    ).toMatchObject({ costMicros: null, costStatus: "unavailable" });
    expect(calculateCost("gpt-5.6-sol", provider, usage(0))).toMatchObject({
      costMicros: 0,
      costStatus: "complete",
    });
  });

  test("keeps an existing snapshot immutable when provider pricing changes", () => {
    const original = calculateCost("gpt-5.6-sol", provider, usage(1));
    const next = calculateCost("gpt-5.6-sol", { ...provider, costMultiplier: "2" }, usage(1));
    expect(original.costSnapshot.multiplier).toBe("1");
    expect(original.costMicros).toBe(5);
    expect(next.costMicros).toBe(10);
  });
});

describe("pricing validation", () => {
  test("rejects incomplete rates, excessive precision, invalid multiplier, and unordered tiers", () => {
    expect(() => modelPricingSchema.parse({ rates: { input: "1" } })).toThrow();
    expect(() => multiplierSchema.parse("1.0000001")).toThrow();
    expect(() => multiplierSchema.parse("101")).toThrow();
    expect(() =>
      modelPricingSchema.parse({
        rates: { input: "1", output: "1", cacheRead: "1", cacheWrite: "1" },
        tiers: [
          {
            inputTokensAbove: 10,
            rates: { input: "2", output: "2", cacheRead: "2", cacheWrite: "2" },
          },
          {
            inputTokensAbove: 10,
            rates: { input: "3", output: "3", cacheRead: "3", cacheWrite: "3" },
          },
        ],
      }),
    ).toThrow("strictly increasing");
  });
});
