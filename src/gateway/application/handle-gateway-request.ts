import { pipe } from "es-toolkit/fp";
import { forEnabled, forModel, forProtocol, selectProvider } from "../provider/provider.helpers";
import { providers } from "../provider/provider.config";
import { ProtocolAdapter } from "../protocol/adapter/adapter.types";
import { gatewayErrorResponse } from "../errors/gateway-error";

export const handleGatewayRequest = async ({
  request,
  adapter,
}: {
  request: Request;
  adapter: ProtocolAdapter;
}): Promise<Response> => {
  const correlationId = crypto.randomUUID();
  const {
    requestAdapter: { getModel, requestTransformer },
    responseAdapter: { responseTransformer },
    protocolType,
  } = adapter;

  try {
    const model = await getModel(request);
    const { apiKey, baseUrl } = pipe(
      providers,
      forEnabled,
      forProtocol(protocolType),
      forModel(model),
      selectProvider,
    );

    const upstreamRequest = requestTransformer({
      request,
      options: {
        apiKey,
        baseUrl,
      },
    });

    const upstreamResponse = await fetch(upstreamRequest);
    return responseTransformer(upstreamResponse);
  } catch (error) {
    return gatewayErrorResponse(error, correlationId);
  }
};
