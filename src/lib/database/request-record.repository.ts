/** @deprecated Use the usage repository. */
export * from "./usage.repository";
export { getUsages as getRequestRecords, saveUsage as saveRequestRecord } from "./usage.repository";
export {
  type UsageFilters as RequestRecordFilters,
  type UsagePeriodFilter as RequestRecordPeriodFilter,
  type UsageStatusFilter as RequestRecordStatusFilter,
  type UsageStreamFilter as RequestRecordStreamFilter,
} from "./usage.repository";
