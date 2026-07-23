import type { ComponentType } from "react";

import { ProtocolType } from "#/infra/gateway/protocol/protocol.types";
import { AnthropicIcon } from "./anthropic-icon";
import { OpenaiCompatibleIcon } from "./openai-compatible-icon";
import { OpenaiResponseIcon } from "./openai-response-icon";
import type { ProtocolBrandIconProps } from "./protocol-icon.types";

const protocolIcons: Record<ProtocolType, ComponentType<ProtocolBrandIconProps>> = {
  [ProtocolType.OpenaiCompatible]: OpenaiCompatibleIcon,
  [ProtocolType.OpenaiResponse]: OpenaiResponseIcon,
  [ProtocolType.Anthropic]: AnthropicIcon,
};

export const protocolLabels: Record<ProtocolType, string> = {
  [ProtocolType.OpenaiCompatible]: "OpenAI · Chat Completions",
  [ProtocolType.OpenaiResponse]: "Codex · Responses",
  [ProtocolType.Anthropic]: "Anthropic Messages",
};

export const isProtocolType = (value: unknown): value is ProtocolType =>
  typeof value === "string" && Object.hasOwn(protocolIcons, value);

export function ProtocolIcon({
  protocol,
  size = 18,
  className = "",
  decorative = false,
}: {
  protocol: ProtocolType;
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  const Icon = protocolIcons[protocol];
  const label = protocolLabels[protocol];

  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      title={decorative ? undefined : label}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[#475467] ${className}`}
    >
      <Icon size={size} />
    </span>
  );
}
