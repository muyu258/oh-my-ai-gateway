import { ProtocolAdapter } from "./adapter.types";
import { openaiCompatibleAdapter } from "./impl/openai-compatible";
import { openaiResponseAdapter } from "./impl/openai-response";
import { anthropicAdapter } from "./impl/anthropic";
import { ProtocolType } from "../protocol.types";

export const adapters: Record<ProtocolType, ProtocolAdapter> = {
  [ProtocolType.OpenAiCompatible]: openaiCompatibleAdapter,
  [ProtocolType.OpenaiResponse]: openaiResponseAdapter,
  [ProtocolType.Anthropic]: anthropicAdapter,
};
