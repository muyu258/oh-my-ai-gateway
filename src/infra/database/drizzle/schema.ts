import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const requestRecord = sqliteTable("request_record", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  channelId: text("channel_id"),
  source: text("source"),
  status: text("status"),
  isStream: integer("is_stream", { mode: "boolean" }).notNull().default(false),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  cachedInputTokens: integer("cached_input_tokens"),
  cost: text("cost"),
  costDetails: text("cost_details", { mode: "json" }).$type<Record<string, unknown>>(),
  startAt: integer("start_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  timeToFirstByteMs: integer("time_to_first_byte_ms"),
  endAt: integer("end_at", { mode: "timestamp_ms" }),
});

export type RequestRecord = typeof requestRecord.$inferSelect;
export type NewRequestRecord = typeof requestRecord.$inferInsert;
