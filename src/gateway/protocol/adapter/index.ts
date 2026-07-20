import { anthropicAdapter } from "./impl/anthropic";
import { openaiCompatibleAdapter } from "./impl/openai-compatible";
import { openaiResponseAdapter } from "./impl/openai-response";
import type { ProtocolAdapter } from "./adapter.types";
import { ProtocolType } from "../protocol.types";

export { openaiCompatibleAdapter } from "./impl/openai-compatible";
export { openaiResponseAdapter } from "./impl/openai-response";
export { anthropicAdapter } from "./impl/anthropic";

export const adapters: Record<ProtocolType, ProtocolAdapter> = {
  [ProtocolType.OpenaiCompatible]: openaiCompatibleAdapter,
  [ProtocolType.OpenaiResponse]: openaiResponseAdapter,
  [ProtocolType.Anthropic]: anthropicAdapter,
};
