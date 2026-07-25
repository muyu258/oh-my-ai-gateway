"use client";

import { ChevronDown, Download, LoaderCircle, PlugZap } from "lucide-react";
import { useState } from "react";

import { FloatingInput } from "#/components/floating-input";
import { ProtocolIcon } from "#/components/icons/protocol";
import { protocolOptions } from "#/lib/protocol/protocol.registry";
import type { ProtocolType } from "#/lib/protocol/protocol.types";
import type { ProviderFormInput } from "../provider-form.types";

export type ProtocolAction = {
  protocol: ProtocolType;
  type: "test" | "models";
};

export function ProtocolBindingEditor({
  form,
  hasPersistedProvider,
  pending,
  activeAction,
  onChange,
  onAction,
}: {
  form: ProviderFormInput;
  hasPersistedProvider: boolean;
  pending: boolean;
  activeAction: ProtocolAction | null;
  onChange: (form: ProviderFormInput) => void;
  onAction: (protocol: ProtocolType, type: ProtocolAction["type"]) => void;
}) {
  const [expandedProtocol, setExpandedProtocol] = useState<ProtocolType | null>(null);

  return (
    <div className="space-y-1.5">
      {protocolOptions.map((option) => {
        const protocolConfig = form.protocols[option.value];
        const checked = protocolConfig?.enabled ?? false;
        const expanded = checked && expandedProtocol === option.value;
        const actionPending = activeAction?.protocol === option.value && pending;
        const toggleProtocol = () => {
          onChange({
            ...form,
            protocols: {
              ...form.protocols,
              [option.value]: {
                endpoint: protocolConfig?.endpoint ?? "",
                enabled: !checked,
              },
            },
          });
          if (checked && expandedProtocol === option.value) setExpandedProtocol(null);
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

              <div className="relative ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!hasPersistedProvider || !checked || pending}
                  onClick={() => onAction(option.value, "test")}
                  aria-label={hasPersistedProvider ? "Test connection" : "Save provider first"}
                  title={hasPersistedProvider ? "Test connection" : "Save provider first"}
                  className="flex size-8 items-center justify-center rounded-md text-[#667085] transition hover:bg-white hover:text-[#344054] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {actionPending && activeAction?.type === "test" ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <PlugZap className="size-4" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  disabled={!hasPersistedProvider || !checked || pending}
                  onClick={() => onAction(option.value, "models")}
                  aria-label={hasPersistedProvider ? "Get models" : "Save provider first"}
                  title={hasPersistedProvider ? "Get models" : "Save provider first"}
                  className="flex size-8 items-center justify-center rounded-md text-[#667085] transition hover:bg-white hover:text-[#344054] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {actionPending && activeAction?.type === "models" ? (
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
                    value={protocolConfig?.endpoint ?? ""}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        protocols: {
                          ...form.protocols,
                          [option.value]: {
                            endpoint: event.target.value,
                            enabled: protocolConfig?.enabled ?? true,
                          },
                        },
                      })
                    }
                    maxLength={2048}
                    placeholder={option.defaultEndpoint}
                    inputClassName="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
