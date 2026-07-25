"use client";

import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import type {
  ProviderResponseTimePeriod,
  ProviderSummary,
} from "#/lib/database/provider.repository";
import { testProviderProtocolAction, toggleProviderAction } from "../provider.actions";
import { DeleteProviderDialog } from "./delete-provider-dialog";
import { ProviderDialog } from "./provider-dialog";
import { ProviderTable } from "./provider-table";
import { firstEnabledProtocol } from "./provider-view.helpers";

export function ProvidersView({
  providers,
  responseTimePeriod,
}: {
  providers: ProviderSummary[];
  responseTimePeriod: ProviderResponseTimePeriod;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ProviderSummary | "new" | null>(null);
  const [deleting, setDeleting] = useState<ProviderSummary | null>(null);
  const [actionError, setActionError] = useState("");
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const filteredProviders = useMemo(() => {
    const normalizedQuery = (searchParams.get("query") ?? "").trim().toLowerCase();
    if (!normalizedQuery) return providers;
    return providers.filter((provider) =>
      [provider.name, provider.websiteUrl ?? "", provider.baseUrl ?? "", ...provider.models]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [providers, searchParams]);

  const toggle = (provider: ProviderSummary) => {
    setActionError("");
    startTransition(async () => {
      const result = await toggleProviderAction(provider.name, !provider.enabled);
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

    setTestingProvider(provider.name);
    startTransition(async () => {
      const result = await testProviderProtocolAction(provider.name, protocol);
      setTestingProvider(null);
      if (result.ok) {
        toast.success("Connection successful", {
          description: `${provider.name} responded with ${result.model} in ${result.latencyMs} ms.`,
        });
      } else {
        toast.error("Connection failed", { description: result.error });
      }
      router.refresh();
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e7eb] px-5 py-5 sm:px-7">
        <h1 className="text-xl font-semibold text-[#101828]">Providers</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f172a] px-4 text-sm font-semibold text-white transition hover:bg-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add provider
        </button>
      </header>

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
          totalProviders={providers.length}
          responseTimePeriod={responseTimePeriod}
          pending={pending}
          testingProvider={testingProvider}
          onAdd={() => setEditing("new")}
          onToggle={toggle}
          onTest={test}
          onEdit={setEditing}
          onDelete={setDeleting}
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
