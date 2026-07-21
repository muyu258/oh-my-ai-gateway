import { authByToken } from "#/auth/auth";
import { normalizeGatewayError } from "#/infra/gateway/errors/gateway-error";
import { adapters, openaiCompatibleAdapter } from "#/infra/gateway/protocol/adapter";
import { analyzeProtocolByHeaders } from "#/infra/gateway/protocol/protocol.helpers";
import { ProtocolType } from "#/infra/gateway/protocol/protocol.types";
import { providers } from "#/infra/gateway/provider/provider.config";
import { forEnabled, forProtocols } from "#/infra/gateway/provider/provider.helpers";
import { pipe } from "es-toolkit/fp";

export const GET = async (request: Request): Promise<Response> => {
  let createErrorResponse = openaiCompatibleAdapter.responseAdapter.createErrorResponse;

  try {
    const protocol = analyzeProtocolByHeaders(request);
    const {
      requestAdapter: { getGatewayToken },
      responseAdapter: { createModelsResponse },
    } = adapters[protocol];
    createErrorResponse = adapters[protocol].responseAdapter.createErrorResponse;
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
    return pipe(error, normalizeGatewayError, createErrorResponse);
  }
};
