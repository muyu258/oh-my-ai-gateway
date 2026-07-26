"use client";

import { Plus, ServerCog } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { ClearFiltersButton } from "#/app/dashboard/_components/clear-filters-button";
import { DashboardPageHeader } from "#/app/dashboard/_components/dashboard-page-header";
import type { ProviderStatisticsPeriod, ProviderSummary } from "#/lib/database/provider.repository";
import { getPublicModels } from "#/lib/provider/provider-models";
import {
  moveProviderOrderAction,
  testProviderAction,
  toggleProviderAction,
} from "../provider.actions";
import { DeleteProviderDialog } from "./delete-provider-dialog";
import { ProviderDialog } from "./provider-dialog";
import { ProviderTable } from "./provider-table";
import { ProviderStatisticsPeriodFilter } from "./provider-statistics-period-filter";
import {
  firstEnabledProtocol,
  moveProviderPriorities,
  type ProviderOrderPlacement,
} from "./provider-view.helpers";

export function ProvidersView({
  providers,
  statisticsPeriod,
}: {
  providers: ProviderSummary[];
  statisticsPeriod: ProviderStatisticsPeriod;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ProviderSummary | "new" | null>(null);
  const [deleting, setDeleting] = useState<ProviderSummary | null>(null);
  const [actionError, setActionError] = useState("");
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [orderedProviders, setOrderedProviders] = useState(providers);
  const [reorderPending, setReorderPending] = useState(false);
  useEffect(() => setOrderedProviders(providers), [providers]);
  const activeFilters = Boolean(
    (searchParams.get("query") ?? "").trim() || statisticsPeriod !== "30m",
  );

  const filteredProviders = useMemo(() => {
    const normalizedQuery = (searchParams.get("query") ?? "").trim().toLowerCase();
    if (!normalizedQuery) return orderedProviders;
    return orderedProviders.filter((provider) =>
      [
        provider.name,
        provider.websiteUrl ?? "",
        provider.baseUrl ?? "",
        ...getPublicModels(provider.models),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [orderedProviders, searchParams]);

  const reorder = async (
    sourceProviderId: string,
    targetProviderId: string,
    placement: ProviderOrderPlacement,
  ) => {
    const previous = orderedProviders;
    const next = moveProviderPriorities(previous, sourceProviderId, targetProviderId, placement);
    if (next === previous) return;

    setOrderedProviders(next);
    setReorderPending(true);
    const result = await moveProviderOrderAction(sourceProviderId, targetProviderId, placement);
    setReorderPending(false);
    if (!result.ok) {
      setOrderedProviders(previous);
      toast.error("Priority not saved", { description: result.error });
      return;
    }
    router.refresh();
  };

  const toggle = (provider: ProviderSummary) => {
    setActionError("");
    startTransition(async () => {
      const result = await toggleProviderAction(provider.id, !provider.enabled);
      if (!result.ok) setActionError(result.error);
      else router.refresh();
    });
  };

  const test = (provider: ProviderSummary) => {
    const protocol = firstEnabledProtocol(provider);
    if (!protocol) {
      toast.error("Test failed", {
        description: `${provider.name} has no enabled protocol.`,
      });
      return;
    }

    setTestingProvider(provider.id);
    startTransition(async () => {
      const result = await testProviderAction(provider.id);
      setTestingProvider(null);
      if (result.ok) {
        toast.success("Connection successful", {
          description: `${provider.name} responded with ${result.model} via ${result.protocol} in ${result.latencyMs} ms.`,
        });
      } else {
        toast.error("Connection failed", { description: result.error });
      }
      router.refresh();
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <DashboardPageHeader
        icon={<ServerCog className="size-5" aria-hidden="true" />}
        title="Providers"
        description="Configure upstream connections, protocols, pricing, and routing availability."
        actions={
          <>
            <ClearFiltersButton active={activeFilters} href="/dashboard/providers" />
            <ProviderStatisticsPeriodFilter value={statisticsPeriod} />
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f172a] px-4 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add provider
            </button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {actionError ? (
          <div className="border-b border-[#e5e7eb] px-5 py-3 sm:px-7">
            <p role="alert" className="text-sm text-[#b42318]">
              {actionError}
            </p>
          </div>
        ) : null}

        <ProviderTable
          providers={filteredProviders}
          totalProviders={orderedProviders.length}
          statisticsPeriod={statisticsPeriod}
          pending={pending || reorderPending}
          testingProvider={testingProvider}
          onAdd={() => setEditing("new")}
          onToggle={toggle}
          onTest={test}
          onEdit={setEditing}
          onDelete={setDeleting}
          onReorder={reorder}
        />
      </div>

      {editing ? (
        <ProviderDialog
          provider={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {deleting ? (
        <DeleteProviderDialog provider={deleting} onClose={() => setDeleting(null)} />
      ) : null}
    </div>
  );
}
