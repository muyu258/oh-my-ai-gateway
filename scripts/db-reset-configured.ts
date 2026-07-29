import postgres from "postgres";

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

async function initializeDatabase(): Promise<void> {
  const childProcess = Bun.spawn(["bun", "x", "drizzle-kit", "push"], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: globalThis.process.env,
  });
  const exitCode = await childProcess.exited;

  if (exitCode !== 0) throw new Error(`drizzle-kit push failed with exit code ${exitCode}.`);
}

if (import.meta.main) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL must be configured.");
    await resetGatewaySchema(databaseUrl);
    await initializeDatabase();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
