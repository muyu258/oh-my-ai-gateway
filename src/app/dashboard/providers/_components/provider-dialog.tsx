"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Modal } from "#/components/modal";
import type { ProviderSummary } from "#/lib/database/provider.repository";
import type { ProtocolType } from "#/lib/protocol/protocol.types";
import {
  createProviderAction,
  discoverProviderModelsAction,
  testProviderAction,
  updateProviderAction,
} from "../provider.actions";
import type { ProviderFormInput } from "../provider-form.types";
import { ModelDiscoveryDialog, type ModelDiscovery } from "./model-discovery-dialog";
import { ProviderForm } from "./provider-form";
import type { ProtocolAction } from "./protocol-binding-editor";
import { createProviderForm, mergeModels, toProviderFormInput } from "./provider-view.helpers";
import { getPublicModels, type ProviderModels } from "#/lib/provider/provider-models";

export function ProviderDialog({
  provider,
  onClose,
}: {
  provider?: ProviderSummary;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [models, setModels] = useState<ProviderModels>(
    provider ? structuredClone(provider.models) : {},
  );
  const [activeProtocolAction, setActiveProtocolAction] = useState<ProtocolAction | null>(null);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [modelDiscovery, setModelDiscovery] = useState<ModelDiscovery | null>(null);
  const [form, setForm] = useState<ProviderFormInput>(() => createProviderForm(provider));
  const [providerId, setProviderId] = useState(provider?.id ?? null);

  const formInput = (nextModels = models): ProviderFormInput =>
    toProviderFormInput(form, nextModels);

  const runProtocolAction = (protocol: ProtocolType, type: ProtocolAction["type"]) => {
    if (!providerId) return;
    setError("");
    setActiveProtocolAction({ protocol, type });

    startTransition(async () => {
      // Discovery and connection tests read persisted credentials, so save the current form first.
      const saveResult = await updateProviderAction(providerId, formInput());
      if (!saveResult.ok) {
        setError(saveResult.error);
        setActiveProtocolAction(null);
        return;
      }
      setForm((current) => ({ ...current, providerToken: "" }));
      const savedName = form.name.trim();

      if (type === "test") {
        const result = await testProviderAction(providerId, { protocol });
        setActiveProtocolAction(null);
        if (result.ok) {
          toast.success("Connection successful", {
            description: `${savedName} responded with ${result.model} in ${result.latencyMs} ms.`,
          });
        } else {
          toast.error("Connection failed", { description: result.error });
        }
        return;
      }

      const result = await discoverProviderModelsAction(providerId, protocol);
      setActiveProtocolAction(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setModelDiscovery({
        protocol,
        models: result.models,
        selected: [],
      });
    });
  };

  const addDiscoveredModels = () => {
    if (!modelDiscovery) return;
    const mergedModels = mergeModels(models, modelDiscovery.selected);
    setError("");
    setModels(mergedModels);
    const firstModel = Object.keys(mergedModels)[0];
    if (!form.testModel && firstModel) {
      setForm((current) => ({ ...current, testModel: firstModel }));
    }
    setModelDiscovery(null);
  };

  const testModel = (model: string) => {
    if (!providerId || !form.testProtocol) return;
    setError("");
    setTestingModel(model);
    startTransition(async () => {
      const saveResult = await updateProviderAction(providerId, formInput());
      if (!saveResult.ok) {
        setError(saveResult.error);
        setTestingModel(null);
        return;
      }
      setForm((current) => ({ ...current, providerToken: "" }));
      const result = await testProviderAction(providerId, {
        model,
        protocol: form.testProtocol ?? undefined,
      });
      setTestingModel(null);
      if (result.ok) {
        const resolved =
          result.model === result.upstreamModel
            ? result.model
            : `${result.model} → ${result.upstreamModel}`;
        toast.success("Model test successful", {
          description: `${resolved} responded in ${result.latencyMs} ms.`,
        });
      } else {
        toast.error("Model test failed", { description: result.error });
      }
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const input = formInput();

    startTransition(async () => {
      const result = providerId
        ? await updateProviderAction(providerId, input)
        : await createProviderAction(input);
      if (!result.ok) {
        setError(result.error);
        toast.error("Provider not saved", { description: result.error });
        return;
      }
      if (!providerId && "providerId" in result && typeof result.providerId === "string") {
        setProviderId(result.providerId);
      }
      setForm((current) => ({ ...current, providerToken: "" }));
      toast.success(providerId ? "Provider saved" : "Provider created", {
        description: `${input.name} is ready to use.`,
      });
      router.refresh();
    });
  };

  return (
    <>
      <Modal
        title={providerId ? "Edit provider" : "Add provider"}
        onClose={onClose}
        size="lg"
        panelClassName="h-[min(46rem,calc(100svh-1.5rem))] sm:h-[min(46rem,calc(100svh-2.5rem))]"
        bodyClassName="flex overflow-hidden p-0 sm:p-0"
      >
        <ProviderForm
          hasPersistedProvider={Boolean(providerId)}
          form={form}
          models={models}
          pending={pending}
          error={error}
          activeProtocolAction={activeProtocolAction}
          setForm={setForm}
          setModels={setModels}
          onProtocolAction={runProtocolAction}
          onModelTest={testModel}
          testingModel={testingModel}
          onClose={onClose}
          onSubmit={submit}
        />
      </Modal>

      {modelDiscovery ? (
        <ModelDiscoveryDialog
          currentModels={getPublicModels(models)}
          discovery={modelDiscovery}
          pending={pending}
          onChange={(selected) => setModelDiscovery({ ...modelDiscovery, selected })}
          onClose={() => setModelDiscovery(null)}
          onConfirm={addDiscoveredModels}
        />
      ) : null}
    </>
  );
}
