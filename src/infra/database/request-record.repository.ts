import { db } from "./drizzle/client";
import { requestRecord, type NewRequestRecord } from "./drizzle/schema";

export const saveRequestRecord = async (record: NewRequestRecord): Promise<void> => {
  await db.insert(requestRecord).values(record);
};
