const requiredEnvironment = (name: "DATABASE_URL"): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
};

export const databaseUrl = requiredEnvironment("DATABASE_URL");
export const databaseMigrationUrl = process.env.DATABASE_MIGRATION_URL ?? databaseUrl;
export const databasePoolMax = Math.max(
  1,
  Number.parseInt(process.env.DATABASE_POOL_MAX ?? "1", 10) || 1,
);

export const drizzleSchemaPath = "./src/lib/database/drizzle/schema.ts";
