import { readFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";

describe("usage content removal migration", () => {
  test("drops stored bodies and preserves usage metadata", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE usage (
        id text PRIMARY KEY NOT NULL,
        model text,
        start_at integer NOT NULL
      );
      CREATE TABLE usage_content (
        usage_id text PRIMARY KEY NOT NULL,
        request_body text NOT NULL,
        response_body text NOT NULL,
        created_at integer NOT NULL,
        FOREIGN KEY (usage_id) REFERENCES usage(id) ON DELETE cascade
      );
      INSERT INTO usage (id, model, start_at) VALUES ('usage-1', 'test-model', 100);
      INSERT INTO usage_content (usage_id, request_body, response_body, created_at)
      VALUES ('usage-1', '{"secret":"request"}', '{"secret":"response"}', 100);
    `);

    const migration = readFileSync(new URL("./0013_sad_stephen_strange.sql", import.meta.url), "utf8");
    sqlite.exec(migration);

    expect(
      sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(
        "usage_content",
      ),
    ).toBeNull();
    expect(sqlite.prepare("SELECT id, model FROM usage").get()).toEqual({
      id: "usage-1",
      model: "test-model",
    });
    sqlite.close();
  });
});
