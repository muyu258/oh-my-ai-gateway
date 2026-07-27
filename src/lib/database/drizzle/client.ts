import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databasePoolMax, databaseUrl } from "../config";
import * as schema from "./schema";

const client = postgres(databaseUrl, { max: databasePoolMax, prepare: false });

export const db = drizzle(client, { schema });
