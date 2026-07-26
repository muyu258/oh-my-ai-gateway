import { readFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";

describe("provider UUID migration", () => {
  test("generates UUIDs, backfills usage, preserves orphans, and nulls deleted references", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE provider (
        name text PRIMARY KEY NOT NULL, models text NOT NULL, test_model text, protocols text NOT NULL,
        website_url text, base_url text, token text NOT NULL, enabled integer DEFAULT true NOT NULL,
        cost_multiplier text DEFAULT '1' NOT NULL, pricing_overrides text DEFAULT '{}' NOT NULL,
        created_at integer NOT NULL, updated_at integer NOT NULL
      );
      CREATE TABLE usage (
        id text PRIMARY KEY NOT NULL, name text, model text, client text, protocol_type text,
        status integer, is_stream integer DEFAULT false NOT NULL, error text, input_tokens integer,
        output_tokens integer, cache_creation_input_tokens integer, cache_read_input_tokens integer,
        cost_micros integer, cost_status text, cost_snapshot text, start_at integer NOT NULL,
        time_to_first_byte_ms integer, end_at integer
      );
      INSERT INTO provider VALUES
        ('Alpha', '[]', NULL, '{}', NULL, NULL, 'secret-a', 1, '1', '{}', 1, 1),
        ('Beta', '[]', NULL, '{}', NULL, NULL, 'secret-b', 1, '1', '{}', 1, 1);
      INSERT INTO usage (id, name, start_at) VALUES
        ('matched', 'Alpha', 1), ('orphan', 'Missing', 2), ('unnamed', NULL, 3);
    `);

    sqlite.exec(
      readFileSync(new URL("./migrations/0015_watery_garia.sql", import.meta.url), "utf8"),
    );

    const providers = sqlite.prepare("SELECT id, name FROM provider ORDER BY name").all() as Array<{
      id: string;
      name: string;
    }>;
    expect(providers).toHaveLength(2);
    expect(providers[0]?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(providers[0]?.id).not.toBe(providers[1]?.id);
    expect(sqlite.prepare("SELECT provider_id FROM usage WHERE id = 'matched'").get()).toEqual({
      provider_id: providers[0]?.id,
    });
    expect(sqlite.prepare("SELECT provider_id FROM usage WHERE id = 'orphan'").get()).toEqual({
      provider_id: null,
    });

    sqlite.exec("PRAGMA foreign_keys = ON");
    sqlite.prepare("DELETE FROM provider WHERE name = 'Alpha'").run();
    expect(sqlite.prepare("SELECT provider_id FROM usage WHERE id = 'matched'").get()).toEqual({
      provider_id: null,
    });
    expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    sqlite.close();
  });
});
