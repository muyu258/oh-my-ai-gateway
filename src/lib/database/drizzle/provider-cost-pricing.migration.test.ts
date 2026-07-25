import { readFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";

describe("provider cost pricing migration", () => {
  test("defaults existing providers and leaves historical usage costs empty", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE provider (name text PRIMARY KEY NOT NULL);
      CREATE TABLE usage (id text PRIMARY KEY NOT NULL);
      INSERT INTO provider (name) VALUES ('Existing provider');
      INSERT INTO usage (id) VALUES ('historical-usage');
    `);

    const migration = readFileSync(
      new URL("./migrations/0014_amused_darkhawk.sql", import.meta.url),
      "utf8",
    );
    sqlite.exec(migration);

    expect(
      sqlite
        .prepare("SELECT cost_multiplier, pricing_overrides FROM provider WHERE name = ?")
        .get("Existing provider"),
    ).toEqual({ cost_multiplier: "1", pricing_overrides: "{}" });
    expect(
      sqlite
        .prepare("SELECT cost_micros, cost_status, cost_snapshot FROM usage WHERE id = ?")
        .get("historical-usage"),
    ).toEqual({ cost_micros: null, cost_status: null, cost_snapshot: null });
    sqlite.close();
  });
});
