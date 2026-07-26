import { authByToken } from "#/lib/auth/auth";
import { getProviders } from "#/lib/database/provider.repository";
import { normalizeGatewayError } from "#/lib/errors/gateway-error";
import { adapters, openaiCompatibleAdapter } from "#/lib/protocol/adapter";
import { analyzeProtocol } from "#/lib/protocol/protocol.helpers";
import { ProtocolType } from "#/lib/protocol/protocol.types";
import { pipe } from "es-toolkit/fp";

export const GET = async (request: Request): Promise<Response> => {
  let createErrorResponse = openaiCompatibleAdapter.createErrorResponse;

  try {
    const protocol = analyzeProtocol(request);
    const { getToken, createModelsResponse } = adapters[protocol];
    createErrorResponse = adapters[protocol].createErrorResponse;
    authByToken(getToken(request));
    const providers = await getProviders();
    const protocols =
      protocol === ProtocolType.OpenaiCompatible
        ? [ProtocolType.OpenaiResponse, ProtocolType.OpenaiCompatible]
        : [ProtocolType.Anthropic];

    return createModelsResponse(
      providers.filter(
        (provider) =>
          provider.enabled && protocols.some((type) => provider.protocols[type]?.enabled),
      ),
    );
  } catch (error) {
    return pipe(error, normalizeGatewayError, createErrorResponse);
  }
};
