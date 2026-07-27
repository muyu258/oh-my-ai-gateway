import { defineConfig } from "drizzle-kit";
import { databaseMigrationUrl, drizzleSchemaPath } from "./src/lib/database/config";

export default defineConfig({
  dialect: "postgresql",
  schema: drizzleSchemaPath,
  dbCredentials: {
    url: databaseMigrationUrl,
  },
});
