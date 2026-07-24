"use client";

import { Check, Copy, X } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import { DataTableRow } from "#/components/data-table";
import { JsonViewer } from "#/components/json-viewer";
import { Modal } from "#/components/modal";

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
  const [copied, setCopied] = useState(false);
  const record = useMemo(() => JSON.parse(recordJson) as object, [recordJson]);

  const openWithKeyboard = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setOpen(true);
  };

  const copyRecord = async () => {
    await navigator.clipboard.writeText(recordJson);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <DataTableRow
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={openWithKeyboard}
        aria-label={`View raw JSON for request ${recordId}`}
        className="cursor-pointer focus-visible:bg-[#f0f9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#38bdf8]"
      >
        {children}
      </DataTableRow>

      {open ? (
        <Modal
          title="REQUEST RECORD"
          onClose={() => setOpen(false)}
          size="lg"
          showHeader={false}
          bodyClassName="overflow-auto bg-[#1d1d1f]"
          panelClassName="relative"
        >
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md bg-[#2c2c2e] p-1 shadow-sm">
            <button
              type="button"
              onClick={copyRecord}
              aria-label="Copy raw JSON"
              title={copied ? "Copied" : "Copy raw JSON"}
              className="flex size-7 items-center justify-center text-[#aeaeb2] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64d2ff]"
            >
              {copied ? (
                <Check className="size-3.5 text-[#30d158]" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              title="Close"
              className="flex size-7 items-center justify-center text-[#aeaeb2] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64d2ff]"
            >
              <X className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
          <div className="min-w-max p-5 pr-24">
            <JsonViewer value={record} />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
