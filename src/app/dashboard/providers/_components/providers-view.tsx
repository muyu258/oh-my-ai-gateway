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
import { FloatingInput } from "#/components/floating-input";
import { TableFilter } from "#/components/table-filter";
import { Toast, type ToastMessage } from "#/components/toast";
import type { ProviderSummary } from "#/infra/database/provider.repository";
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
  protocols: [ProtocolType.OpenaiCompatible],
  protocolEndpoints: {},
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
          protocols: provider.protocols,
          protocolEndpoints: provider.protocolEndpoints,
          websiteUrl: provider.websiteUrl ?? "",
          baseUrl: provider.baseUrl ?? "",
          providerToken: "",
          enabled: provider.enabled,
        }
      : emptyForm,
  );

  const formInput = (nextModels = models): ProviderFormInput => ({
    ...form,
    models: nextModels,
  });

  const addModel = () => {
    const model = modelDraft.trim();
    if (model && !models.includes(model)) setModels((current) => [...current, model]);
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
    const mergedModels = [...new Set([...models, ...modelDiff.selected])];
    setError("");

    startTransition(async () => {
      const result = await updateProviderAction(persistedName, formInput(mergedModels));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPersistedName(form.name.trim());
      setModels(mergedModels);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provider-dialog-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="flex h-[min(46rem,calc(100svh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.22)]">
        <div className="relative z-10 flex shrink-0 items-start justify-between bg-white px-5 pb-3 pt-5 sm:px-6">
          <div>
            <h2 id="provider-dialog-title" className="text-base font-semibold text-[#101828]">
              {provider ? "Edit provider" : "Add provider"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="flex size-9 items-center justify-center rounded-md text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#344054]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 pb-6 pt-3 sm:grid-cols-2 sm:px-6">
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

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[#344054]">Models</span>
                <button
                  type="button"
                  disabled={!models.length || pending}
                  onClick={() => setModels([])}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[#667085] transition hover:bg-[#fef3f2] hover:text-[#d92d20] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Clear all
                </button>
              </div>
              <div className="mt-1.5 flex min-h-24 flex-wrap content-start items-start gap-2 py-2.5">
                {models.map((model) => (
                  <span
                    key={model}
                    className="group inline-flex h-8 max-w-full items-center rounded-md bg-[#f2f4f7] pl-2.5 pr-1 font-mono text-xs text-[#344054]"
                  >
                    <span className="max-w-56 truncate" title={model}>
                      {model}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setModels((current) =>
                          current.filter((currentModel) => currentModel !== model),
                        )
                      }
                      aria-label={`Remove ${model}`}
                      title="Remove model"
                      className="ml-1 flex size-6 shrink-0 items-center justify-center rounded text-[#98a2b3] opacity-100 transition hover:bg-[#e4e7ec] hover:text-[#475467] focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
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
                  className="h-8 w-40 max-w-full shrink-0 rounded-md border-0 bg-[#f2f4f7] px-2.5 font-mono text-xs text-[#344054] outline-none transition placeholder:text-[#98a2b3] focus:bg-[#e4e7ec] focus:ring-2 focus:ring-[#7dd3fc]"
                />
              </div>
            </div>

            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium text-[#344054]">Protocols</legend>
              <div className="mt-2 space-y-1.5">
                {protocolOptions.map((option) => {
                  const checked = form.protocols.includes(option.value);
                  const expanded = checked && expandedProtocol === option.value;
                  const actionPending = activeProtocolAction?.protocol === option.value && pending;
                  const connectionResult = connectionResults[option.value];
                  const toggleProtocol = () => {
                    const protocols = checked
                      ? form.protocols.filter((protocol) => protocol !== option.value)
                      : [...form.protocols, option.value];
                    setForm({ ...form, protocols });
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
                              value={form.protocolEndpoints[option.value] ?? ""}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  protocolEndpoints: {
                                    ...form.protocolEndpoints,
                                    [option.value]: event.target.value,
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
            </fieldset>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-[#fecdca] bg-[#fef3f2] px-3 py-2.5 text-sm text-[#b42318] sm:col-span-2"
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
                className="h-9 rounded-md bg-[#dc2626] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b91c1c] disabled:opacity-50"
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
      </div>

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
    </div>
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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0f172a]/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-diff-title"
    >
      <div className="flex max-h-[min(42rem,calc(100svh-2rem))] w-full max-w-xl flex-col rounded-lg border border-[#e5e7eb] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between border-b border-[#e5e7eb] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <ProtocolIcon protocol={diff.protocol} decorative />
            <div className="min-w-0">
              <h3 id="model-diff-title" className="text-base font-semibold text-[#101828]">
                Discovered models
              </h3>
              <p className="mt-0.5 text-sm text-[#667085]">
                {diff.models.length} returned · {newModels.length} new
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="flex size-9 items-center justify-center rounded-lg text-[#667085] hover:bg-[#f2f4f7]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {diff.models.length ? (
            <div className="divide-y divide-[#eef0f3]">
              {diff.models.map((model) => {
                const alreadyAdded = existing.has(model);
                const selected = diff.selected.includes(model);
                return (
                  <label
                    key={model}
                    className={`flex min-h-11 items-center gap-3 px-2 py-2 ${alreadyAdded ? "cursor-default" : "cursor-pointer hover:bg-[#f9fafb]"}`}
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
                      className="size-4 accent-[#0284c7]"
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-sm text-[#344054]">
                      {model}
                    </span>
                    {alreadyAdded ? (
                      <span className="text-xs font-medium text-[#667085]">Existing</span>
                    ) : (
                      <span className="text-xs font-medium text-[#027a48]">New</span>
                    )}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-40 items-center justify-center text-sm text-[#667085]">
              No models returned
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#e5e7eb] px-5 py-4">
          <button
            type="button"
            disabled={!newModels.length || pending}
            onClick={() => onChange(newModels)}
            className="text-sm font-medium text-[#0369a1] disabled:text-[#98a2b3]"
          >
            Select all new
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="h-9 rounded-lg border border-[#d0d5dd] px-3 text-sm font-medium text-[#344054] hover:bg-[#f9fafb]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!diff.selected.length || pending}
              className="inline-flex h-9 min-w-28 items-center justify-center rounded-lg bg-[#0f172a] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Adding..." : `Add ${diff.selected.length}`}
            </button>
          </div>
        </div>
      </div>
    </div>
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 p-4 backdrop-blur-[1px]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-provider-title"
    >
      <div className="w-full max-w-md rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.22)]">
        <div className="flex size-10 items-center justify-center rounded-full bg-[#fef3f2] text-[#d92d20]">
          <Trash2 className="size-5" aria-hidden="true" />
        </div>
        <h2 id="delete-provider-title" className="mt-4 text-base font-semibold text-[#101828]">
          Delete {provider.name}?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#667085]">
          Models routed only through this provider will stop resolving immediately.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-[#b42318]">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-10 rounded-lg border border-[#d0d5dd] px-4 text-sm font-medium text-[#344054] transition hover:bg-[#f9fafb]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="h-10 rounded-lg bg-[#d92d20] px-4 text-sm font-semibold text-white transition hover:bg-[#b42318] disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProvidersView({ providers }: { providers: ProviderSummary[] }) {
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
    const protocol = provider.protocols[0];
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
    <div className="flex min-h-full w-full flex-col bg-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e7eb] px-5 py-5 sm:px-7">
        <div>
          <h1 className="text-xl font-semibold text-[#101828]">Providers</h1>
          <p className="mt-1 text-sm text-[#667085]">
            {providers.length} configured · {providers.filter(({ enabled }) => enabled).length}{" "}
            enabled
          </p>
        </div>
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

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[940px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#fcfcfd]">
              <tr className="border-b border-[#e5e7eb] text-xs font-medium uppercase text-[#667085]">
                <th className="px-5 py-3 sm:pl-7">
                  <TableFilter label="Provider" parameter="query" placeholder="Search providers" />
                </th>
                <th className="px-5 py-3">Endpoint</th>
                <th className="px-5 py-3">Protocols</th>
                <th className="px-5 py-3">Avg response (30m)</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right sm:pr-7">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0f3]">
              {filteredProviders.map((provider) => {
                const responseTime = responseTimeBadge(provider.averageResponseTimeMs);

                return (
                  <tr key={provider.name} className="text-sm transition hover:bg-[#fcfcfd]">
                    <td className="px-5 py-4 sm:pl-7">
                      <div className="flex items-center gap-3">
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
                    </td>
                    <td className="px-5 py-4">
                      <p
                        className="max-w-60 truncate font-mono text-xs text-[#475467]"
                        title={provider.baseUrl ?? undefined}
                      >
                        {provider.baseUrl ?? "Provider default"}
                      </p>
                      <p className="mt-1 text-xs text-[#98a2b3]">
                        Updated {formatUpdatedAt(provider.updatedAt)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex max-w-56 flex-wrap gap-1.5">
                        {provider.protocols.map((protocol) => (
                          <ProtocolIcon key={protocol} protocol={protocol} />
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        title="Average time to first byte over the last 30 minutes"
                        className={`inline-flex min-w-16 justify-center rounded-md px-2.5 py-1 font-mono text-xs font-medium tabular-nums ${responseTime.className}`}
                      >
                        {responseTime.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
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
                    </td>
                    <td className="px-5 py-4 sm:pr-7">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => test(provider)}
                          disabled={pending || !provider.enabled || !provider.protocols.length}
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!filteredProviders.length ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#475569]">
                <ServerCog className="size-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-[#101828]">
                {providers.length ? "No providers found" : "No providers configured"}
              </h2>
              <p className="mt-1 text-sm text-[#667085]">
                {providers.length
                  ? "Try another search."
                  : "Add a provider to start routing models."}
              </p>
              {!providers.length ? (
                <button
                  type="button"
                  onClick={() => setEditing("new")}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-[#d0d5dd] px-3 text-sm font-medium text-[#344054] transition hover:bg-[#f9fafb]"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add provider
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
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
