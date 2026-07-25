import { authByToken } from "#/auth/auth";
import { getProviders } from "#/infra/database/provider.repository";
import { normalizeGatewayError } from "#/infra/gateway/errors/gateway-error";
import { adapters, openaiCompatibleAdapter } from "#/infra/gateway/protocol/adapter";
import { analyzeProtocol } from "#/infra/gateway/protocol/protocol.helpers";
import { ProtocolType } from "#/infra/gateway/protocol/protocol.types";
import { forEnabled, forProtocols } from "#/infra/gateway/provider/provider.helpers";
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
