export const databaseFilePath = process.env.SQLITE_DB_PATH ?? "./data/gateway.sqlite";

export const drizzleSchemaPath = "./src/lib/database/drizzle/schema.ts";
export const drizzleMigrationsPath = "./src/lib/database/drizzle/migrations";
