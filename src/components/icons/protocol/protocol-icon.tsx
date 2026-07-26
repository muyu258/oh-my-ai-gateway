import type { ComponentType } from "react";

import { ProtocolType } from "#/lib/protocol/protocol.types";
import { protocolRegistry } from "#/lib/protocol/protocol.registry";
import { AnthropicIcon } from "./anthropic-icon";
import { OpenaiCompatibleIcon } from "./openai-compatible-icon";
import { OpenaiResponseIcon } from "./openai-response-icon";
import type { ProtocolBrandIconProps } from "./protocol-icon.types";

const protocolIcons: Record<ProtocolType, ComponentType<ProtocolBrandIconProps>> = {
  [ProtocolType.OpenaiCompatible]: OpenaiCompatibleIcon,
  [ProtocolType.OpenaiResponse]: OpenaiResponseIcon,
  [ProtocolType.Anthropic]: AnthropicIcon,
};

const protocolLabels: Record<ProtocolType, string> = {
  [ProtocolType.OpenaiCompatible]: protocolRegistry[ProtocolType.OpenaiCompatible].label,
  [ProtocolType.OpenaiResponse]: protocolRegistry[ProtocolType.OpenaiResponse].label,
  [ProtocolType.Anthropic]: protocolRegistry[ProtocolType.Anthropic].label,
};

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
