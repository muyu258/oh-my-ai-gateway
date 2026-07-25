import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "./drizzle/schema";
import { createProviderStatisticsRepository } from "./provider-statistics.repository.core";

describe("provider statistics", () => {
  test("averages non-null TTFB values within the selected period", async () => {
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
      },
      {
        id: "recent-2",
        name: "Provider A",
        startAt: new Date(now.getTime() - 10 * 60 * 1000),
        timeToFirstByteMs: 300,
      },
      {
        id: "missing-ttfb",
        name: "Provider A",
        startAt: new Date(now.getTime() - 15 * 60 * 1000),
      },
      {
        id: "old",
        name: "Provider A",
        startAt: new Date(now.getTime() - 60 * 60 * 1000),
        timeToFirstByteMs: 900,
      },
      {
        id: "provider-b",
        name: "Provider B",
        startAt: new Date(now.getTime() - 20 * 60 * 1000),
        timeToFirstByteMs: 500,
      },
    ]);

    expect(await repository.getAverageResponseTimes("30m", now)).toEqual([
      { name: "Provider A", averageResponseTimeMs: 200 },
      { name: "Provider B", averageResponseTimeMs: 500 },
    ]);
    expect(await repository.getAverageResponseTimes("all", now)).toEqual([
      { name: "Provider A", averageResponseTimeMs: 1300 / 3 },
      { name: "Provider B", averageResponseTimeMs: 500 },
    ]);

    sqlite.close();
  });
});
