type SqliteBindValue = null | string | number | bigint | boolean | Uint8Array;

type SqliteStatement = {
  all: (...values: SqliteBindValue[]) => unknown[];
  get: (...values: SqliteBindValue[]) => unknown;
  run: (...values: SqliteBindValue[]) => unknown;
};

export type SyncSqliteDatabase = {
  prepare: (query: string) => SqliteStatement;
  transaction: <Result>(operation: () => Result) => () => Result;
};

export const insertProviderWithNextOrder = (
  sqlite: SyncSqliteDatabase,
  values: readonly SqliteBindValue[],
): string => {
  const created = sqlite
    .prepare(
      `INSERT INTO provider (
        id, name, \`order\`, models, test_model, test_protocol, protocols, website_url, base_url, token,
        enabled, cost_multiplier, pricing_overrides, created_at, updated_at
      )
      SELECT ?, ?, coalesce(max(\`order\`), 0) + 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM provider
      RETURNING id`,
    )
    .get(...values) as { id: string } | undefined;
  if (!created) throw new Error("Provider creation did not return an ID.");
  return created.id;
};

export type ProviderOrderPlacement = "before" | "after";

export const moveProviderOrderInDatabase = (
  sqlite: SyncSqliteDatabase,
  sourceId: string,
  targetId: string,
  placement: ProviderOrderPlacement,
): void => {
  if (sourceId === targetId) throw new Error("Provider IDs must be different.");

  sqlite.transaction(() => {
    const records = sqlite
      .prepare("SELECT id, `order` FROM provider ORDER BY `order` ASC")
      .all() as Array<{ id: string; order: number }>;
    const sourceIndex = records.findIndex(({ id }) => id === sourceId);
    const targetIndex = records.findIndex(({ id }) => id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) throw new Error("Both providers must exist.");

    const reordered = [...records];
    const [source] = reordered.splice(sourceIndex, 1);
    const targetIndexWithoutSource = reordered.findIndex(({ id }) => id === targetId);
    const insertionIndex = targetIndexWithoutSource + (placement === "after" ? 1 : 0);
    reordered.splice(insertionIndex, 0, source);
    const finalIndex = reordered.findIndex(({ id }) => id === sourceId);
    if (finalIndex === sourceIndex) return;

    const rangeStart = Math.min(sourceIndex, finalIndex);
    const rangeEnd = Math.max(sourceIndex, finalIndex);
    const originalRange = records.slice(rangeStart, rangeEnd + 1);
    const reorderedRange = reordered.slice(rangeStart, rangeEnd + 1);
    const maximumOrder = records.at(-1)?.order ?? 0;
    const update = sqlite.prepare("UPDATE provider SET `order` = ? WHERE id = ?");

    originalRange.forEach(({ id }, index) => update.run(maximumOrder + index + 1, id));
    reorderedRange.forEach(({ id }, index) => update.run(originalRange[index]!.order, id));
  })();
};
