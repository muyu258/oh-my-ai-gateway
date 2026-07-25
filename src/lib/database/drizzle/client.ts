import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { databaseFilePath } from "../config";
import * as schema from "./schema";

const databasePath = resolve(databaseFilePath);

mkdirSync(dirname(databasePath), { recursive: true });

export const db = drizzle(databasePath, { schema });
export const sqlite = db.$client;

sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");
