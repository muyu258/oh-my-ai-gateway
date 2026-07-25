"use client";

import { ProtocolIcon } from "#/components/icons/protocol";
import { Modal } from "#/components/modal";
import type { ProtocolType } from "#/lib/protocol/protocol.types";

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
  const existing = new Set(currentModels);
  const newModels = discovery.models.filter((model) => !existing.has(model));

  return (
    <Modal
      title="Discovered models"
      description={`${discovery.models.length} returned · ${newModels.length} new`}
      leading={<ProtocolIcon protocol={discovery.protocol} decorative />}
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
            disabled={!discovery.selected.length || pending}
            className="inline-flex h-9 min-w-28 items-center justify-center rounded-md bg-[#0071e3] px-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Adding..." : `Add ${discovery.selected.length}`}
          </button>
        </>
      }
    >
      {discovery.models.length ? (
        <div className="divide-y divide-black/[0.06]">
          {discovery.models.map((model) => {
            const alreadyAdded = existing.has(model);
            const selected = discovery.selected.includes(model);
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
                        ? discovery.selected.filter((selectedModel) => selectedModel !== model)
                        : [...discovery.selected, model],
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
