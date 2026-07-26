"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  LoaderCircle,
  Pencil,
  PlugZap,
  Plus,
  ServerCog,
  Trash2,
} from "lucide-react";
import { useState, type ReactNode, type SyntheticEvent } from "react";

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
import { OverflowTooltip } from "#/components/overflow-tooltip";
import { TableFilter } from "#/components/table-filter";
import type { ProviderStatisticsPeriod, ProviderSummary } from "#/lib/database/provider.repository";
import { getProviderModelCount } from "#/lib/provider/provider-models";
import { protocolOptions } from "#/lib/protocol/protocol.registry";
import {
  responseTimeBadge,
  statisticsPeriodLabels,
  type ProviderOrderPlacement,
} from "./provider-view.helpers";

const ProviderTableColumns = () => (
  <colgroup>
    <col className="w-[190px]" />
    <col className="w-[300px]" />
    <col className="w-[150px]" />
    <col className="w-[180px]" />
    <col className="w-[140px]" />
    <col className="w-[140px]" />
    <col className="w-[180px]" />
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

const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  Boolean(target.closest("button, a, input, select, textarea, [data-no-drag]"));

function SortableProviderRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const { active, attributes, listeners, over, setNodeRef, transform, transition } = useSortable({
    id,
    disabled,
    animateLayoutChanges: () => false,
    transition: { duration: 180, easing: "ease" },
  });
  const state = active?.id === id ? "active" : over?.id === id && active ? "target" : undefined;
  const activate = (event: SyntheticEvent) => {
    if (isInteractiveTarget(event.target)) return;
    const listener = listeners?.[event.type === "mousedown" ? "onMouseDown" : "onTouchStart"];
    listener?.(event);
  };

  return (
    <DataTableRow
      ref={setNodeRef}
      tabIndex={disabled ? -1 : 0}
      aria-roledescription="sortable provider"
      aria-describedby={attributes["aria-describedby"]}
      data-drag-state={state}
      onMouseDown={activate}
      onTouchStart={activate}
      onKeyDown={(event) => {
        if (!isInteractiveTarget(event.target)) listeners?.onKeyDown?.(event);
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: state === "active" ? "relative" : undefined,
        zIndex: state === "active" ? 30 : undefined,
        touchAction: "manipulation",
      }}
      className="provider-sortable-row cursor-grab focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0284c7] active:cursor-grabbing"
    >
      {children}
    </DataTableRow>
  );
}

function ProviderRowCells({
  provider,
  statisticsPeriod,
  pending,
  testingProvider,
  onToggle,
  onTest,
  onEdit,
  onDelete,
}: {
  provider: ProviderSummary;
  statisticsPeriod: ProviderStatisticsPeriod;
  pending: boolean;
  testingProvider: string | null;
  onToggle: (provider: ProviderSummary) => void;
  onTest: (provider: ProviderSummary) => void;
  onEdit: (provider: ProviderSummary) => void;
  onDelete: (provider: ProviderSummary) => void;
}) {
  const responseTime = responseTimeBadge(provider.averageResponseTimeMs);
  const cachedInputPercentage = getCachedInputPercentage(provider);
  const hasTokens = provider.inputTokens !== null || provider.outputTokens !== null;
  const modelCount = getProviderModelCount(provider.models);

  return (
    <>
      <DataTableCell pinned="left">
        <div className="flex items-center justify-center">
          {provider.websiteUrl ? (
            <OverflowTooltip content={`${provider.name}(${modelCount})`}>
              <a
                href={provider.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 max-w-full truncate font-medium text-[#0369a1] transition hover:text-[#075985]"
              >
                {provider.name}({modelCount})
              </a>
            </OverflowTooltip>
          ) : (
            <OverflowTooltip content={`${provider.name}(${modelCount})`}>
              <p
                tabIndex={0}
                className="max-w-full truncate font-medium text-[#101828] outline-none"
              >
                {provider.name}({modelCount})
              </p>
            </OverflowTooltip>
          )}
        </div>
        <OverflowTooltip content={provider.id}>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(provider.id)}
            className="mx-auto mt-1 flex max-w-full items-center gap-1 font-mono text-[10px] text-[#98a2b3] transition hover:text-[#475467]"
            aria-label={`Copy provider ID for ${provider.name}`}
          >
            <span data-overflow-target className="min-w-0 truncate">
              {provider.id}
            </span>
            <Copy className="size-3 shrink-0" aria-hidden="true" />
          </button>
        </OverflowTooltip>
      </DataTableCell>
      <DataTableCell>
        <OverflowTooltip content={provider.baseUrl ?? "Provider default"}>
          <p
            tabIndex={0}
            className="mx-auto max-w-full truncate font-mono text-xs text-[#475467] outline-none"
          >
            {provider.baseUrl ?? "Provider default"}
          </p>
        </OverflowTooltip>
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
                {provider.outputTokens === null ? "—" : formatCompactNumber(provider.outputTokens)}
              </span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-[#667085]" title="Input tokens">
                <ArrowUp className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Input tokens</span>
              </span>
              <span className="font-medium text-[#344054]">
                {provider.inputTokens === null ? "—" : formatCompactNumber(provider.inputTokens)}
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
      <DataTableCell pinned="right" className="px-2">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            role="switch"
            aria-checked={provider.enabled}
            aria-label={`${provider.enabled ? "Disable" : "Enable"} ${provider.name}`}
            title={provider.enabled ? "Disable" : "Enable"}
            disabled={pending}
            onClick={() => onToggle(provider)}
            className={`relative mr-1 h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${provider.enabled ? "bg-[#0284c7]" : "bg-[#d0d5dd]"}`}
          >
            <span
              className={`absolute top-0.5 flex size-5 items-center justify-center rounded-full bg-white shadow-sm transition ${provider.enabled ? "left-5" : "left-0.5"}`}
            >
              {provider.enabled ? (
                <Check className="size-3 text-[#0284c7]" strokeWidth={3} aria-hidden="true" />
              ) : null}
            </span>
          </button>
          <span className="mx-1 h-5 w-px bg-[#e5e7eb]" aria-hidden="true" />
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
              provider.enabled
                ? "Test default model and protocol"
                : "Enable provider before testing"
            }
            className="flex size-8 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#344054] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {testingProvider === provider.id ? (
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
    </>
  );
}

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
  onReorder,
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
  onReorder: (
    sourceProviderId: string,
    targetProviderId: string,
    placement: ProviderOrderPlacement,
  ) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const endDrag = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const sourceIndex = providers.findIndex(({ id }) => id === active.id);
    const targetIndex = providers.findIndex(({ id }) => id === over.id);
    if (sourceIndex < 0 || targetIndex < 0) return;
    onReorder(String(active.id), String(over.id), sourceIndex < targetIndex ? "after" : "before");
  };
  const activeProvider = providers.find(({ id }) => id === activeId);

  return (
    <DndContext
      id="provider-priority-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      autoScroll={{ acceleration: 10, threshold: { x: 0.1, y: 0.18 } }}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={endDrag}
    >
      <SortableContext
        items={providers.map(({ id }) => id)}
        strategy={verticalListSortingStrategy}
        disabled={pending}
      >
        <DataTablePanel minWidth={1280}>
          <DataTable aria-label="Providers" className="table-fixed text-center">
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
                <DataTableHead pinned="right">Actions</DataTableHead>
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {providers.map((provider) => (
                <SortableProviderRow key={provider.id} id={provider.id} disabled={pending}>
                  <ProviderRowCells
                    provider={provider}
                    statisticsPeriod={statisticsPeriod}
                    pending={pending}
                    testingProvider={testingProvider}
                    onToggle={onToggle}
                    onTest={onTest}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </SortableProviderRow>
              ))}
              {!providers.length ? (
                <DataTableEmptyState
                  colSpan={7}
                  className="min-h-80"
                  icon={<ServerCog className="size-5" aria-hidden="true" />}
                  title={totalProviders ? "No providers found" : "No providers configured"}
                  description={
                    totalProviders
                      ? "Try another search."
                      : "Add a provider to start routing models."
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
      </SortableContext>
      <DragOverlay adjustScale={false} dropAnimation={null}>
        {activeProvider ? (
          <div
            data-provider-drag-overlay
            inert
            aria-hidden="true"
            className="h-full w-full overflow-hidden bg-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] ring-1 ring-inset ring-[#bae6fd]"
          >
            <DataTable className="h-full table-fixed text-center">
              <ProviderTableColumns />
              <DataTableBody>
                <DataTableRow className="bg-white hover:bg-white">
                  <ProviderRowCells
                    provider={activeProvider}
                    statisticsPeriod={statisticsPeriod}
                    pending={pending}
                    testingProvider={testingProvider}
                    onToggle={onToggle}
                    onTest={onTest}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </DataTableRow>
              </DataTableBody>
            </DataTable>
          </div>
        ) : null}
      </DragOverlay>
      <span className="sr-only" aria-live="polite">
        {activeId ? "Reordering provider priority" : ""}
      </span>
    </DndContext>
  );
}
