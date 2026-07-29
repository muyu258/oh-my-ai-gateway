import { defineConfig } from "drizzle-kit";
import { databaseUrl, drizzleSchemaPath } from "./src/lib/database/config";

export default defineConfig({
  dialect: "postgresql",
  schema: drizzleSchemaPath,
  schemaFilter: ["gateway"],
  dbCredentials: {
    url: databaseUrl,
  },
});
