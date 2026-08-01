import rawCatalog from "../src/lib/pricing/catalog.json";
import { closeDatabase, db } from "../src/lib/database/drizzle/client";
import { keyValue } from "../src/lib/database/drizzle/schema";
import { pricingCatalogSchema } from "../src/lib/pricing/pricing.types";

const pushSchema = async (): Promise<void> => {
  const childProcess = Bun.spawn(["bun", "x", "drizzle-kit", "push"], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: globalThis.process.env,
  });
  const exitCode = await childProcess.exited;
  if (exitCode !== 0) throw new Error(`drizzle-kit push failed with exit code ${exitCode}.`);
};

export const initializeDatabase = async (): Promise<void> => {
  const catalog = pricingCatalogSchema.parse(rawCatalog);
  await pushSchema();
  await db.transaction(async (transaction) => {
    const updatedAt = new Date();
    await transaction
      .insert(keyValue)
      .values({ key: "pricing", value: catalog, updatedAt })
      .onConflictDoUpdate({
        target: keyValue.key,
        set: { value: catalog, updatedAt },
      });
  });
};

if (import.meta.main) {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}
