import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "./drizzle/schema";
import { createUsageRepository } from "./usage.repository.core";

describe("createUsageRepository", () => {
  test("queries usage metadata without requiring a content table", async () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE provider (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL UNIQUE
      );
      CREATE TABLE usage (
        id text PRIMARY KEY NOT NULL,
        provider_id text REFERENCES provider(id) ON DELETE SET NULL,
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
      INSERT INTO provider (id, name) VALUES ('provider-1', 'Test provider');
    `);
    const repository = createUsageRepository(drizzle(sqlite, { schema }));

    await repository.saveUsage({
      id: "usage-1",
      providerId: "provider-1",
      model: "test-model",
      client: "repository-test",
      protocolType: "anthropic",
      status: 200,
      isStream: false,
      inputTokens: 12,
      outputTokens: 5,
      startAt: new Date(100),
      endAt: new Date(200),
    });

    const result = await repository.getUsages({
      filters: {
        model: "",
        client: "",
        protocolType: "",
        stream: "all",
        status: "all",
        period: "all",
      },
      page: 1,
      pageSize: 20,
    });

    expect(result.total).toBe(1);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      id: "usage-1",
      providerId: "provider-1",
      name: "Test provider",
      model: "test-model",
    });
    expect(Object.keys(result.records[0] ?? {})).toEqual([
      "id",
      "providerId",
      "name",
      "model",
      "client",
      "protocolType",
      "status",
      "isStream",
      "error",
      "inputTokens",
      "outputTokens",
      "cacheCreationInputTokens",
      "cacheReadInputTokens",
      "costMicros",
      "costStatus",
      "costSnapshot",
      "startAt",
      "timeToFirstByteMs",
      "endAt",
    ]);

    sqlite.prepare("UPDATE provider SET name = 'Renamed provider' WHERE id = 'provider-1'").run();
    const renamed = await repository.getUsages({
      filters: {
        model: "",
        client: "",
        protocolType: "",
        stream: "all",
        status: "all",
        period: "all",
      },
      page: 1,
      pageSize: 20,
    });
    expect(renamed.records[0]?.name).toBe("Renamed provider");

    sqlite.prepare("DELETE FROM provider WHERE id = 'provider-1'").run();
    const deleted = await repository.getUsages({
      filters: {
        model: "",
        client: "",
        protocolType: "",
        stream: "all",
        status: "all",
        period: "all",
      },
      page: 1,
      pageSize: 20,
    });
    expect(deleted.records[0]).toMatchObject({ providerId: null, name: null });
    sqlite.close();
  });
});
