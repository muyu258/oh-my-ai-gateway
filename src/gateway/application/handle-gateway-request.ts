import { pipe } from "es-toolkit/fp";
import { forEnabled, forModel, forProtocol, selectProvider } from "../provider/provider.helpers";
import { providers } from "../provider/provider.config";
import { ProtocolAdapter } from "../protocol/adapter/adapter.types";
import { normalizeGatewayError } from "../errors/gateway-error";
import { authByToken } from "#/auth/auth";

export const handleGatewayRequest = async ({
  request,
  adapter: {
    requestAdapter: { getGatewayToken, getModel, requestTransformer },
    responseAdapter: { responseTransformer, createErrorResponse },
    protocolType,
  },
}: {
  request: Request;
  adapter: ProtocolAdapter;
}): Promise<Response> => {
  try {
    pipe(request, getGatewayToken, authByToken);
    const { providerToken, baseUrl } = pipe(
      providers,
      forEnabled,
      forProtocol(protocolType),
      forModel(await getModel(request)),
      selectProvider,
    );

    const upstreamRequest = requestTransformer({
      request,
      options: {
        baseUrl,
        providerToken,
      },
    });

    const upstreamResponse = await fetch(upstreamRequest);

    return responseTransformer(upstreamResponse);
  } catch (error) {
    return pipe(error, normalizeGatewayError, createErrorResponse);
  }
};
