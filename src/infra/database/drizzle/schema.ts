import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { ProtocolType } from "#/infra/gateway/protocol/protocol.types";

export const requestRecord = sqliteTable("request_record", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  model: text("model"),
  client: text("client"),
  protocolType: text("protocol_type"),
  status: integer("status"),
  isStream: integer("is_stream", { mode: "boolean" }).notNull().default(false),
  error: text("error", { mode: "json" }).$type<unknown>(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  cacheCreationInputTokens: integer("cache_creation_input_tokens"),
  cacheReadInputTokens: integer("cache_read_input_tokens"),
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
  testModel: text("test_model"),
  protocols: text("protocols", { mode: "json" })
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
