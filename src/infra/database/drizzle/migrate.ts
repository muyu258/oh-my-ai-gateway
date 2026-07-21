import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { drizzleMigrationsPath } from "../config";
import { db, sqlite } from "./client";

console.log("Applying SQLite migrations...");
migrate(db, { migrationsFolder: drizzleMigrationsPath });
sqlite.close();
console.log("SQLite database initialized.");
