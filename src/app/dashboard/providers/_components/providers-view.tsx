"use client";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  LoaderCircle,
  Pencil,
  PlugZap,
  Plus,
  ServerCog,
  Trash2,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

import { ProtocolIcon } from "#/components/icons/protocol";
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
import { FloatingInput } from "#/components/floating-input";
import { FormSectionCard } from "#/components/form-section-card";
import { Modal } from "#/components/modal";
import { TableFilter } from "#/components/table-filter";
import { Toast, type ToastMessage } from "#/components/toast";
import type {
  ProviderResponseTimePeriod,
  ProviderSummary,
} from "#/infra/database/provider.repository";
import { ProtocolType } from "#/infra/gateway/protocol/protocol.types";
import {
  createProviderAction,
  deleteProviderAction,
  discoverProviderModelsAction,
  testProviderProtocolAction,
  toggleProviderAction,
  updateProviderAction,
} from "../provider.actions";
import type { ProviderFormInput } from "../provider-form.types";

const protocolOptions = [
  {
    value: ProtocolType.OpenaiCompatible,
    label: "Chat Completions",
    defaultEndpoint: "/v1/chat/completions",
  },
  {
    value: ProtocolType.OpenaiResponse,
    label: "Responses",
    defaultEndpoint: "/v1/responses",
  },
  {
    value: ProtocolType.Anthropic,
    label: "Anthropic Messages",
    defaultEndpoint: "/v1/messages",
  },
];

const emptyForm: ProviderFormInput = {
  name: "",
  models: [],
  testModel: "",
  protocols: {
    [ProtocolType.OpenaiCompatible]: { endpoint: "", enabled: true },
  },
  websiteUrl: "",
  baseUrl: "",
  providerToken: "",
  enabled: true,
};

const formatUpdatedAt = (date: Date): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));

const responseTimeBadge = (milliseconds: number | null): { label: string; className: string } => {
  if (milliseconds === null) {
    return { label: "None", className: "bg-[#f2f4f7] text-[#667085]" };
  }
  if (milliseconds < 3000) {
    return { label: `${Math.round(milliseconds)} ms`, className: "bg-[#ecfdf3] text-[#027a48]" };
  }
  if (milliseconds < 10_000) {
    return { label: `${Math.round(milliseconds)} ms`, className: "bg-[#fffaeb] text-[#b54708]" };
  }
  return { label: `${Math.round(milliseconds)} ms`, className: "bg-[#fef3f2] text-[#b42318]" };
};

const responseTimePeriodLabels: Record<ProviderResponseTimePeriod, string> = {
  "30m": "30m",
  "1h": "1h",
  "6h": "6h",
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
  all: "all time",
};

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

function ProviderDialog({
  provider,
  onClose,
}: {
  provider?: ProviderSummary;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [persistedName, setPersistedName] = useState(provider?.name ?? "");
  const [models, setModels] = useState<string[]>(provider ? [...provider.models] : []);
  const [modelDraft, setModelDraft] = useState("");
  const [expandedProtocol, setExpandedProtocol] = useState<ProtocolType | null>(null);
  const [activeProtocolAction, setActiveProtocolAction] = useState<{
    protocol: ProtocolType;
    type: "test" | "models";
  } | null>(null);
  const [connectionResults, setConnectionResults] = useState<
    Partial<Record<ProtocolType, { ok: boolean; message: string }>>
  >({});
  const [modelDiff, setModelDiff] = useState<{
    protocol: ProtocolType;
    models: string[];
    selected: string[];
  } | null>(null);
  const [form, setForm] = useState<ProviderFormInput>(
    provider
      ? {
          name: provider.name,
          models: provider.models,
          testModel: provider.testModel ?? provider.models[0] ?? "",
          protocols: provider.protocols,
          websiteUrl: provider.websiteUrl ?? "",
          baseUrl: provider.baseUrl ?? "",
          providerToken: "",
          enabled: provider.enabled,
        }
      : emptyForm,
  );

  const formInput = (nextModels = models): ProviderFormInput => {
    const sortedModels = [...nextModels].sort((left, right) => left.localeCompare(right));
    return {
      ...form,
      models: sortedModels,
      testModel: sortedModels.includes(form.testModel) ? form.testModel : (sortedModels[0] ?? ""),
    };
  };

  const addModel = () => {
    const model = modelDraft.trim();
    if (model && !models.includes(model)) {
      setModels((current) => [...current, model].sort((left, right) => left.localeCompare(right)));
      if (!form.testModel) setForm((current) => ({ ...current, testModel: model }));
    }
    setModelDraft("");
  };

  const runProtocolAction = (protocol: ProtocolType, type: "test" | "models") => {
    if (!provider) return;
    setError("");
    setActiveProtocolAction({ protocol, type });

    startTransition(async () => {
      const saveResult = await updateProviderAction(persistedName, formInput());
      if (!saveResult.ok) {
        setError(saveResult.error);
        setActiveProtocolAction(null);
        return;
      }
      const savedName = form.name.trim();
      setPersistedName(savedName);

      if (type === "test") {
        const result = await testProviderProtocolAction(savedName, protocol);
        setActiveProtocolAction(null);
        setConnectionResults((current) => ({
          ...current,
          [protocol]: result.ok
            ? { ok: true, message: `${result.latencyMs} ms · ${result.model}` }
            : { ok: false, message: result.error },
        }));
        return;
      }

      const result = await discoverProviderModelsAction(savedName, protocol);
      setActiveProtocolAction(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const existingModels = new Set(models);
      setModelDiff({
        protocol,
        models: result.models,
        selected: result.models.filter((model) => !existingModels.has(model)),
      });
    });
  };

  const addDiscoveredModels = () => {
    if (!modelDiff || !provider) return;
    const mergedModels = [...new Set([...models, ...modelDiff.selected])].sort((left, right) =>
      left.localeCompare(right),
    );
    setError("");

    startTransition(async () => {
      const result = await updateProviderAction(persistedName, formInput(mergedModels));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPersistedName(form.name.trim());
      setModels(mergedModels);
      if (!form.testModel && mergedModels[0]) {
        setForm((current) => ({ ...current, testModel: mergedModels[0] ?? "" }));
      }
      setModelDiff(null);
      router.refresh();
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const input = formInput();

    startTransition(async () => {
      const result = provider
        ? await updateProviderAction(persistedName, input)
        : await createProviderAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  };

  return (
    <>
      <Modal
        title={provider ? "Edit provider" : "Add provider"}
        onClose={onClose}
        size="lg"
        panelClassName="h-[min(46rem,calc(100svh-1.5rem))] sm:h-[min(46rem,calc(100svh-2.5rem))]"
        bodyClassName="flex overflow-hidden p-0 sm:p-0"
      >
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-6 pt-3 sm:px-6">
            <FormSectionCard title="Provider details">
              <div className="grid gap-5 sm:grid-cols-2">
                <FloatingInput
                  label="Name"
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="OpenAI"
                  containerClassName="sm:col-span-2"
                />

                <FloatingInput
                  label="Website"
                  type="url"
                  value={form.websiteUrl}
                  onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })}
                  placeholder="https://openai.com"
                  containerClassName="sm:col-span-2"
                />

                <FloatingInput
                  label="Base URL"
                  type="url"
                  value={form.baseUrl}
                  onChange={(event) => setForm({ ...form, baseUrl: event.target.value })}
                  placeholder="https://api.openai.com"
                  containerClassName="sm:col-span-2"
                />

                <FloatingInput
                  label="API token"
                  type="password"
                  required={!provider}
                  autoComplete="new-password"
                  value={form.providerToken}
                  onChange={(event) => setForm({ ...form, providerToken: event.target.value })}
                  placeholder={provider ? "Unchanged" : "sk-..."}
                  containerClassName="sm:col-span-2"
                  inputClassName="font-mono"
                />
              </div>
            </FormSectionCard>

            <FormSectionCard
              title="Models"
              action={
                <button
                  type="button"
                  disabled={!models.length || pending}
                  onClick={() => {
                    setModels([]);
                    setForm((current) => ({ ...current, testModel: "" }));
                  }}
                  aria-label="Clear all models"
                  title="Clear all models"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-[#667085] transition hover:bg-[#fef3f2] hover:text-[#d92d20] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              }
            >
              <div className="flex flex-wrap content-start items-start gap-2 py-1">
                {models.map((model) => {
                  const selected = form.testModel === model;
                  return (
                    <span
                      key={model}
                      className={`group inline-flex h-8 max-w-full items-center rounded-md pr-1 font-mono text-xs shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition ${
                        selected
                          ? "bg-[#e0f2fe] text-[#0369a1] ring-1 ring-inset ring-[#7dd3fc]"
                          : "bg-white text-[#344054]"
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={`Use ${model} as test model`}
                        title={selected ? "Selected test model" : "Use as test model"}
                        onClick={() => setForm((current) => ({ ...current, testModel: model }))}
                        className="flex h-full min-w-0 items-center rounded-l-md pl-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                      >
                        <span className="max-w-56 truncate">{model}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextModels = models.filter(
                            (currentModel) => currentModel !== model,
                          );
                          setModels(nextModels);
                          if (form.testModel === model) {
                            setForm((current) => ({
                              ...current,
                              testModel: nextModels[0] ?? "",
                            }));
                          }
                        }}
                        aria-label={`Remove ${model}`}
                        title="Remove model"
                        className={`group/remove ml-1 flex size-6 shrink-0 items-center justify-center rounded transition focus:opacity-100 ${
                          selected
                            ? "text-[#0284c7] hover:bg-[#bae6fd] hover:text-[#075985]"
                            : "text-[#98a2b3] opacity-100 hover:bg-[#e4e7ec] hover:text-[#475467] sm:opacity-0 sm:group-hover:opacity-100"
                        }`}
                      >
                        {selected ? (
                          <>
                            <PlugZap
                              className="size-3.5 group-hover:hidden group-focus-visible/remove:hidden"
                              aria-hidden="true"
                            />
                            <X
                              className="hidden size-3.5 group-hover:block group-focus-visible/remove:block"
                              aria-hidden="true"
                            />
                          </>
                        ) : (
                          <X className="size-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </span>
                  );
                })}
                <input
                  value={modelDraft}
                  onChange={(event) => setModelDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    addModel();
                  }}
                  aria-label="Add model"
                  placeholder="Add model"
                  className="h-8 w-40 max-w-full shrink-0 rounded-md border-0 bg-white px-2.5 font-mono text-xs text-[#344054] shadow-[0_1px_2px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-[#98a2b3] focus:ring-2 focus:ring-[#7dd3fc]"
                />
              </div>
            </FormSectionCard>

            <FormSectionCard title="Protocols">
              <div className="space-y-1.5">
                {protocolOptions.map((option) => {
                  const protocolConfig = form.protocols[option.value];
                  const checked = protocolConfig?.enabled ?? false;
                  const expanded = checked && expandedProtocol === option.value;
                  const actionPending = activeProtocolAction?.protocol === option.value && pending;
                  const connectionResult = connectionResults[option.value];
                  const toggleProtocol = () => {
                    setForm({
                      ...form,
                      protocols: {
                        ...form.protocols,
                        [option.value]: {
                          endpoint: protocolConfig?.endpoint ?? "",
                          enabled: !checked,
                        },
                      },
                    });
                    if (checked && expandedProtocol === option.value) {
                      setExpandedProtocol(null);
                    }
                  };

                  return (
                    <div
                      key={option.value}
                      className={`overflow-hidden rounded-lg border transition ${
                        checked
                          ? "border-[#38bdf8] bg-white"
                          : "border-transparent bg-[#fcfcfd] hover:bg-[#f9fafb]"
                      }`}
                    >
                      <div className="relative flex min-h-12 flex-wrap items-center gap-2 px-2 py-1.5">
                        <button
                          type="button"
                          onClick={toggleProtocol}
                          aria-label={`${checked ? "Disable" : "Enable"} ${option.label}`}
                          aria-pressed={checked}
                          title={`${checked ? "Disable" : "Enable"} ${option.label}`}
                          className="absolute inset-0 rounded-[7px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3fc] focus-visible:ring-inset"
                        />

                        <ProtocolIcon
                          protocol={option.value}
                          decorative
                          className="pointer-events-none relative"
                        />
                        <span className="pointer-events-none relative truncate text-sm font-medium text-[#344054]">
                          {option.label}
                        </span>

                        {connectionResult && !expanded ? (
                          <span
                            title={connectionResult.message}
                            className={`pointer-events-none relative hidden max-w-40 items-center gap-1 truncate text-xs lg:inline-flex ${connectionResult.ok ? "text-[#027a48]" : "text-[#b42318]"}`}
                          >
                            {connectionResult.ok ? (
                              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                            ) : (
                              <X className="size-3.5 shrink-0" aria-hidden="true" />
                            )}
                            <span className="truncate">{connectionResult.message}</span>
                          </span>
                        ) : null}

                        <div className="relative ml-auto flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!provider || !checked || pending}
                            onClick={() => runProtocolAction(option.value, "test")}
                            aria-label={provider ? "Test connection" : "Save provider first"}
                            title={provider ? "Test connection" : "Save provider first"}
                            className="flex size-8 items-center justify-center rounded-md text-[#667085] transition hover:bg-white hover:text-[#344054] disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            {actionPending && activeProtocolAction?.type === "test" ? (
                              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <PlugZap className="size-4" aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={!provider || !checked || pending}
                            onClick={() => runProtocolAction(option.value, "models")}
                            aria-label={provider ? "Get models" : "Save provider first"}
                            title={provider ? "Get models" : "Save provider first"}
                            className="flex size-8 items-center justify-center rounded-md text-[#667085] transition hover:bg-white hover:text-[#344054] disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            {actionPending && activeProtocolAction?.type === "models" ? (
                              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Download className="size-4" aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={!checked}
                            onClick={() => setExpandedProtocol(expanded ? null : option.value)}
                            aria-label={`${expanded ? "Collapse" : "Expand"} ${option.label} settings`}
                            aria-expanded={expanded}
                            title="Endpoint settings"
                            className="flex size-8 items-center justify-center rounded-md text-[#667085] transition hover:bg-white hover:text-[#344054] disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <ChevronDown
                              className={`size-4 transition ${expanded ? "rotate-180" : ""}`}
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </div>

                      <div
                        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        }`}
                        aria-hidden={!expanded}
                        inert={!expanded}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div className="border-t border-[#bae6fd] bg-[#f1f5f9] px-4 py-3">
                            <FloatingInput
                              label="Endpoint"
                              value={protocolConfig?.endpoint ?? ""}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  protocols: {
                                    ...form.protocols,
                                    [option.value]: {
                                      endpoint: event.target.value,
                                      enabled: protocolConfig?.enabled ?? true,
                                    },
                                  },
                                })
                              }
                              maxLength={2048}
                              placeholder={option.defaultEndpoint}
                              inputClassName="font-mono text-xs"
                            />
                            {connectionResult ? (
                              <p
                                className={`mt-2 flex items-start gap-1.5 text-xs ${connectionResult.ok ? "text-[#027a48]" : "text-[#b42318]"}`}
                              >
                                {connectionResult.ok ? (
                                  <CheckCircle2
                                    className="mt-0.5 size-3.5 shrink-0"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <X className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                                )}
                                <span>{connectionResult.message}</span>
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FormSectionCard>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-[#fecdca] bg-[#fef3f2] px-3 py-2.5 text-sm text-[#b42318]"
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-4 bg-[#f8fafc] px-5 py-3.5 shadow-[0_-8px_20px_rgba(15,23,42,0.04)] sm:px-6">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
                className="peer sr-only"
              />
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-[#d0d5dd] transition peer-checked:bg-[#0284c7] peer-focus-visible:ring-2 peer-focus-visible:ring-[#7dd3fc] peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5" />
              <span className="text-sm font-medium text-[#344054]">Enabled</span>
            </label>
            <div className="ml-auto flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="h-9 rounded-md border border-black/10 bg-white px-4 text-sm font-medium text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-9 min-w-24 items-center justify-center gap-2 rounded-md bg-[#0284c7] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0369a1] disabled:cursor-wait disabled:opacity-60"
              >
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="size-4" aria-hidden="true" />
                )}
                {pending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {modelDiff ? (
        <ModelDiffDialog
          currentModels={models}
          diff={modelDiff}
          pending={pending}
          onChange={(selected) => setModelDiff({ ...modelDiff, selected })}
          onClose={() => setModelDiff(null)}
          onConfirm={addDiscoveredModels}
        />
      ) : null}
    </>
  );
}

function ModelDiffDialog({
  currentModels,
  diff,
  pending,
  onChange,
  onClose,
  onConfirm,
}: {
  currentModels: string[];
  diff: { protocol: ProtocolType; models: string[]; selected: string[] };
  pending: boolean;
  onChange: (selected: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const existing = new Set(currentModels);
  const newModels = diff.models.filter((model) => !existing.has(model));

  return (
    <Modal
      title="Discovered models"
      description={`${diff.models.length} returned · ${newModels.length} new`}
      leading={<ProtocolIcon protocol={diff.protocol} decorative />}
      onClose={onClose}
      size="md"
      layer="nested"
      footer={
        <>
          <button
            type="button"
            disabled={!newModels.length || pending}
            onClick={() => onChange(newModels)}
            className="mr-auto text-sm font-medium text-[#0071e3] disabled:text-[#a1a1a6]"
          >
            Select all new
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-9 rounded-md border border-black/10 bg-white px-3 text-sm font-medium text-[#1d1d1f] shadow-sm hover:bg-[#f5f5f7]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!diff.selected.length || pending}
            className="inline-flex h-9 min-w-28 items-center justify-center rounded-md bg-[#0071e3] px-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Adding..." : `Add ${diff.selected.length}`}
          </button>
        </>
      }
    >
      {diff.models.length ? (
        <div className="divide-y divide-black/[0.06]">
          {diff.models.map((model) => {
            const alreadyAdded = existing.has(model);
            const selected = diff.selected.includes(model);
            return (
              <label
                key={model}
                className={`flex min-h-11 items-center gap-3 rounded-md px-2 py-2 ${alreadyAdded ? "cursor-default" : "cursor-pointer hover:bg-[#f5f5f7]"}`}
              >
                <input
                  type="checkbox"
                  checked={alreadyAdded || selected}
                  disabled={alreadyAdded}
                  onChange={() =>
                    onChange(
                      selected
                        ? diff.selected.filter((selectedModel) => selectedModel !== model)
                        : [...diff.selected, model],
                    )
                  }
                  className="size-4 accent-[#0071e3]"
                />
                <span className="min-w-0 flex-1 truncate font-mono text-sm text-[#3a3a3c]">
                  {model}
                </span>
                <span
                  className={`text-xs font-medium ${alreadyAdded ? "text-[#86868b]" : "text-[#248a3d]"}`}
                >
                  {alreadyAdded ? "Existing" : "New"}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-40 items-center justify-center text-sm text-[#6e6e73]">
          No models returned
        </div>
      )}
    </Modal>
  );
}

function DeleteDialog({ provider, onClose }: { provider: ProviderSummary; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const remove = () => {
    startTransition(async () => {
      const result = await deleteProviderAction(provider.name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  };

  return (
    <Modal
      title={`Delete ${provider.name}?`}
      description="Models routed only through this provider will stop resolving immediately."
      leading={
        <div className="flex size-9 items-center justify-center rounded-full bg-[#fff1f0] text-[#d70015]">
          <Trash2 className="size-4.5" aria-hidden="true" />
        </div>
      }
      onClose={onClose}
      role="alertdialog"
      size="sm"
      closeOnBackdrop={false}
      showClose={false}
      bodyClassName="px-5 py-2"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-9 rounded-md border border-black/10 bg-white px-4 text-sm font-medium text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="h-9 rounded-md bg-[#d70015] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c00012] disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Deleting..." : "Delete"}
          </button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="rounded-md bg-[#fff1f0] px-3 py-2 text-sm text-[#b42318]">
          {error}
        </p>
      ) : (
        <p className="text-sm leading-6 text-[#6e6e73]">This action cannot be undone.</p>
      )}
    </Modal>
  );
}

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
  const [toast, setToast] = useState<ToastMessage | null>(null);

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
    const protocol = protocolOptions.find(({ value }) => provider.protocols[value]?.enabled)?.value;
    if (!protocol) {
      setToast({
        id: Date.now(),
        type: "error",
        title: "Test failed",
        description: `${provider.name} has no enabled protocol.`,
      });
      return;
    }

    setTestingProvider(provider.name);
    startTransition(async () => {
      const result = await testProviderProtocolAction(provider.name, protocol);
      setTestingProvider(null);
      setToast(
        result.ok
          ? {
              id: Date.now(),
              type: "success",
              title: "Connection successful",
              description: `${provider.name} responded with ${result.model} in ${result.latencyMs} ms.`,
            }
          : {
              id: Date.now(),
              type: "error",
              title: "Connection failed",
              description: result.error,
            },
      );
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

        <DataTablePanel
          minWidth={980}
          footer={
            <p className="text-sm text-[#667085]">
              <span className="font-medium tabular-nums text-[#344054]">
                {filteredProviders.length}
              </span>{" "}
              {filteredProviders.length === 1 ? "provider" : "providers"}
              {filteredProviders.length !== providers.length ? ` of ${providers.length}` : ""}
            </p>
          }
          header={
            <DataTable className="table-fixed text-center">
              <ProviderTableColumns />
              <DataTableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>
                    <TableFilter
                      label="Provider"
                      parameter="query"
                      placeholder="Search providers"
                    />
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
              {filteredProviders.map((provider) => {
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
                        onClick={() => toggle(provider)}
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
                          onClick={() => test(provider)}
                          disabled={
                            pending ||
                            !provider.enabled ||
                            !Object.values(provider.protocols).some((config) => config.enabled)
                          }
                          aria-label={`Test ${provider.name}`}
                          title={
                            provider.enabled
                              ? "Test first protocol"
                              : "Enable provider before testing"
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
                          onClick={() => setEditing(provider)}
                          aria-label={`Edit ${provider.name}`}
                          title="Edit"
                          className="flex size-9 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#344054]"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(provider)}
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
              {!filteredProviders.length ? (
                <DataTableEmptyState
                  colSpan={6}
                  className="min-h-80"
                  icon={<ServerCog className="size-5" aria-hidden="true" />}
                  title={providers.length ? "No providers found" : "No providers configured"}
                  description={
                    providers.length
                      ? "Try another search."
                      : "Add a provider to start routing models."
                  }
                  action={
                    !providers.length ? (
                      <button
                        type="button"
                        onClick={() => setEditing("new")}
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
      </div>

      {editing ? (
        <ProviderDialog
          provider={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {deleting ? <DeleteDialog provider={deleting} onClose={() => setDeleting(null)} /> : null}
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
