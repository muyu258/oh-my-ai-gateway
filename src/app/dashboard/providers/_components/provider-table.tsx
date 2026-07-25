"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  LoaderCircle,
  Pencil,
  PlugZap,
  Plus,
  ServerCog,
  Trash2,
} from "lucide-react";

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyState,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "#/components/data-table";
import { DataTablePanel } from "#/components/data-table-panel";
import { ProtocolIcon } from "#/components/icons/protocol";
import { TableFilter } from "#/components/table-filter";
import type { ProviderStatisticsPeriod, ProviderSummary } from "#/lib/database/provider.repository";
import { protocolOptions } from "#/lib/protocol/protocol.registry";
import {
  formatUpdatedAt,
  responseTimeBadge,
  statisticsPeriodLabels,
} from "./provider-view.helpers";

const ProviderTableColumns = () => (
  <colgroup>
    <col className="w-[170px]" />
    <col className="w-[280px]" />
    <col className="w-[150px]" />
    <col className="w-[180px]" />
    <col className="w-[140px]" />
    <col className="w-[140px]" />
    <col className="w-[100px]" />
    <col className="w-[120px]" />
  </colgroup>
);

const formatCompactNumber = (value: number): string =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const formatCost = (costMicros: number): string => {
  const whole = Math.floor(costMicros / 1_000_000);
  const fraction = String(costMicros % 1_000_000)
    .padStart(6, "0")
    .replace(/0+$/, "")
    .padEnd(2, "0");
  return `$${new Intl.NumberFormat("en-US").format(whole)}.${fraction}`;
};

const getCachedInputPercentage = (provider: ProviderSummary): number | null => {
  if (
    provider.inputTokens === null ||
    provider.inputTokens <= 0 ||
    provider.cacheReadInputTokens === null
  ) {
    return null;
  }
  return Math.min(100, Math.round((provider.cacheReadInputTokens / provider.inputTokens) * 100));
};

export function ProviderTable({
  providers,
  totalProviders,
  statisticsPeriod,
  pending,
  testingProvider,
  onAdd,
  onToggle,
  onTest,
  onEdit,
  onDelete,
}: {
  providers: ProviderSummary[];
  totalProviders: number;
  statisticsPeriod: ProviderStatisticsPeriod;
  pending: boolean;
  testingProvider: string | null;
  onAdd: () => void;
  onToggle: (provider: ProviderSummary) => void;
  onTest: (provider: ProviderSummary) => void;
  onEdit: (provider: ProviderSummary) => void;
  onDelete: (provider: ProviderSummary) => void;
}) {
  return (
    <DataTablePanel
      minWidth={1280}
      header={
        <DataTable className="table-fixed text-center">
          <ProviderTableColumns />
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead pinned="left">
                <TableFilter label="Provider" parameter="query" placeholder="Search providers" />
              </DataTableHead>
              <DataTableHead>Base URL</DataTableHead>
              <DataTableHead>Protocols</DataTableHead>
              <DataTableHead>Tokens</DataTableHead>
              <DataTableHead>Cost</DataTableHead>
              <DataTableHead>Avg TTFB</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead pinned="right">Actions</DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
        </DataTable>
      }
    >
      <DataTable className="table-fixed text-center">
        <ProviderTableColumns />
        <DataTableBody>
          {providers.map((provider) => {
            const responseTime = responseTimeBadge(provider.averageResponseTimeMs);
            const cachedInputPercentage = getCachedInputPercentage(provider);
            const hasTokens = provider.inputTokens !== null || provider.outputTokens !== null;

            return (
              <DataTableRow key={provider.name}>
                <DataTableCell pinned="left">
                  <div className="flex items-center justify-center">
                    {provider.websiteUrl ? (
                      <a
                        href={provider.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 max-w-64 truncate font-medium text-[#0369a1] transition hover:text-[#075985]"
                        title={`${provider.name}(${provider.models.length})`}
                      >
                        {provider.name}({provider.models.length})
                      </a>
                    ) : (
                      <p
                        className="max-w-64 truncate font-medium text-[#101828]"
                        title={`${provider.name}(${provider.models.length})`}
                      >
                        {provider.name}({provider.models.length})
                      </p>
                    )}
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <p
                    className="mx-auto max-w-60 truncate font-mono text-xs text-[#475467]"
                    title={provider.baseUrl ?? undefined}
                  >
                    {provider.baseUrl ?? "Provider default"}
                  </p>
                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Updated {formatUpdatedAt(provider.updatedAt)}
                  </p>
                </DataTableCell>
                <DataTableCell>
                  <div className="mx-auto flex w-fit max-w-56 flex-wrap justify-center gap-1.5">
                    {protocolOptions.map(({ value: protocol }) =>
                      provider.protocols[protocol]?.enabled ? (
                        <ProtocolIcon key={protocol} protocol={protocol} />
                      ) : null,
                    )}
                  </div>
                </DataTableCell>
                <DataTableCell className="whitespace-nowrap">
                  {hasTokens ? (
                    <div className="mx-auto flex w-fit flex-col items-center gap-1 text-xs tabular-nums">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[#667085]" title="Output tokens">
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                          <span className="sr-only">Output tokens</span>
                        </span>
                        <span className="font-medium text-[#344054]">
                          {provider.outputTokens === null
                            ? "—"
                            : formatCompactNumber(provider.outputTokens)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[#667085]" title="Input tokens">
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                          <span className="sr-only">Input tokens</span>
                        </span>
                        <span className="font-medium text-[#344054]">
                          {provider.inputTokens === null
                            ? "—"
                            : formatCompactNumber(provider.inputTokens)}
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
                  {provider.costMicros !== null ? (
                    <div className="font-mono text-xs font-medium tabular-nums text-[#344054]">
                      {formatCost(provider.costMicros)}
                      {!provider.costComplete ? (
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
                  <span
                    title={`Average time to first byte over ${statisticsPeriodLabels[statisticsPeriod]}`}
                    className={`inline-flex min-w-16 justify-center rounded-md px-2.5 py-1 font-mono text-xs font-medium tabular-nums ${responseTime.className}`}
                  >
                    {responseTime.label}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={provider.enabled}
                    aria-label={`${provider.enabled ? "Disable" : "Enable"} ${provider.name}`}
                    title={provider.enabled ? "Disable" : "Enable"}
                    disabled={pending}
                    onClick={() => onToggle(provider)}
                    className={`relative h-6 w-11 rounded-full transition disabled:opacity-50 ${provider.enabled ? "bg-[#0284c7]" : "bg-[#d0d5dd]"}`}
                  >
                    <span
                      className={`absolute top-0.5 flex size-5 items-center justify-center rounded-full bg-white shadow-sm transition ${provider.enabled ? "left-5" : "left-0.5"}`}
                    >
                      {provider.enabled ? (
                        <Check
                          className="size-3 text-[#0284c7]"
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                  </button>
                </DataTableCell>
                <DataTableCell pinned="right" className="px-2">
                  <div className="flex justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => onTest(provider)}
                      disabled={
                        pending ||
                        !provider.enabled ||
                        !Object.values(provider.protocols).some((config) => config.enabled)
                      }
                      aria-label={`Test ${provider.name}`}
                      title={
                        provider.enabled ? "Test first protocol" : "Enable provider before testing"
                      }
                      className="flex size-8 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#344054] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {testingProvider === provider.name ? (
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <PlugZap className="size-4" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(provider)}
                      aria-label={`Edit ${provider.name}`}
                      title="Edit"
                      className="flex size-8 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#344054]"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(provider)}
                      aria-label={`Delete ${provider.name}`}
                      title="Delete"
                      className="flex size-8 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#fef3f2] hover:text-[#d92d20]"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            );
          })}
          {!providers.length ? (
            <DataTableEmptyState
              colSpan={8}
              className="min-h-80"
              icon={<ServerCog className="size-5" aria-hidden="true" />}
              title={totalProviders ? "No providers found" : "No providers configured"}
              description={
                totalProviders ? "Try another search." : "Add a provider to start routing models."
              }
              action={
                !totalProviders ? (
                  <button
                    type="button"
                    onClick={onAdd}
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-[#d0d5dd] px-3 text-sm font-medium text-[#344054] transition hover:bg-[#f9fafb]"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Add provider
                  </button>
                ) : undefined
              }
            />
          ) : null}
        </DataTableBody>
      </DataTable>
    </DataTablePanel>
  );
}
