export const databaseFilePath = process.env.SQLITE_DB_PATH ?? "./data/gateway.sqlite";

export const drizzleSchemaPath = "./src/infra/database/drizzle/schema.ts";
export const drizzleMigrationsPath = "./src/infra/database/drizzle/migrations";
