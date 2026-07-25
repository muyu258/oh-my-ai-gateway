import { ProtocolType } from "./protocol.types";

// This registry is the single source for protocol labels, endpoints, and UI option ordering.
export const protocolRegistry = {
  [ProtocolType.OpenaiCompatible]: {
    label: "Chat Completions",
    defaultEndpoint: "/v1/chat/completions",
  },
  [ProtocolType.OpenaiResponse]: {
    label: "Responses",
    defaultEndpoint: "/v1/responses",
  },
  [ProtocolType.Anthropic]: {
    label: "Anthropic Messages",
    defaultEndpoint: "/v1/messages",
  },
} as const satisfies Record<ProtocolType, { label: string; defaultEndpoint: string }>;

export const protocolTypes = [
  ProtocolType.OpenaiCompatible,
  ProtocolType.OpenaiResponse,
  ProtocolType.Anthropic,
] as const;

export const protocolOptions = protocolTypes.map((value) => ({
  value,
  ...protocolRegistry[value],
}));

export const isProtocolType = (value: unknown): value is ProtocolType =>
  typeof value === "string" && Object.hasOwn(protocolRegistry, value);
