import { and, count, desc, gte, like, sql, type SQL } from "drizzle-orm";
import { db } from "./drizzle/client";
import { requestRecord, type NewRequestRecord } from "./drizzle/schema";

export const saveRequestRecord = async (record: NewRequestRecord): Promise<void> => {
  await db.insert(requestRecord).values(record);
};

export type RequestRecordStatusFilter = "all" | "success" | "error";
export type RequestRecordPeriodFilter = "24h" | "7d" | "30d" | "all";

export type RequestRecordFilters = {
  model?: string;
  client?: string;
  protocolType?: string;
  status: RequestRecordStatusFilter;
  period: RequestRecordPeriodFilter;
};

const periodInMilliseconds: Partial<Record<RequestRecordPeriodFilter, number>> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const createRequestRecordWhere = (filters: RequestRecordFilters): SQL | undefined => {
  const conditions: SQL[] = [];
  const model = filters.model?.trim();
  const client = filters.client?.trim();

  if (model) conditions.push(like(requestRecord.model, `%${model}%`));
  if (client) conditions.push(like(requestRecord.client, `%${client}%`));
  if (filters.protocolType)
    conditions.push(sql`${requestRecord.protocolType} = ${filters.protocolType}`);

  if (filters.status === "success") {
    conditions.push(sql`cast(${requestRecord.status} as integer) between 200 and 399`);
  }
  if (filters.status === "error") {
    conditions.push(
      sql`(${requestRecord.status} is null or cast(${requestRecord.status} as integer) >= 400)`,
    );
  }

  const period = periodInMilliseconds[filters.period];
  if (period) conditions.push(gte(requestRecord.startAt, new Date(Date.now() - period)));

  return and(...conditions);
};

export const getRequestRecords = async ({
  filters,
  page,
  pageSize,
}: {
  filters: RequestRecordFilters;
  page: number;
  pageSize: number;
}) => {
  const where = createRequestRecordWhere(filters);

  const [records, [{ total }]] = await Promise.all([
    db
      .select()
      .from(requestRecord)
      .where(where)
      .orderBy(desc(requestRecord.startAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(requestRecord).where(where),
  ]);

  return {
    records,
    total,
  };
};
