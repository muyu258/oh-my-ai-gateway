"use client";

import { Braces, Check, Link2, LoaderCircle, PlugZap, Trash2, X } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useRef, useState } from "react";

import { FloatingInput } from "#/components/floating-input";
import { FormSectionCard } from "#/components/form-section-card";
import type { ProtocolType } from "#/lib/protocol/protocol.types";
import type { ProviderFormInput } from "../provider-form.types";
import { ProviderModelTag } from "./provider-model-tag";
import { ProtocolBindingEditor, type ProtocolAction } from "./protocol-binding-editor";
import {
  addProviderAlias,
  addProviderModel,
  getPublicModels,
  getRealModels,
  removeProviderModelName,
  resolveProviderModel,
  type ProviderModels,
} from "#/lib/provider/provider-models";

export const pricingOverridesTemplate = `{
  "model-name": {
    "rates": {
      "input": "input-rate-per-million",
      "output": "output-rate-per-million",
      "cacheRead": "cache-read-rate-per-million",
      "cacheWrite": "cache-write-rate-per-million"
    },
    "tiers": [
      {
        "inputTokensAbove": 200000,
        "rates": {
          "input": "tier-input-rate-per-million",
          "output": "tier-output-rate-per-million",
          "cacheRead": "tier-cache-read-rate-per-million",
          "cacheWrite": "tier-cache-write-rate-per-million"
        }
      }
    ]
  }
}`;

export function ProviderForm({
  hasPersistedProvider,
  form,
  models,
  pending,
  error,
  activeProtocolAction,
  setForm,
  setModels,
  onProtocolAction,
  onModelTest,
  testingModel,
  onClose,
  onSubmit,
}: {
  hasPersistedProvider: boolean;
  form: ProviderFormInput;
  models: ProviderModels;
  pending: boolean;
  error: string;
  activeProtocolAction: ProtocolAction | null;
  setForm: Dispatch<SetStateAction<ProviderFormInput>>;
  setModels: Dispatch<SetStateAction<ProviderModels>>;
  onProtocolAction: (protocol: ProtocolType, type: ProtocolAction["type"]) => void;
  onModelTest: (model: string) => void;
  testingModel: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [modelDraft, setModelDraft] = useState("");
  const [aliasMode, setAliasMode] = useState(false);
  const [aliasTarget, setAliasTarget] = useState<string | null>(null);
  const pricingTextarea = useRef<HTMLTextAreaElement>(null);
  const publicModels = getPublicModels(models);

  const addModel = () => {
    const model = modelDraft.trim();
    if (aliasMode) {
      if (!model || !aliasTarget) return;
      setModels((current) => addProviderAlias(current, aliasTarget, model));
    } else if (model) {
      setModels((current) => addProviderModel(current, model));
      if (!form.testModel && !resolveProviderModel(models, model)) {
        setForm((current) => ({ ...current, testModel: model }));
      }
    }
    setModelDraft("");
  };

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
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
              required={!hasPersistedProvider}
              autoComplete="new-password"
              value={form.providerToken}
              onChange={(event) => setForm({ ...form, providerToken: event.target.value })}
              placeholder={hasPersistedProvider ? "Unchanged" : "sk-..."}
              containerClassName="sm:col-span-2"
              inputClassName="font-mono"
            />
          </div>
        </FormSectionCard>

        <FormSectionCard
          title="Models"
          action={
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!publicModels.length || pending}
                aria-pressed={aliasMode}
                onClick={() => {
                  setAliasMode((current) => !current);
                  setAliasTarget(null);
                  setModelDraft("");
                }}
                aria-label="Add model alias"
                title={aliasMode ? "Exit alias mode" : "Add model alias"}
                className={`flex size-8 shrink-0 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-40 ${aliasMode ? "bg-[#e0f2fe] text-[#0369a1]" : "text-[#667085] hover:bg-[#f2f4f7]"}`}
              >
                <Link2 className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={!publicModels.length || pending}
                onClick={() => {
                  setModels({});
                  setAliasTarget(null);
                  setForm((current) => ({ ...current, testModel: "" }));
                }}
                aria-label="Clear all models"
                title="Clear all models"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-[#667085] transition hover:bg-[#fef3f2] hover:text-[#d92d20] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          }
        >
          <div className="flex flex-wrap content-start items-start gap-2 py-1">
            {publicModels.map((model) => {
              const resolved = resolveProviderModel(models, model)!;
              const selected = aliasMode
                ? aliasTarget === resolved.upstreamModel
                : form.testModel === model;
              return (
                <ProviderModelTag
                  key={model}
                  tone={selected ? "accent" : "neutral"}
                  width="content"
                  disabled={pending}
                  pressed={selected}
                  ariaLabel={
                    aliasMode
                      ? `Select ${resolved.upstreamModel} as alias target`
                      : `Use ${model} as default test model`
                  }
                  title={
                    resolved.isAlias
                      ? `Alias for ${resolved.upstreamModel}`
                      : "Set default test model"
                  }
                  leadingIcon={
                    resolved.isAlias ? <Link2 className="size-3.5" aria-hidden="true" /> : undefined
                  }
                  onClick={() => {
                    if (aliasMode) setAliasTarget(resolved.upstreamModel);
                    else setForm((current) => ({ ...current, testModel: model }));
                  }}
                  actions={
                    <>
                      <button
                        type="button"
                        disabled={pending || !hasPersistedProvider || !form.testProtocol}
                        onClick={() => onModelTest(model)}
                        aria-label={`Test ${model}`}
                        title={hasPersistedProvider ? "Test model" : "Save provider first"}
                        className="flex size-5 items-center justify-center rounded text-[#98a2b3] transition hover:bg-[#e4e7ec] hover:text-[#475467] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {testingModel === model ? (
                          <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <PlugZap className="size-3" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const nextModels = removeProviderModelName(models, model);
                          setModels(nextModels);
                          if (!resolveProviderModel(nextModels, form.testModel)) {
                            setForm((current) => ({
                              ...current,
                              testModel: getRealModels(nextModels)[0] ?? "",
                            }));
                          }
                        }}
                        aria-label={`Remove ${model}`}
                        title="Remove model"
                        className="flex size-5 items-center justify-center rounded text-[#98a2b3] transition hover:bg-[#fee4e2] hover:text-[#d92d20] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </>
                  }
                >
                  {model}
                </ProviderModelTag>
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
              aria-label={aliasMode ? "Add alias" : "Add model"}
              placeholder={aliasMode ? (aliasTarget ? "Add alias" : "Select target") : "Add model"}
              className="h-8 w-40 max-w-full shrink-0 rounded-md border-0 bg-white px-2.5 font-mono text-xs text-[#344054] shadow-[0_1px_2px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-[#98a2b3] focus:ring-2 focus:ring-[#7dd3fc]"
            />
          </div>
        </FormSectionCard>

        <FormSectionCard title="Protocols">
          <ProtocolBindingEditor
            form={form}
            hasPersistedProvider={hasPersistedProvider}
            pending={pending}
            activeAction={activeProtocolAction}
            onChange={setForm}
            onAction={onProtocolAction}
          />
        </FormSectionCard>

        <FormSectionCard title="Cost pricing">
          <div className="grid gap-5">
            <FloatingInput
              label="Cost multiplier"
              required
              inputMode="decimal"
              value={form.costMultiplier}
              onChange={(event) => setForm({ ...form, costMultiplier: event.target.value })}
              placeholder="1"
              inputClassName="font-mono"
            />
            <label className="grid gap-2 text-sm font-medium text-[#344054]">
              <span className="flex items-center justify-between gap-2">
                Pricing overrides
                <button
                  type="button"
                  disabled={Boolean(form.pricingOverrides.trim()) || pending}
                  onClick={() => {
                    setForm({ ...form, pricingOverrides: pricingOverridesTemplate });
                    requestAnimationFrame(() => pricingTextarea.current?.focus());
                  }}
                  aria-label="Insert pricing overrides template"
                  title="Insert template"
                  className="flex size-8 items-center justify-center rounded-md text-[#667085] transition hover:bg-[#f2f4f7] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Braces className="size-4" aria-hidden="true" />
                </button>
              </span>
              <textarea
                ref={pricingTextarea}
                value={form.pricingOverrides}
                onChange={(event) => setForm({ ...form, pricingOverrides: event.target.value })}
                spellCheck={false}
                placeholder={pricingOverridesTemplate}
                rows={10}
                className="min-h-44 w-full resize-y rounded-md border border-[#d0d5dd] bg-white px-3 py-2.5 font-mono text-xs leading-5 text-[#344054] shadow-[0_1px_2px_rgba(15,23,42,0.05)] outline-none transition focus:border-[#7dd3fc] focus:ring-2 focus:ring-[#bae6fd]"
              />
            </label>
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
          <span className="relative h-6 w-11 shrink-0 rounded-full bg-[#d0d5dd] transition peer-checked:bg-[#0284c7] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0071e3] after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5" />
          <span className="text-sm font-medium text-[#344054]">Enabled</span>
        </label>
        <div className="ml-auto flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-9 rounded-md border border-black/10 bg-white px-4 text-sm font-medium text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7] disabled:opacity-50"
          >
            {hasPersistedProvider ? "Close" : "Cancel"}
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
  );
}
