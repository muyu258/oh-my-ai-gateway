"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Modal } from "#/components/modal";
import type { ProviderSummary } from "#/lib/database/provider.repository";
import { deleteProviderAction } from "../provider.actions";

export function DeleteProviderDialog({
  provider,
  onClose,
}: {
  provider: ProviderSummary;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const remove = () => {
    startTransition(async () => {
      const result = await deleteProviderAction(provider.id);
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
