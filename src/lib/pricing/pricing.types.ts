import { z } from "zod";

const decimalPattern = /^\d+(?:\.\d{1,6})?$/;

const priceDecimalSchema = z
  .string()
  .trim()
  .regex(decimalPattern, "Prices must be non-negative decimals with at most 6 decimal places.");

export const multiplierSchema = z
  .string()
  .trim()
  .regex(
    decimalPattern,
    "Cost multiplier must be a non-negative decimal with at most 6 decimal places.",
  )
  .refine((value) => Number(value) <= 100, "Cost multiplier must not exceed 100.");

export const ratesSchema = z
  .object({
    input: priceDecimalSchema,
    output: priceDecimalSchema,
    cacheRead: priceDecimalSchema.nullable().default(null),
    cacheWrite: priceDecimalSchema.nullable().default(null),
  })
  .strict();

const pricingTierSchema = z
  .object({
    inputTokensAbove: z.number().int().nonnegative(),
    rates: ratesSchema,
  })
  .strict();

export const modelPricingSchema = z
  .object({
    rates: ratesSchema,
    tiers: z.array(pricingTierSchema).optional(),
  })
  .strict()
  .superRefine(({ tiers = [] }, context) => {
    for (let index = 1; index < tiers.length; index += 1) {
      if (tiers[index]!.inputTokensAbove <= tiers[index - 1]!.inputTokensAbove) {
        context.addIssue({
          code: "custom",
          path: ["tiers", index, "inputTokensAbove"],
          message: "Pricing tier thresholds must be strictly increasing.",
        });
      }
    }
  });

export const pricingOverridesSchema = z.record(z.string().min(1), modelPricingSchema);

export const PRICING_FALLBACK_MODEL = "gpt-5.6-sol";

export const pricingCatalogSchema = z
  .record(z.string().min(1), modelPricingSchema)
  .superRefine((catalog, context) => {
    if (!Object.hasOwn(catalog, PRICING_FALLBACK_MODEL)) {
      context.addIssue({
        code: "custom",
        path: [PRICING_FALLBACK_MODEL],
        message: "Pricing fallback model must identify an existing catalog entry.",
      });
    }
  });

export type Rates = z.infer<typeof ratesSchema>;
export type ModelPricing = z.infer<typeof modelPricingSchema>;
export type PricingCatalog = z.infer<typeof pricingCatalogSchema>;
export type PricingOverrides = z.infer<typeof pricingOverridesSchema>;
