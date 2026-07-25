import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { databaseFilePath, drizzleMigrationsPath } from "../config";

const databasePath = resolve(databaseFilePath);

mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath, { create: true });
const db = drizzle(sqlite);

console.log("Applying SQLite migrations...");
migrate(db, { migrationsFolder: drizzleMigrationsPath });
sqlite.close();
console.log("SQLite database initialized.");
