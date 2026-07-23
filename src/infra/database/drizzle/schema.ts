import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const requestRecord = sqliteTable("request_record", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  model: text("model"),
  client: text("client"),
  protocolType: text("protocol_type"),
  status: text("status"),
  isStream: integer("is_stream", { mode: "boolean" }).notNull().default(false),
  error: text("error", { mode: "json" }).$type<unknown>(),
  usage: text("usage", { mode: "json" }).$type<{
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
    cost?: string;
    costDetails?: Record<string, unknown>;
  }>(),
  startAt: integer("start_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  timeToFirstByteMs: integer("time_to_first_byte_ms"),
  endAt: integer("end_at", { mode: "timestamp_ms" }),
});

export type RequestRecord = typeof requestRecord.$inferSelect;
export type NewRequestRecord = typeof requestRecord.$inferInsert;

export const provider = sqliteTable("provider", {
  name: text("name").primaryKey(),
  models: text("models", { mode: "json" }).$type<string[]>().notNull(),
  protocols: text("protocols", { mode: "json" }).$type<string[]>().notNull(),
  protocolEndpoints: text("protocol_endpoints", { mode: "json" })
    .$type<Partial<Record<string, string>>>()
    .notNull()
    .default(sql`'{}'`),
  websiteUrl: text("website_url"),
  baseUrl: text("base_url"),
  providerToken: text("provider_token").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type ProviderRecord = typeof provider.$inferSelect;
export type NewProviderRecord = typeof provider.$inferInsert;
