import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Database } from "bun:sqlite";

const migration = readFileSync(
  new URL("../drizzle/migrations/0017_curious_iron_patriot.sql", import.meta.url),
  "utf8",
);

describe("provider model alias migration", () => {
  test("converts provider models and backfills test protocol, pricing, and usage", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec("PRAGMA foreign_keys = ON");
    sqlite.exec(`
      CREATE TABLE provider (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL,
        \`order\` integer NOT NULL,
        models text NOT NULL,
        test_model text,
        protocols text NOT NULL,
        website_url text,
        base_url text,
        token text NOT NULL,
        enabled integer DEFAULT true NOT NULL,
        cost_multiplier text DEFAULT '1' NOT NULL,
        pricing_overrides text DEFAULT '{}' NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      );
      CREATE TABLE usage (
        id text PRIMARY KEY NOT NULL,
        provider_id text REFERENCES provider(id) ON DELETE SET NULL,
        model text
      );
      INSERT INTO provider VALUES (
        'provider-1', 'Provider', 7, '["model-b","model-a"]', 'model-b',
        '{"openaiCompatible":{"endpoint":"","enabled":false},"openaiResponse":{"endpoint":"","enabled":true},"anthropic":{"endpoint":"","enabled":true}}',
        NULL, NULL, 'secret', 1, '1', '{}', 1, 1
      );
      INSERT INTO usage VALUES ('usage-1', 'provider-1', 'model-b');
    `);

    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim()) sqlite.exec(statement);
    }

    const migratedProvider = sqlite
      .query(
        "SELECT `order`, models, test_protocol AS testProtocol, pricing_overrides AS pricingOverrides FROM provider",
      )
      .get() as {
      order: number;
      models: string;
      testProtocol: string;
      pricingOverrides: string | null;
    };
    expect(migratedProvider.order).toBe(7);
    expect(JSON.parse(migratedProvider.models)).toEqual({
      "model-a": { aliases: [] },
      "model-b": { aliases: [] },
    });
    expect(migratedProvider.testProtocol).toBe("openaiResponse");
    expect(migratedProvider.pricingOverrides).toBeNull();
    expect(
      sqlite
        .query("SELECT upstream_model AS upstreamModel, pricing_source AS pricingSource FROM usage")
        .get(),
    ).toEqual({ upstreamModel: "model-b", pricingSource: null });
    expect(sqlite.query("PRAGMA foreign_key_list('usage')").get()).toMatchObject({
      table: "provider",
    });
    expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
    sqlite.close();
  });
});
