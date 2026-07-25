import { authByToken } from "#/lib/auth/auth";
import { getProviders } from "#/lib/database/provider.repository";
import { normalizeGatewayError } from "#/lib/errors/gateway-error";
import { adapters, openaiCompatibleAdapter } from "#/lib/protocol/adapter";
import { analyzeProtocol } from "#/lib/protocol/protocol.helpers";
import { ProtocolType } from "#/lib/protocol/protocol.types";
import { forEnabled, forProtocols } from "#/lib/provider/provider.helpers";
import { pipe } from "es-toolkit/fp";

export const GET = async (request: Request): Promise<Response> => {
  let createErrorResponse = openaiCompatibleAdapter.createErrorResponse;

  try {
    const protocol = analyzeProtocol(request);
    const { getToken, createModelsResponse } = adapters[protocol];
    createErrorResponse = adapters[protocol].createErrorResponse;
    authByToken(getToken(request));
    const providers = await getProviders();

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
    return pipe(error, normalizeGatewayError, createErrorResponse);
  }
};
