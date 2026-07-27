import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

import { ProtocolType } from "#/lib/protocol/protocol.types";
import type { CostSnapshot, CostStatus } from "#/lib/pricing/calculate-cost";
import type { PricingOverrides } from "#/lib/pricing/pricing.types";
import type { ProviderModels } from "#/lib/provider/provider-models";

export type PricingSource = "provider_override" | "global_catalog" | "global_fallback";

export const gateway = pgSchema("gateway");

export const provider = gateway.table(
  "provider",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    order: integer("order").notNull(),
    models: jsonb("models").$type<ProviderModels>().notNull(),
    testModel: text("test_model"),
    testProtocol: text("test_protocol").$type<ProtocolType>(),
    protocols: jsonb("protocols")
      .$type<
        Partial<
          Record<
            ProtocolType,
            {
              endpoint: string;
              enabled: boolean;
            }
          >
        >
      >()
      .notNull(),
    websiteUrl: text("website_url"),
    baseUrl: text("base_url"),
    token: text("token").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    costMultiplier: text("cost_multiplier").notNull().default("1"),
    pricingOverrides: jsonb("pricing_overrides").$type<PricingOverrides>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    unique("provider_name_unique").on(table.name),
    unique("provider_order_unique").on(table.order),
  ],
);

export type ProviderRecord = typeof provider.$inferSelect;
export type NewProviderRecord = typeof provider.$inferInsert;

export const usage = gateway.table(
  "usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id").references(() => provider.id, { onDelete: "set null" }),
    model: text("model"),
    upstreamModel: text("upstream_model"),
    pricingSource: text("pricing_source").$type<PricingSource>(),
    client: text("client"),
    protocolType: text("protocol_type"),
    status: integer("status"),
    isStream: boolean("is_stream").notNull().default(false),
    error: jsonb("error").$type<unknown>(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cacheCreationInputTokens: integer("cache_creation_input_tokens"),
    cacheReadInputTokens: integer("cache_read_input_tokens"),
    costMicros: integer("cost_micros"),
    costStatus: text("cost_status").$type<CostStatus>(),
    costSnapshot: jsonb("cost_snapshot").$type<CostSnapshot>(),
    startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    timeToFirstByteMs: integer("time_to_first_byte_ms"),
    endAt: timestamp("end_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("usage_start_at_idx").on(table.startAt),
    index("usage_provider_id_start_at_idx").on(table.providerId, table.startAt),
  ],
);

export type Usage = typeof usage.$inferSelect;
export type NewUsage = typeof usage.$inferInsert;
