import { z } from "zod";

const decimalPattern = /^\d+(?:\.\d{1,6})?$/;

export const priceDecimalSchema = z
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
    cacheRead: priceDecimalSchema,
    cacheWrite: priceDecimalSchema,
  })
  .strict();

export const pricingTierSchema = z
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

export const pricingCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    catalogVersion: z.string().min(1),
    currency: z.literal("USD"),
    unitTokens: z.literal(1_000_000),
    fallbackModel: z.string().min(1),
    models: z.record(z.string().min(1), modelPricingSchema),
  })
  .strict()
  .superRefine(({ fallbackModel, models }, context) => {
    if (!models[fallbackModel]) {
      context.addIssue({
        code: "custom",
        path: ["fallbackModel"],
        message: "Fallback model must exist in the pricing catalog.",
      });
    }
  });

export type Rates = z.infer<typeof ratesSchema>;
export type PricingTier = z.infer<typeof pricingTierSchema>;
export type ModelPricing = z.infer<typeof modelPricingSchema>;
export type PricingOverrides = z.infer<typeof pricingOverridesSchema>;
export type PricingCatalog = z.infer<typeof pricingCatalogSchema>;
