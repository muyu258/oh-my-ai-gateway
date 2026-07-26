import { describe, expect, test } from "bun:test";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

import type { UsageFilters } from "../filters";
import { createUsageWhere } from "../usage-where";

const baseFilters: UsageFilters = {
  stream: "all",
  status: "all",
  period: "all",
  pricingSource: "all",
};
const dialect = new SQLiteSyncDialect();

const compile = (filters: UsageFilters) => dialect.sqlToQuery(createUsageWhere(filters)!);

describe("usage filters", () => {
  test("searches both requested and upstream model names", () => {
    const query = compile({ ...baseFilters, model: "fast" });
    expect(query.sql).toContain('"usage"."model" like ? or "usage"."upstream_model" like ?');
    expect(query.params).toEqual(["%fast%", "%fast%"]);
  });

  test("filters exact pricing sources and legacy null values", () => {
    const provider = compile({ ...baseFilters, pricingSource: "provider_override" });
    expect(provider.sql).toContain('"usage"."pricing_source" = ?');
    expect(provider.params).toEqual(["provider_override"]);

    const legacy = compile({ ...baseFilters, pricingSource: "unknown" });
    expect(legacy.sql).toContain('"usage"."pricing_source" is null');
    expect(legacy.params).toEqual([]);
  });
});
