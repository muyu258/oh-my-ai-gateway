import { describe, expect, test } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";

import type { UsageFilters } from "../filters";
import { createUsageWhere } from "../usage-where";

const baseFilters: UsageFilters = {
  stream: "all",
  status: "all",
  period: "all",
  pricingSource: "all",
};
const dialect = new PgDialect();

const compile = (filters: UsageFilters) => dialect.sqlToQuery(createUsageWhere(filters)!);

describe("usage filters", () => {
  test("searches both requested and upstream model names", () => {
    const query = compile({ ...baseFilters, model: "fast" });
    expect(query.sql).toContain(
      '"gateway"."usage"."model" ilike $1 or "gateway"."usage"."upstream_model" ilike $2',
    );
    expect(query.params).toEqual(["%fast%", "%fast%"]);
  });

  test("filters exact pricing sources and legacy null values", () => {
    const provider = compile({ ...baseFilters, pricingSource: "provider_override" });
    expect(provider.sql).toContain('"gateway"."usage"."pricing_source" = $1');
    expect(provider.params).toEqual(["provider_override"]);

    const legacy = compile({ ...baseFilters, pricingSource: "unknown" });
    expect(legacy.sql).toContain('"gateway"."usage"."pricing_source" is null');
    expect(legacy.params).toEqual([]);
  });
});
