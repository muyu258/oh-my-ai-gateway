import rawCatalog from "./catalog.json";
import { pricingCatalogSchema } from "./pricing.types";

// Parsing at module load makes invalid repository pricing fail during startup/build.
export const pricingCatalog = pricingCatalogSchema.parse(rawCatalog);
