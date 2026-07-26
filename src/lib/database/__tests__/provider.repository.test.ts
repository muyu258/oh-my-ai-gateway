import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";

import {
  insertProviderWithNextOrder,
  moveProviderOrderInDatabase,
} from "../provider-priority.repository";

const databases: Database[] = [];

const createDatabase = (): Database => {
  const sqlite = new Database(":memory:");
  databases.push(sqlite);
  sqlite.exec(`
    CREATE TABLE provider (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL UNIQUE,
      \`order\` integer NOT NULL UNIQUE,
      models text NOT NULL,
      test_model text,
      test_protocol text,
      protocols text NOT NULL,
      website_url text,
      base_url text,
      token text NOT NULL,
      enabled integer NOT NULL,
      cost_multiplier text NOT NULL,
      pricing_overrides text,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );
  `);
  return sqlite;
};

const providerValues = (name: string, id = crypto.randomUUID()) =>
  [
    id,
    name,
    JSON.stringify([`${name.toLowerCase()}-model`]),
    `${name.toLowerCase()}-model`,
    "openaiCompatible",
    JSON.stringify({ openaiCompatible: { endpoint: "", enabled: true } }),
    null,
    null,
    "secret",
    1,
    "1",
    "{}",
    Date.now(),
    Date.now(),
  ] as const;

afterEach(() => {
  for (const sqlite of databases.splice(0)) sqlite.close();
});

describe("provider priority writes", () => {
  test("creates at one in an empty table and appends after the current maximum", () => {
    const sqlite = createDatabase();
    const firstId = insertProviderWithNextOrder(sqlite, providerValues("First"));
    insertProviderWithNextOrder(sqlite, providerValues("Second"));
    sqlite.query("UPDATE provider SET `order` = 8 WHERE name = 'Second'").run();
    const thirdId = insertProviderWithNextOrder(sqlite, providerValues("Third"));

    expect(firstId).toMatch(/^[0-9a-f-]{36}$/);
    expect(thirdId).toMatch(/^[0-9a-f-]{36}$/);
    expect(sqlite.query("SELECT name, `order` FROM provider ORDER BY `order`").all()).toEqual([
      { name: "First", order: 1 },
      { name: "Second", order: 8 },
      { name: "Third", order: 9 },
    ]);
  });

  test("moves downward after a distant target and shifts every intermediate provider", () => {
    const sqlite = createDatabase();
    const ids = new Map<string, string>();
    for (const name of ["Alpha", "Bravo", "Charlie", "Delta"]) {
      const id = crypto.randomUUID();
      ids.set(name, insertProviderWithNextOrder(sqlite, providerValues(name, id)));
    }

    moveProviderOrderInDatabase(sqlite, ids.get("Alpha")!, ids.get("Delta")!, "after");

    expect(sqlite.query("SELECT name, `order` FROM provider ORDER BY `order`").all()).toEqual([
      { name: "Bravo", order: 1 },
      { name: "Charlie", order: 2 },
      { name: "Delta", order: 3 },
      { name: "Alpha", order: 4 },
    ]);
  });

  test("moves upward before a distant target while preserving non-contiguous order slots", () => {
    const sqlite = createDatabase();
    const ids = new Map<string, string>();
    for (const name of ["Alpha", "Bravo", "Charlie", "Delta"]) {
      const id = crypto.randomUUID();
      ids.set(name, insertProviderWithNextOrder(sqlite, providerValues(name, id)));
    }
    sqlite.exec("UPDATE provider SET `order` = 10 WHERE name = 'Delta'");
    sqlite.exec("UPDATE provider SET `order` = 8 WHERE name = 'Charlie'");
    sqlite.exec("UPDATE provider SET `order` = 6 WHERE name = 'Bravo'");

    moveProviderOrderInDatabase(sqlite, ids.get("Delta")!, ids.get("Bravo")!, "before");

    expect(sqlite.query("SELECT name, `order` FROM provider ORDER BY `order`").all()).toEqual([
      { name: "Alpha", order: 1 },
      { name: "Delta", order: 6 },
      { name: "Bravo", order: 8 },
      { name: "Charlie", order: 10 },
    ]);
  });

  test("supports adjacent moves and first or last insertion", () => {
    const sqlite = createDatabase();
    const ids = new Map<string, string>();
    for (const name of ["Alpha", "Bravo", "Charlie", "Delta"]) {
      const id = crypto.randomUUID();
      ids.set(name, insertProviderWithNextOrder(sqlite, providerValues(name, id)));
    }

    moveProviderOrderInDatabase(sqlite, ids.get("Alpha")!, ids.get("Bravo")!, "after");
    moveProviderOrderInDatabase(sqlite, ids.get("Delta")!, ids.get("Bravo")!, "before");
    moveProviderOrderInDatabase(sqlite, ids.get("Bravo")!, ids.get("Charlie")!, "after");

    expect(sqlite.query("SELECT name FROM provider ORDER BY `order`").all()).toEqual([
      { name: "Delta" },
      { name: "Alpha" },
      { name: "Charlie" },
      { name: "Bravo" },
    ]);
    expect(sqlite.query("SELECT count(DISTINCT `order`) AS count FROM provider").get()).toEqual({
      count: 4,
    });
  });

  test("treats an already satisfied placement as a write-free success", () => {
    const sqlite = createDatabase();
    const alphaId = insertProviderWithNextOrder(sqlite, providerValues("Alpha"));
    const bravoId = insertProviderWithNextOrder(sqlite, providerValues("Bravo"));
    sqlite.exec(`
      CREATE TRIGGER reject_any_priority_write
      BEFORE UPDATE OF \`order\` ON provider
      BEGIN
        SELECT RAISE(ABORT, 'unexpected priority write');
      END;
    `);

    expect(() => moveProviderOrderInDatabase(sqlite, alphaId, bravoId, "before")).not.toThrow();
    expect(() => moveProviderOrderInDatabase(sqlite, bravoId, alphaId, "after")).not.toThrow();
  });

  test("updates only the source-to-destination interval", () => {
    const sqlite = createDatabase();
    const ids = new Map<string, string>();
    for (const name of ["Alpha", "Bravo", "Charlie", "Delta"]) {
      const id = crypto.randomUUID();
      ids.set(name, insertProviderWithNextOrder(sqlite, providerValues(name, id)));
    }
    sqlite.exec(`
      CREATE TRIGGER reject_delta_priority_write
      BEFORE UPDATE OF \`order\` ON provider
      WHEN OLD.name = 'Delta'
      BEGIN
        SELECT RAISE(ABORT, 'outside interval updated');
      END;
    `);

    expect(() =>
      moveProviderOrderInDatabase(sqlite, ids.get("Alpha")!, ids.get("Charlie")!, "after"),
    ).not.toThrow();
    expect(sqlite.query("SELECT name FROM provider ORDER BY `order`").all()).toEqual([
      { name: "Bravo" },
      { name: "Charlie" },
      { name: "Alpha" },
      { name: "Delta" },
    ]);
  });

  test("rejects identical or missing IDs before changing priorities", () => {
    const sqlite = createDatabase();
    const alphaId = insertProviderWithNextOrder(sqlite, providerValues("Alpha"));
    insertProviderWithNextOrder(sqlite, providerValues("Bravo"));
    const before = sqlite.query("SELECT id, `order` FROM provider ORDER BY `order`").all();

    expect(() => moveProviderOrderInDatabase(sqlite, alphaId, alphaId, "before")).toThrow(
      "Provider IDs must be different",
    );
    expect(() =>
      moveProviderOrderInDatabase(sqlite, alphaId, crypto.randomUUID(), "after"),
    ).toThrow("Both providers must exist");
    expect(sqlite.query("SELECT id, `order` FROM provider ORDER BY `order`").all()).toEqual(before);
  });

  test("rolls back the complete interval when a final placement write fails", () => {
    const sqlite = createDatabase();
    const alphaId = insertProviderWithNextOrder(sqlite, providerValues("Alpha"));
    insertProviderWithNextOrder(sqlite, providerValues("Bravo"));
    const charlieId = insertProviderWithNextOrder(sqlite, providerValues("Charlie"));
    sqlite.exec(`
      CREATE TRIGGER fail_provider_move
      BEFORE UPDATE OF \`order\` ON provider
      WHEN OLD.name = 'Alpha' AND NEW.\`order\` = 3
      BEGIN
        SELECT RAISE(ABORT, 'forced swap failure');
      END;
    `);

    expect(() => moveProviderOrderInDatabase(sqlite, alphaId, charlieId, "after")).toThrow(
      "forced swap failure",
    );
    expect(sqlite.query("SELECT name, `order` FROM provider ORDER BY `order`").all()).toEqual([
      { name: "Alpha", order: 1 },
      { name: "Bravo", order: 2 },
      { name: "Charlie", order: 3 },
    ]);
  });
});
