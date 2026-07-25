"use client";

import { Check, Copy, X } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import { DataTableRow } from "#/components/data-table";
import { JsonViewer } from "#/components/json-viewer";
import { Modal } from "#/components/modal";

export function UsageRecordDetails({
  recordJson,
  onClose,
}: {
  recordJson: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const record = useMemo(() => JSON.parse(recordJson) as object, [recordJson]);

  const copyUsage = async () => {
    await navigator.clipboard.writeText(recordJson);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <div
        data-focus-theme="dark"
        className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md bg-[#2c2c2e] p-1 shadow-sm"
      >
        <button
          type="button"
          onClick={copyUsage}
          aria-label="Copy usage JSON"
          title={copied ? "Copied" : "Copy usage JSON"}
          className="flex size-7 items-center justify-center text-[#aeaeb2] transition hover:text-white"
        >
          {copied ? (
            <Check className="size-3.5 text-[#30d158]" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="flex size-7 items-center justify-center text-[#aeaeb2] transition hover:text-white"
        >
          <X className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
      <div className="min-w-max p-5 pr-24">
        <JsonViewer value={record} />
      </div>
    </>
  );
}

export function UsageRecordRow({
  recordId,
  recordJson,
  children,
}: {
  recordId: string;
  recordJson: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const openWithKeyboard = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <DataTableRow
        data-focus-control
        tabIndex={0}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen(true)}
        onKeyDown={openWithKeyboard}
        aria-label={`View usage record ${recordId}`}
        className="cursor-pointer"
      >
        {children}
      </DataTableRow>

      {open ? (
        <Modal
          title="Usage record"
          onClose={close}
          size="lg"
          showHeader={false}
          bodyClassName="overflow-auto bg-[#1d1d1f]"
          panelClassName="relative"
        >
          <UsageRecordDetails recordJson={recordJson} onClose={close} />
        </Modal>
      ) : null}
    </>
  );
}
