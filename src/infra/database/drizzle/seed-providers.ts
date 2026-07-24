import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { databaseFilePath } from "../config";
import { provider } from "./schema";
import { legacyProviders } from "#/infra/gateway/provider/provider.config";

const databasePath = resolve(databaseFilePath);
mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
const db = drizzle(sqlite);

if (!legacyProviders.length) {
  console.log("No legacy providers to import.");
  process.exit(0);
}

await db
  .insert(provider)
  .values(
    legacyProviders.map((legacyProvider) => {
      const models = [...legacyProvider.models].sort((left, right) => left.localeCompare(right));
      return {
        ...legacyProvider,
        models,
        testModel: legacyProvider.testModel ?? models[0],
        protocols: [...legacyProvider.protocols],
      };
    }),
  )
  .onConflictDoNothing({ target: provider.name });

console.log(`Imported ${legacyProviders.length} legacy provider configuration(s).`);

sqlite.close();
