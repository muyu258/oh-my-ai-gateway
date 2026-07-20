import { authByToken } from "#/auth/auth";
import { gatewayErrorResponse } from "#/gateway/errors/gateway-error";
import { adapters } from "#/gateway/protocol/adapter";
import { analyzeProtocolByHeaders } from "#/gateway/protocol/protocol.helpers";
import { ProtocolType } from "#/gateway/protocol/protocol.types";
import { providers } from "#/gateway/provider/provider.config";
import { forEnabled, forProtocols } from "#/gateway/provider/provider.helpers";
import { pipe } from "es-toolkit/fp";

export const GET = async (request: Request): Promise<Response> => {
  const correlationId = crypto.randomUUID();

  try {
    const protocol = analyzeProtocolByHeaders(request);
    const {
      requestAdapter: { getGatewayToken },
      responseAdapter: { createModelsResponse },
    } = adapters[protocol];
    authByToken(getGatewayToken(request));

    return pipe(
      providers,
      forEnabled,
      forProtocols(
        protocol === ProtocolType.OpenaiCompatible
          ? [ProtocolType.OpenaiResponse, ProtocolType.OpenaiCompatible]
          : [ProtocolType.Anthropic],
      ),
      createModelsResponse,
    );
  } catch (error) {
    return gatewayErrorResponse(error, correlationId);
  }
};
