import { defineConfig } from "drizzle-kit";
import { databaseFilePath, drizzleMigrationsPath, drizzleSchemaPath } from "../config";

export default defineConfig({
  dialect: "sqlite",
  schema: drizzleSchemaPath,
  out: drizzleMigrationsPath,
  dbCredentials: {
    url: databaseFilePath,
  },
});
