import { describe, expect, test } from "bun:test";

import { modelPricingSchema, multiplierSchema } from "../pricing.types";

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
