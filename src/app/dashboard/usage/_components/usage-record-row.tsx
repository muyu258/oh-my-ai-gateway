"use client";

import { ArrowDown, ArrowUp, Check, Copy, FileJson, X } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTableRow } from "#/components/data-table";
import { JsonViewer } from "#/components/json-viewer";
import { Modal } from "#/components/modal";

type View = "usage" | "request" | "response";
type ContentState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; requestBody: string; responseBody: string }
  | { status: "error"; message: string };

const OriginalBody = ({ value }: { value: string }) => {
  try {
    return <JsonViewer value={JSON.parse(value) as object} />;
  } catch {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-[#d1d1d6]">
        {value || "(empty)"}
      </pre>
    );
  }
};

export function UsageRecordRow({
  recordId,
  recordJson,
  hasContent = false,
  children,
}: {
  recordId: string;
  recordJson: string;
  hasContent?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("usage");
  const [copied, setCopied] = useState(false);
  const [content, setContent] = useState<ContentState>({ status: "idle" });
  const contentStatus = useRef<ContentState["status"]>("idle");
  const record = useMemo(() => JSON.parse(recordJson) as object, [recordJson]);

  const setContentState = (next: ContentState) => {
    contentStatus.current = next.status;
    setContent(next);
  };

  useEffect(() => {
    if (!open || view === "usage" || contentStatus.current !== "idle") return;
    let cancelled = false;
    setContentState({ status: "loading" });
    fetch(`/api/dashboard/usage/${encodeURIComponent(recordId)}/content`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "This original content has expired."
              : "Unable to load original content.",
          );
        }
        return response.json() as Promise<{ requestBody: string; responseBody: string }>;
      })
      .then((value) => {
        if (!cancelled) setContentState({ status: "ready", ...value });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setContentState({
            status: "error",
            message: error instanceof Error ? error.message : "Unable to load original content.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, recordId, view]);

  const openWithKeyboard = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setView("usage");
    setContentState({ status: "idle" });
    setCopied(false);
  };

  const copyCurrent = async () => {
    const value =
      view === "usage"
        ? recordJson
        : content.status === "ready"
          ? view === "request"
            ? content.requestBody
            : content.responseBody
          : undefined;
    if (value === undefined) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const switchView = (nextView: View) => {
    if (nextView === "usage" || content.status !== "error") {
      setView(nextView);
      return;
    }
    setContentState({ status: "idle" });
    setView(nextView);
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
          onClose={close}
          size="lg"
          showHeader={false}
          bodyClassName="overflow-auto bg-[#1d1d1f]"
          panelClassName="relative"
        >
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md bg-[#2c2c2e] p-1 shadow-sm">
            <button
              type="button"
              onClick={() => switchView("usage")}
              aria-label="Show usage JSON"
              title="Usage"
              className={`flex size-7 items-center justify-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64d2ff] ${view === "usage" ? "rounded bg-[#48484a] text-white" : "text-[#aeaeb2] hover:text-white"}`}
            >
              <FileJson className="size-3.5" aria-hidden="true" />
            </button>
            {hasContent ? (
              <>
                <button
                  type="button"
                  onClick={() => switchView("request")}
                  aria-label="Show original request"
                  title="Request"
                  className={`flex size-7 items-center justify-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64d2ff] ${view === "request" ? "rounded bg-[#48484a] text-white" : "text-[#aeaeb2] hover:text-white"}`}
                >
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => switchView("response")}
                  aria-label="Show original response"
                  title="Response"
                  className={`flex size-7 items-center justify-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64d2ff] ${view === "response" ? "rounded bg-[#48484a] text-white" : "text-[#aeaeb2] hover:text-white"}`}
                >
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={copyCurrent}
              aria-label="Copy current content"
              title={copied ? "Copied" : "Copy current content"}
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
              onClick={close}
              aria-label="Close"
              title="Close"
              className="flex size-7 items-center justify-center text-[#aeaeb2] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64d2ff]"
            >
              <X className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
          {view === "usage" ? (
            <div className="min-w-max p-5 pr-24">
              <JsonViewer value={record} />
            </div>
          ) : content.status === "loading" ? (
            <div className="p-5 pr-24 text-sm text-[#aeaeb2]">Loading original content...</div>
          ) : content.status === "error" ? (
            <div className="p-5 pr-24 text-sm text-[#ff9f0a]">{content.message}</div>
          ) : content.status === "ready" ? (
            <div className="min-w-max p-5 pr-24">
              <OriginalBody
                value={view === "request" ? content.requestBody : content.responseBody}
              />
            </div>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
