import postgres from "postgres";
import { closeDatabase } from "../src/lib/database/drizzle/client";
import { initializeDatabase } from "./db-init";

async function resetGatewaySchema(databaseUrl: string): Promise<void> {
  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    await sql.begin(async (transaction) => {
      await transaction.unsafe("DROP SCHEMA IF EXISTS gateway CASCADE");
      await transaction.unsafe("CREATE SCHEMA gateway");
    });
  } finally {
    await sql.end();
  }
}

if (import.meta.main) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL must be configured.");
    await resetGatewaySchema(databaseUrl);
    await initializeDatabase();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}
