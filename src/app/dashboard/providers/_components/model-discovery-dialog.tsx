"use client";

import { ProtocolIcon } from "#/components/icons/protocol";
import { Modal } from "#/components/modal";
import type { ProtocolType } from "#/lib/protocol/protocol.types";
import { ProviderModelTag } from "./provider-model-tag";
import { getDiscoveredModelState, sortModels } from "./provider-view.helpers";

export type ModelDiscovery = {
  protocol: ProtocolType;
  models: string[];
  selected: string[];
};

export function ModelDiscoveryDialog({
  currentModels,
  discovery,
  pending,
  onChange,
  onClose,
  onConfirm,
}: {
  currentModels: string[];
  discovery: ModelDiscovery;
  pending: boolean;
  onChange: (selected: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const existingModels = new Set(currentModels);
  const selectedModels = new Set(discovery.selected);
  const selectableModels = discovery.models.filter((model) => !existingModels.has(model));
  const existingCount = discovery.models.length - selectableModels.length;

  return (
    <Modal
      title="Discovered models"
      description={`${discovery.models.length} returned · ${existingCount} existing · ${discovery.selected.length} selected`}
      leading={<ProtocolIcon protocol={discovery.protocol} decorative />}
      onClose={onClose}
      size="md"
      layer="nested"
      footer={
        <>
          <div className="mr-auto flex items-center gap-3">
            <button
              type="button"
              disabled={!selectableModels.length || pending}
              onClick={() => onChange(sortModels(selectableModels))}
              className="text-sm font-medium text-[#0071e3] disabled:text-[#a1a1a6]"
            >
              Select all
            </button>
            <button
              type="button"
              disabled={!discovery.selected.length || pending}
              onClick={() => onChange([])}
              className="text-sm font-medium text-[#475467] disabled:text-[#a1a1a6]"
            >
              Deselect all
            </button>
          </div>
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
            disabled={!discovery.selected.length || pending}
            className="inline-flex h-9 min-w-24 items-center justify-center rounded-md bg-[#0071e3] px-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {`Add ${discovery.selected.length}`}
          </button>
        </>
      }
    >
      {discovery.models.length ? (
        <div className="flex flex-wrap content-start items-start gap-2 p-1">
          {discovery.models.map((model) => {
            const state = getDiscoveredModelState(model, existingModels, selectedModels);
            const selected = state === "selected";
            return (
              <ProviderModelTag
                key={model}
                tone={state === "existing" ? "muted" : selected ? "accent" : "neutral"}
                width="content"
                disabled={state === "existing" || pending}
                pressed={state === "existing" ? undefined : selected}
                ariaLabel={`${selected ? "Deselect" : "Select"} ${model}`}
                onClick={() =>
                  onChange(
                    selected
                      ? discovery.selected.filter((selectedModel) => selectedModel !== model)
                      : sortModels([...discovery.selected, model]),
                  )
                }
              >
                {model}
              </ProviderModelTag>
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
