import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "./drizzle/schema";
import { createProviderStatisticsRepository } from "./provider-statistics.repository.core";

describe("createProviderStatisticsRepository", () => {
  test("aggregates response time, tokens, and cost by provider and period", async () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE usage (
        id text PRIMARY KEY NOT NULL,
        name text,
        model text,
        client text,
        protocol_type text,
        status integer,
        is_stream integer DEFAULT false NOT NULL,
        error text,
        input_tokens integer,
        output_tokens integer,
        cache_creation_input_tokens integer,
        cache_read_input_tokens integer,
        cost_micros integer,
        cost_status text,
        cost_snapshot text,
        start_at integer NOT NULL,
        time_to_first_byte_ms integer,
        end_at integer
      );
    `);
    const database = drizzle(sqlite, { schema });
    const repository = createProviderStatisticsRepository(database);
    const now = new Date("2026-07-25T12:00:00.000Z");

    await database.insert(schema.usage).values([
      {
        id: "recent-1",
        name: "Provider A",
        startAt: new Date(now.getTime() - 5 * 60 * 1000),
        timeToFirstByteMs: 100,
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationInputTokens: 20,
        cacheReadInputTokens: 30,
        costMicros: 1_000,
        costStatus: "complete",
      },
      {
        id: "period-boundary",
        name: "Provider A",
        startAt: new Date(now.getTime() - 30 * 60 * 1000),
        timeToFirstByteMs: 300,
        outputTokens: 0,
        cacheReadInputTokens: 50,
        costMicros: 2_000,
        costStatus: "partial",
      },
      {
        id: "missing-ttfb",
        name: "Provider A",
        startAt: new Date(now.getTime() - 15 * 60 * 1000),
        costStatus: "unavailable",
      },
      {
        id: "outside-period",
        name: "Provider A",
        startAt: new Date(now.getTime() - 30 * 60 * 1000 - 1),
        timeToFirstByteMs: 900,
        inputTokens: 900,
        outputTokens: 100,
        cacheReadInputTokens: 100,
        costMicros: 9_000,
        costStatus: "complete",
      },
      {
        id: "provider-b",
        name: "Provider B",
        startAt: new Date(now.getTime() - 20 * 60 * 1000),
        timeToFirstByteMs: 500,
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        costMicros: 0,
        costStatus: "complete",
      },
      {
        id: "provider-c-null-values",
        name: "Provider C",
        startAt: new Date(now.getTime() - 10 * 60 * 1000),
      },
      {
        id: "unnamed",
        startAt: new Date(now.getTime() - 10 * 60 * 1000),
        timeToFirstByteMs: 1,
        inputTokens: 1,
        costMicros: 1,
        costStatus: "complete",
      },
    ]);

    expect(await repository.getProviderStatistics("30m", now)).toEqual([
      {
        name: "Provider A",
        averageResponseTimeMs: 200,
        inputTokens: 200,
        outputTokens: 50,
        cacheReadInputTokens: 80,
        costMicros: 3_000,
        costComplete: false,
      },
      {
        name: "Provider B",
        averageResponseTimeMs: 500,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        costMicros: 0,
        costComplete: true,
      },
      {
        name: "Provider C",
        averageResponseTimeMs: null,
        inputTokens: null,
        outputTokens: null,
        cacheReadInputTokens: null,
        costMicros: null,
        costComplete: false,
      },
    ]);

    expect(await repository.getProviderStatistics("all", now)).toEqual([
      {
        name: "Provider A",
        averageResponseTimeMs: 1300 / 3,
        inputTokens: 1_200,
        outputTokens: 150,
        cacheReadInputTokens: 180,
        costMicros: 12_000,
        costComplete: false,
      },
      {
        name: "Provider B",
        averageResponseTimeMs: 500,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        costMicros: 0,
        costComplete: true,
      },
      {
        name: "Provider C",
        averageResponseTimeMs: null,
        inputTokens: null,
        outputTokens: null,
        cacheReadInputTokens: null,
        costMicros: null,
        costComplete: false,
      },
    ]);

    sqlite.close();
  });
});
