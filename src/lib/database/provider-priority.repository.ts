import { asc, eq, sql } from "drizzle-orm";

import { db } from "./drizzle/client";
import { provider, type NewProviderRecord } from "./drizzle/schema";
import { reorderProviders, type ProviderOrderPlacement } from "./provider-order";

export type { ProviderOrderPlacement } from "./provider-order";

const lockProviderOrdering = (
  transaction: Parameters<typeof db.transaction>[0] extends (
    transaction: infer Transaction,
    ...args: never[]
  ) => unknown
    ? Transaction
    : never,
) => transaction.execute(sql`select pg_advisory_xact_lock(hashtext('gateway.provider.order'))`);

export const insertProviderWithNextOrder = async (
  values: Omit<NewProviderRecord, "order">,
): Promise<string> =>
  db.transaction(async (transaction) => {
    await lockProviderOrdering(transaction);
    const [row] = await transaction
      .select({ maximumOrder: sql<number>`coalesce(max(${provider.order}), 0)`.mapWith(Number) })
      .from(provider);
    const [created] = await transaction
      .insert(provider)
      .values({ ...values, order: (row?.maximumOrder ?? 0) + 1 })
      .returning({ id: provider.id });
    if (!created) throw new Error("Provider creation did not return an ID.");
    return created.id;
  });

export const moveProviderOrderInDatabase = async (
  sourceId: string,
  targetId: string,
  placement: ProviderOrderPlacement,
): Promise<void> => {
  if (sourceId === targetId) throw new Error("Provider IDs must be different.");

  await db.transaction(async (transaction) => {
    await lockProviderOrdering(transaction);
    const records = await transaction
      .select({ id: provider.id, order: provider.order })
      .from(provider)
      .orderBy(asc(provider.order));
    const reordered = reorderProviders(records, sourceId, targetId, placement);
    const finalIndex = reordered.findIndex(({ id }) => id === sourceId);
    const sourceIndex = records.findIndex(({ id }) => id === sourceId);
    if (finalIndex === sourceIndex) return;

    const rangeStart = Math.min(sourceIndex, finalIndex);
    const rangeEnd = Math.max(sourceIndex, finalIndex);
    const originalRange = records.slice(rangeStart, rangeEnd + 1);
    const reorderedRange = reordered.slice(rangeStart, rangeEnd + 1);
    const maximumOrder = records.at(-1)?.order ?? 0;

    for (const [index, record] of originalRange.entries()) {
      await transaction
        .update(provider)
        .set({ order: maximumOrder + index + 1 })
        .where(eq(provider.id, record.id));
    }
    for (const [index, record] of reorderedRange.entries()) {
      await transaction
        .update(provider)
        .set({ order: originalRange[index]!.order })
        .where(eq(provider.id, record.id));
    }
  });
};
