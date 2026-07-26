import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Box,
  Clock3,
  Database,
  Waves,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { UsageRecordRow } from "#/app/dashboard/usage/_components/usage-record-row";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyState,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
} from "#/components/data-table";
import { DataTablePanel } from "#/components/data-table-panel";
import { ProtocolIcon } from "#/components/icons/protocol";
import { TableFilter } from "#/components/table-filter";
import { getUsages } from "#/lib/database/usage.repository";
import type { UsageRecord } from "#/lib/database/usage.repository.core";
import { isUsagePeriodFilter, isUsageStatusFilter, isUsageStreamFilter } from "#/lib/usage/filters";
import { isProtocolType, protocolOptions } from "#/lib/protocol/protocol.registry";

export const metadata: Metadata = {
  title: "Usage | Oh My AI Gateway",
};

const PAGE_SIZE = 20;
type SearchParams = Record<string, string | string[] | undefined>;

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const formatNumber = (value: number): string => new Intl.NumberFormat("en-US").format(value);

const formatCompactNumber = (value: number): string =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const formatCost = (costMicros: number): string => {
  const whole = Math.floor(costMicros / 1_000_000);
  const fraction = String(costMicros % 1_000_000)
    .padStart(6, "0")
    .replace(/0+$/, "")
    .padEnd(2, "0");
  return `$${formatNumber(whole)}.${fraction}`;
};

const formatDate = (date: Date): { date: string; time: string } => ({
  date: new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(date),
  time: new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(date),
});

const formatDuration = (milliseconds: number | null): string => {
  if (milliseconds === null) return "—";
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1000).toFixed(milliseconds < 10_000 ? 1 : 0)} s`;
};

const getStatus = (status: number | null) => {
  const successful = status !== null && status >= 200 && status < 400;

  return {
    label: status?.toString() ?? "Unknown",
    successful,
  };
};

const getCachedInputPercentage = (record: UsageRecord): number | null => {
  const inputTokens =
    (record.inputTokens ?? 0) +
    (record.cacheCreationInputTokens ?? 0) +
    (record.cacheReadInputTokens ?? 0);
  const cacheReadInputTokens = record.cacheReadInputTokens ?? 0;
  if (!inputTokens || !cacheReadInputTokens) return null;
  return Math.min(100, Math.round((cacheReadInputTokens / inputTokens) * 100));
};

const getTotalInputTokens = (record: UsageRecord): number | null => {
  const components = [
    record.inputTokens,
    record.cacheCreationInputTokens,
    record.cacheReadInputTokens,
  ];
  return components.some((value) => value !== null)
    ? components.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null;
};

const getDuration = (record: UsageRecord): number | null =>
  record.endAt ? record.endAt.getTime() - record.startAt.getTime() : null;

const pageHref = (params: URLSearchParams, page: number): string => {
  const nextParams = new URLSearchParams(params);
  if (page <= 1) nextParams.delete("page");
  else nextParams.set("page", String(page));
  const query = nextParams.toString();
  return query ? `/dashboard/usage?${query}` : "/dashboard/usage";
};

const UsageTableColumns = () => (
  <colgroup>
    <col className="w-[14%]" />
    <col className="w-[12%]" />
    <col className="w-[26%]" />
    <col className="w-[12%]" />
    <col className="w-[10%]" />
    <col className="w-[10%]" />
    <col className="w-[10%]" />
    <col className="w-[12%]" />
  </colgroup>
);

async function UsageContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const model = firstValue(resolvedSearchParams.model)?.trim() ?? "";
  const client = firstValue(resolvedSearchParams.client)?.trim() ?? "";
  const requestedProtocol = firstValue(resolvedSearchParams.protocolType);
  const protocolType = isProtocolType(requestedProtocol) ? requestedProtocol : "";
  const requestedStatus = firstValue(resolvedSearchParams.status);
  const requestedPeriod = firstValue(resolvedSearchParams.period);
  const requestedStream = firstValue(resolvedSearchParams.stream);
  const status = isUsageStatusFilter(requestedStatus) ? requestedStatus : "all";
  const period = isUsagePeriodFilter(requestedPeriod) ? requestedPeriod : "7d";
  const stream = isUsageStreamFilter(requestedStream) ? requestedStream : "all";
  const requestedPage = Number.parseInt(firstValue(resolvedSearchParams.page) ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const { records, total } = await getUsages({
    filters: { model, client, protocolType, stream, status, period },
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const activeFilters = Boolean(
    model || client || protocolType || stream !== "all" || status !== "all" || period !== "7d",
  );
  const queryParams = new URLSearchParams();
  if (model) queryParams.set("model", model);
  if (client) queryParams.set("client", client);
  if (protocolType) queryParams.set("protocolType", protocolType);
  if (stream !== "all") queryParams.set("stream", stream);
  if (status !== "all") queryParams.set("status", status);
  if (period !== "7d") queryParams.set("period", period);

  const tableFooter = (
    <>
      <p className="text-sm text-[#667085]">
        <span className="font-medium tabular-nums text-[#344054]">{formatNumber(total)}</span>{" "}
        records
      </p>
      <nav className="flex items-center gap-3" aria-label="Usage pagination">
        <p className="min-w-20 text-center text-sm tabular-nums text-[#86868b]">
          Page <span className="font-medium text-[#1d1d1f]">{currentPage}</span> of {totalPages}
        </p>
        <div className="flex items-center gap-1">
          {currentPage > 1 ? (
            <Link
              href={pageHref(queryParams, currentPage - 1)}
              aria-label="Previous page"
              title="Previous page"
              className="flex size-8 items-center justify-center rounded-md text-[#3a3a3c] transition duration-150 ease-out hover:bg-black/[0.05] active:scale-95 active:bg-black/[0.08]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="flex size-8 cursor-not-allowed items-center justify-center rounded-md text-[#c7c7cc]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </span>
          )}
          {currentPage < totalPages ? (
            <Link
              href={pageHref(queryParams, currentPage + 1)}
              aria-label="Next page"
              title="Next page"
              className="flex size-8 items-center justify-center rounded-md text-[#3a3a3c] transition duration-150 ease-out hover:bg-black/[0.05] active:scale-95 active:bg-black/[0.08]"
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="flex size-8 cursor-not-allowed items-center justify-center rounded-md text-[#c7c7cc]"
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          )}
        </div>
      </nav>
    </>
  );

  return (
    <DataTablePanel
      minWidth={1040}
      footer={tableFooter}
      header={
        <DataTable className="table-fixed text-center">
          <UsageTableColumns />
          <DataTableHeader>
            <DataTableHeaderRow className="tracking-wide">
              <DataTableHead pinned="left">Name</DataTableHead>
              <DataTableHead>
                <TableFilter
                  label="Time"
                  parameter="period"
                  defaultValue="7d"
                  options={[
                    { label: "Last 24 hours", value: "24h" },
                    { label: "Last 7 days", value: "7d" },
                    { label: "Last 30 days", value: "30d" },
                    { label: "All time", value: "all" },
                  ]}
                />
              </DataTableHead>
              <DataTableHead>
                <div className="flex items-center justify-center gap-3">
                  <TableFilter
                    label="Protocol"
                    parameter="protocolType"
                    options={[
                      { label: "All protocols", value: "" },
                      ...protocolOptions.map(({ label, value }) => ({ label, value })),
                    ]}
                  />
                  <TableFilter label="Model" parameter="model" placeholder="Enter model name" />
                  <TableFilter
                    label="Stream"
                    parameter="stream"
                    defaultValue="all"
                    options={[
                      { label: "All request types", value: "all" },
                      { label: "Streaming", value: "stream" },
                      { label: "Non-streaming", value: "nonStream" },
                    ]}
                  />
                </div>
              </DataTableHead>
              <DataTableHead>
                <TableFilter label="Client" parameter="client" placeholder="Enter client name" />
              </DataTableHead>
              <DataTableHead>Tokens</DataTableHead>
              <DataTableHead>Cost</DataTableHead>
              <DataTableHead>Duration</DataTableHead>
              <DataTableHead pinned="right">
                <TableFilter
                  label="Status"
                  parameter="status"
                  defaultValue="all"
                  align="right"
                  options={[
                    { label: "All statuses", value: "all" },
                    { label: "Successful", value: "success" },
                    { label: "Errors", value: "error" },
                  ]}
                />
              </DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
        </DataTable>
      }
    >
      <DataTable className={`table-fixed text-center ${records.length ? "" : "h-full flex-1"}`}>
        <UsageTableColumns />
        <DataTableBody className={records.length ? undefined : "h-full"}>
          {records.length ? (
            records.map((record) => {
              const timestamp = formatDate(record.startAt);
              const statusInfo = getStatus(record.status);
              const cachedInputPercentage = getCachedInputPercentage(record);
              const totalInputTokens = getTotalInputTokens(record);

              return (
                <UsageRecordRow
                  key={record.id}
                  recordId={record.id}
                  recordJson={JSON.stringify(record, null, 2)}
                >
                  <DataTableCell pinned="left">
                    <p
                      className="mx-auto max-w-48 truncate text-[#475467]"
                      title={record.name ?? undefined}
                    >
                      {record.name ?? "-"}
                    </p>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <p className="font-medium text-[#344054]">{timestamp.date}</p>
                    <p className="mt-0.5 font-mono text-xs text-[#98a2b3]">{timestamp.time}</p>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="mx-auto flex max-w-80 items-center justify-center gap-1.5">
                      {isProtocolType(record.protocolType) ? (
                        <ProtocolIcon protocol={record.protocolType} size={16} />
                      ) : (
                        <span className="text-[#98a2b3]">—</span>
                      )}
                      <p
                        className="min-w-0 truncate font-medium text-[#101828]"
                        title={record.model ?? undefined}
                      >
                        {record.model ?? "-"}
                      </p>
                      <span
                        className="shrink-0 text-[#667085]"
                        title={record.isStream ? "Streaming" : "Non-streaming"}
                      >
                        {record.isStream ? (
                          <Waves className="size-4" aria-hidden="true" />
                        ) : (
                          <Box className="size-4" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {record.isStream ? "Streaming" : "Non-streaming"}
                        </span>
                      </span>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <p
                      className="mx-auto max-w-40 truncate text-[#475467]"
                      title={record.client ?? undefined}
                    >
                      {record.client ?? "—"}
                    </p>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    {record.inputTokens !== null ||
                    record.outputTokens !== null ||
                    record.cacheCreationInputTokens !== null ||
                    record.cacheReadInputTokens !== null ? (
                      <div className="mx-auto flex w-fit flex-col items-center gap-1 text-xs tabular-nums">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[#667085]" title="Output tokens">
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                            <span className="sr-only">Output tokens</span>
                          </span>
                          <span className="font-medium text-[#344054]">
                            {formatCompactNumber(record.outputTokens ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[#667085]" title="Input tokens">
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                            <span className="sr-only">Input tokens</span>
                          </span>
                          <span className="font-medium text-[#344054]">
                            {formatCompactNumber(totalInputTokens ?? 0)}
                            {cachedInputPercentage !== null ? (
                              <span
                                className="ml-1 text-[#248a3d]"
                                title={`${cachedInputPercentage}% of input tokens served from cache`}
                              >
                                ({cachedInputPercentage}%)
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#98a2b3]">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    {record.costMicros !== null &&
                    (record.costStatus === "complete" || record.costStatus === "partial") ? (
                      <div className="font-mono text-xs font-medium tabular-nums text-[#344054]">
                        {formatCost(record.costMicros)}
                        {record.costStatus === "partial" ? (
                          <p className="mt-1 font-sans text-[11px] font-medium text-[#b54708]">
                            Partial
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[#98a2b3]">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5 font-medium tabular-nums text-[#344054]">
                      <Clock3 className="size-3.5 text-[#98a2b3]" aria-hidden="true" />
                      {formatDuration(getDuration(record))}
                    </div>
                    {record.timeToFirstByteMs !== null ? (
                      <p className="mt-1 text-xs tabular-nums text-[#98a2b3]">
                        TTFB {formatDuration(record.timeToFirstByteMs)}
                      </p>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell pinned="right">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={
                          statusInfo.successful
                            ? "inline-flex min-w-14 justify-center rounded-full bg-[#ecfdf3] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#027a48]"
                            : "inline-flex min-w-14 justify-center rounded-full bg-[#fef3f2] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#b42318]"
                        }
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </DataTableCell>
                </UsageRecordRow>
              );
            })
          ) : (
            <DataTableEmptyState
              colSpan={8}
              icon={<Database className="size-5" strokeWidth={1.8} aria-hidden="true" />}
              title="No usage records found"
              description={
                activeFilters
                  ? "Try adjusting your filters to see more requests."
                  : "Requests will appear here after they pass through the gateway."
              }
              action={
                activeFilters ? (
                  <Link
                    href="/dashboard/usage"
                    className="mt-4 text-sm font-medium text-[#0369a1] hover:text-[#075985]"
                  >
                    Clear all filters
                  </Link>
                ) : undefined
              }
            />
          )}
        </DataTableBody>
      </DataTable>
    </DataTablePanel>
  );
}

export default function UsagePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<div className="min-h-full flex-1 bg-white" />}>
      <UsageContent searchParams={searchParams} />
    </Suspense>
  );
}
