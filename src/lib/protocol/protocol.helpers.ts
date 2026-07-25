import { ProtocolType } from "./protocol.types";
import { GatewayError, GatewayErrorCode } from "../errors/gateway-error";

export const analyzeProtocol = ({ headers }: Request): ProtocolType => {
  const hasAuthorization = Boolean(headers.get("authorization")?.trim());
  const hasAnthropicApiKey = Boolean(headers.get("x-api-key")?.trim());

  if (hasAuthorization === hasAnthropicApiKey) {
    throw new GatewayError(
      GatewayErrorCode.InvalidRequest,
      "Exactly one protocol authentication header is required",
    );
  }

  return hasAnthropicApiKey ? ProtocolType.Anthropic : ProtocolType.OpenaiCompatible;
};
