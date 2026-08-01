import { describe, expect, test } from "bun:test";

import { modelPricingSchema, multiplierSchema, pricingCatalogSchema } from "../pricing.types";

describe("pricing validation", () => {
  test("normalizes missing cache rates to unknown", () => {
    expect(modelPricingSchema.parse({ rates: { input: "1", output: "2" } }).rates).toEqual({
      input: "1",
      output: "2",
      cacheRead: null,
      cacheWrite: null,
    });
  });

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

  test("requires the designated fallback model to exist in the catalog", () => {
    expect(() => pricingCatalogSchema.parse({})).toThrow("existing catalog entry");
    expect(() =>
      pricingCatalogSchema.parse({
        "gpt-5.6-sol": {
          rates: { input: "1", output: "1", cacheRead: null, cacheWrite: null },
        },
      }),
    ).not.toThrow();
  });
});
