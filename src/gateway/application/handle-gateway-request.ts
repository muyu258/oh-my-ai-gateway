import { pipe } from "es-toolkit/fp";
import { forEnabled, forModel, forProtocol, selectProvider } from "../provider/provider.helpers";
import { providers } from "../provider/provider.config";
import { ProtocolAdapter } from "../protocol/adapter/adapter.types";
import { gatewayErrorResponse } from "../errors/gateway-error";
import { authByToken } from "#/auth/auth";

export const handleGatewayRequest = async ({
  request,
  adapter: {
    requestAdapter: { getGatewayToken, getModel, requestTransformer },
    responseAdapter: { responseTransformer },
    protocolType,
  },
}: {
  request: Request;
  adapter: ProtocolAdapter;
}): Promise<Response> => {
  const correlationId = crypto.randomUUID();

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
    return gatewayErrorResponse(error, correlationId);
  }
};
