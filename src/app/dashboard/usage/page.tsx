import { ArrowLeft, ArrowRight, Clock3, Database } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageSizeSelect } from "#/app/dashboard/usage/_components/usage-table-filter";
import { isProtocolType, ProtocolIcon } from "#/components/icons/protocol";
import { TableFilter } from "#/components/table-filter";
import {
  getRequestRecords,
  type RequestRecordPeriodFilter,
  type RequestRecordStatusFilter,
} from "#/infra/database/request-record.repository";
import type { RequestRecord } from "#/infra/database/drizzle/schema";

export const metadata: Metadata = {
  title: "Usage | Oh My AI Gateway",
};

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const pageSizes = new Set([10, 20, 50, 100]);
const statusFilters = new Set<RequestRecordStatusFilter>(["all", "success", "error"]);
const periodFilters = new Set<RequestRecordPeriodFilter>(["24h", "7d", "30d", "all"]);
const protocolFilters = new Set(["anthropic", "openaiCompatible", "openaiResponse"]);

type SearchParams = Record<string, string | string[] | undefined>;

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const formatNumber = (value: number): string => new Intl.NumberFormat("en-US").format(value);

const formatCompactNumber = (value: number): string =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

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

const getStatus = (status: string | null) => {
  const code = Number(status);
  const successful = Number.isFinite(code) && code >= 200 && code < 400;

  return {
    label: status ?? "Unknown",
    successful,
  };
};

const getTotalTokens = (record: RequestRecord): number =>
  (record.usage?.inputTokens ?? 0) + (record.usage?.outputTokens ?? 0);

const getDuration = (record: RequestRecord): number | null =>
  record.endAt ? record.endAt.getTime() - record.startAt.getTime() : null;

const pageHref = (params: URLSearchParams, page: number): string => {
  const nextParams = new URLSearchParams(params);
  if (page <= 1) nextParams.delete("page");
  else nextParams.set("page", String(page));
  const query = nextParams.toString();
  return query ? `/dashboard/usage?${query}` : "/dashboard/usage";
};

export default async function UsagePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const model = firstValue(resolvedSearchParams.model)?.trim() ?? "";
  const client = firstValue(resolvedSearchParams.client)?.trim() ?? "";
  const requestedProtocol = firstValue(resolvedSearchParams.protocolType);
  const protocolType =
    requestedProtocol && protocolFilters.has(requestedProtocol) ? requestedProtocol : "";
  const requestedStatus = firstValue(resolvedSearchParams.status) as
    | RequestRecordStatusFilter
    | undefined;
  const requestedPeriod = firstValue(resolvedSearchParams.period) as
    | RequestRecordPeriodFilter
    | undefined;
  const status = requestedStatus && statusFilters.has(requestedStatus) ? requestedStatus : "all";
  const period = requestedPeriod && periodFilters.has(requestedPeriod) ? requestedPeriod : "7d";
  const requestedPage = Number.parseInt(firstValue(resolvedSearchParams.page) ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedPageSize = Number.parseInt(
    firstValue(resolvedSearchParams.pageSize) ?? String(DEFAULT_PAGE_SIZE),
    10,
  );
  const pageSize = pageSizes.has(requestedPageSize) ? requestedPageSize : DEFAULT_PAGE_SIZE;

  const { records, total } = await getRequestRecords({
    filters: { model, client, protocolType, status, period },
    page,
    pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const activeFilters = Boolean(
    model || client || protocolType || status !== "all" || period !== "7d",
  );
  const queryParams = new URLSearchParams();
  if (model) queryParams.set("model", model);
  if (client) queryParams.set("client", client);
  if (protocolType) queryParams.set("protocolType", protocolType);
  if (status !== "all") queryParams.set("status", status);
  if (period !== "7d") queryParams.set("period", period);
  if (pageSize !== DEFAULT_PAGE_SIZE) queryParams.set("pageSize", String(pageSize));

  return (
    <div className="h-full min-h-0 w-full overflow-hidden bg-white">
      <div className="flex h-full min-h-0 w-full flex-col">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[980px] border-collapse text-center">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#e5e7eb] bg-[#fcfcfd] text-xs font-medium uppercase tracking-wide text-[#667085]">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">
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
                  </th>
                  <th className="px-5 py-3">
                    <div className="flex items-center justify-center gap-3">
                      <TableFilter label="Model" parameter="model" placeholder="Enter model name" />
                      <TableFilter
                        label="Protocol"
                        parameter="protocolType"
                        options={[
                          { label: "All protocols", value: "" },
                          { label: "Anthropic", value: "anthropic" },
                          { label: "Chat Completions", value: "openaiCompatible" },
                          { label: "Responses", value: "openaiResponse" },
                        ]}
                      />
                    </div>
                  </th>
                  <th className="px-5 py-3">
                    <TableFilter
                      label="Client"
                      parameter="client"
                      placeholder="Enter client name"
                    />
                  </th>
                  <th className="px-5 py-3">Tokens</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">
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
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef0f3]">
                {records.length ? (
                  records.map((record) => {
                    const timestamp = formatDate(record.startAt);
                    const statusInfo = getStatus(record.status);
                    const tokens = getTotalTokens(record);

                    return (
                      <tr key={record.id} className="text-sm transition hover:bg-[#fcfcfd]">
                        <td className="px-5 py-4">
                          <p
                            className="mx-auto max-w-48 truncate text-[#475467]"
                            title={record.name ?? undefined}
                          >
                            {record.name ?? "-"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <p className="font-medium text-[#344054]">{timestamp.date}</p>
                          <p className="mt-0.5 font-mono text-xs text-[#98a2b3]">
                            {timestamp.time}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="mx-auto flex max-w-80 items-center justify-center gap-2">
                            {isProtocolType(record.protocolType) ? (
                              <ProtocolIcon protocol={record.protocolType} />
                            ) : (
                              <span className="text-[#98a2b3]">—</span>
                            )}
                            <p
                              className="min-w-0 truncate font-medium text-[#101828]"
                              title={record.model ?? undefined}
                            >
                              {record.model ?? "-"}
                            </p>
                            <span className="shrink-0 rounded-md bg-[#f2f4f7] px-2 py-1 text-xs font-medium text-[#667085]">
                              {record.isStream ? "Stream" : "Non-stream"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p
                            className="mx-auto max-w-40 truncate text-[#475467]"
                            title={record.client ?? undefined}
                          >
                            {record.client ?? "—"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <p className="font-medium tabular-nums text-[#344054]">
                            {tokens ? formatNumber(tokens) : "—"}
                          </p>
                          {record.usage ? (
                            <p className="mt-1 text-xs tabular-nums text-[#98a2b3]">
                              {formatCompactNumber(record.usage.inputTokens ?? 0)} in ·{" "}
                              {formatCompactNumber(record.usage.outputTokens ?? 0)} out
                            </p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center justify-center gap-1.5 font-medium tabular-nums text-[#344054]">
                            <Clock3 className="size-3.5 text-[#98a2b3]" aria-hidden="true" />
                            {formatDuration(getDuration(record))}
                          </div>
                          {record.timeToFirstByteMs !== null ? (
                            <p className="mt-1 text-xs tabular-nums text-[#98a2b3]">
                              TTFB {formatDuration(record.timeToFirstByteMs)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={
                              statusInfo.successful
                                ? "inline-flex min-w-14 justify-center rounded-full bg-[#ecfdf3] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#027a48]"
                                : "inline-flex min-w-14 justify-center rounded-full bg-[#fef3f2] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#b42318]"
                            }
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                        <div className="flex size-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#475569]">
                          <Database className="size-5" strokeWidth={1.8} aria-hidden="true" />
                        </div>
                        <h3 className="mt-4 text-sm font-semibold text-[#101828]">
                          No usage records found
                        </h3>
                        <p className="mt-1 max-w-sm text-sm text-[#667085]">
                          {activeFilters
                            ? "Try adjusting your filters to see more requests."
                            : "Requests will appear here after they pass through the gateway."}
                        </p>
                        {activeFilters ? (
                          <Link
                            href="/dashboard/usage"
                            className="mt-4 text-sm font-medium text-[#0369a1] hover:text-[#075985]"
                          >
                            Clear all filters
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-[#e5e7eb] px-4 py-3 sm:px-5">
            <p className="text-sm text-[#667085]">
              <span className="font-medium tabular-nums text-[#344054]">{formatNumber(total)}</span>{" "}
              records
            </p>
            <div className="flex flex-wrap items-center justify-end gap-4">
              <PageSizeSelect value={pageSize} />
              {total > pageSize ? (
                <>
                  <p className="text-sm text-[#667085]">
                    Page <span className="font-medium text-[#344054]">{currentPage}</span> of{" "}
                    {totalPages}
                  </p>
                  <div className="flex gap-2">
                    {currentPage > 1 ? (
                      <Link
                        href={pageHref(queryParams, currentPage - 1)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d0d5dd] px-3 text-sm font-medium text-[#344054] transition hover:bg-[#f8fafc]"
                      >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Previous
                      </Link>
                    ) : (
                      <span className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-[#e5e7eb] px-3 text-sm font-medium text-[#98a2b3]">
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Previous
                      </span>
                    )}
                    {currentPage < totalPages ? (
                      <Link
                        href={pageHref(queryParams, currentPage + 1)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d0d5dd] px-3 text-sm font-medium text-[#344054] transition hover:bg-[#f8fafc]"
                      >
                        Next
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    ) : (
                      <span className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-[#e5e7eb] px-3 text-sm font-medium text-[#98a2b3]">
                        Next
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
