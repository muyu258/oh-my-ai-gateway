"use client";

import {
  Check,
  ExternalLink,
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
import type {
  ProviderResponseTimePeriod,
  ProviderSummary,
} from "#/lib/database/provider.repository";
import { protocolOptions } from "#/lib/protocol/protocol.registry";
import {
  formatUpdatedAt,
  responseTimeBadge,
  responseTimePeriodLabels,
} from "./provider-view.helpers";

const ProviderTableColumns = () => (
  <colgroup>
    <col className="w-[21%]" />
    <col className="w-[23%]" />
    <col className="w-[16%]" />
    <col className="w-[14%]" />
    <col className="w-[10%]" />
    <col className="w-[16%]" />
  </colgroup>
);

export function ProviderTable({
  providers,
  totalProviders,
  responseTimePeriod,
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
  responseTimePeriod: ProviderResponseTimePeriod;
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
      minWidth={980}
      footer={
        <p className="text-sm text-[#667085]">
          <span className="font-medium tabular-nums text-[#344054]">{providers.length}</span>{" "}
          {providers.length === 1 ? "provider" : "providers"}
          {providers.length !== totalProviders ? ` of ${totalProviders}` : ""}
        </p>
      }
      header={
        <DataTable className="table-fixed text-center">
          <ProviderTableColumns />
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>
                <TableFilter label="Provider" parameter="query" placeholder="Search providers" />
              </DataTableHead>
              <DataTableHead>Endpoint</DataTableHead>
              <DataTableHead>Protocols</DataTableHead>
              <DataTableHead>
                <TableFilter
                  label="Avg response"
                  parameter="responseTimePeriod"
                  defaultValue="30m"
                  options={[
                    { label: "Last 30 minutes", value: "30m" },
                    { label: "Last hour", value: "1h" },
                    { label: "Last 6 hours", value: "6h" },
                    { label: "Last 24 hours", value: "24h" },
                    { label: "Last 7 days", value: "7d" },
                    { label: "Last 30 days", value: "30d" },
                    { label: "All time", value: "all" },
                  ]}
                />
              </DataTableHead>
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

            return (
              <DataTableRow key={provider.name}>
                <DataTableCell>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9] text-[#475569]">
                      <ServerCog className="size-4.5" aria-hidden="true" />
                    </div>
                    {provider.websiteUrl ? (
                      <a
                        href={provider.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 max-w-64 items-center gap-1.5 font-medium text-[#101828] transition hover:text-[#2563eb]"
                        title={`${provider.name}(${provider.models.length})`}
                      >
                        <span className="truncate">
                          {provider.name}({provider.models.length})
                        </span>
                        <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
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
                  <span
                    title={`Average time to first byte over ${responseTimePeriodLabels[responseTimePeriod]}`}
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
                    className={`relative h-6 w-11 rounded-full transition focus:outline-none focus:ring-2 focus:ring-[#7dd3fc] focus:ring-offset-2 disabled:opacity-50 ${provider.enabled ? "bg-[#0284c7]" : "bg-[#d0d5dd]"}`}
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
                <DataTableCell pinned="right">
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
                      className="flex size-9 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#344054] disabled:cursor-not-allowed disabled:opacity-40"
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
                      className="flex size-9 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#344054]"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(provider)}
                      aria-label={`Delete ${provider.name}`}
                      title="Delete"
                      className="flex size-9 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#fef3f2] hover:text-[#d92d20]"
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
              colSpan={6}
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
