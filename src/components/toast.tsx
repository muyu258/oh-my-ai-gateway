"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { useEffect } from "react";

export type ToastMessage = {
  id: number;
  type: "success" | "error";
  title: string;
  description: string;
};

export function Toast({ message, onClose }: { message: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timeout);
  }, [message.id, onClose]);

  const successful = message.type === "success";

  return (
    <div
      role={successful ? "status" : "alert"}
      className="fixed bottom-5 right-5 z-[80] flex w-[min(24rem,calc(100vw-2.5rem))] items-start gap-3 rounded-lg border border-[#d0d5dd] bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.18)]"
    >
      {successful ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#039855]" aria-hidden="true" />
      ) : (
        <XCircle className="mt-0.5 size-5 shrink-0 text-[#d92d20]" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#101828]">{message.title}</p>
        <p className="mt-1 text-sm leading-5 text-[#667085]">{message.description}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        title="Dismiss"
        className="flex size-6 shrink-0 items-center justify-center text-[#98a2b3] transition hover:text-[#344054]"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
