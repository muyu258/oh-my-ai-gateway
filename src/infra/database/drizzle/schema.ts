import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const requestRecord = sqliteTable("request_record", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  channelId: text("channel_id"),
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
