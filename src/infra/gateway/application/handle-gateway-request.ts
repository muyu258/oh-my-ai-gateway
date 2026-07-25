import { pipe } from "es-toolkit/fp";
import { forEnabled, forModel, forProtocol, selectProvider } from "../provider/provider.helpers";
import { getProviders } from "#/infra/database/provider.repository";
import type { ProtocolAdapter } from "../protocol/adapter/adapter.types";
import { normalizeGatewayError } from "../errors/gateway-error";
import { authByToken } from "#/auth/auth";
import { trackUsage } from "../usage/tracker";

export const handleGatewayRequest = async ({
  request,
  adapter,
}: {
  request: Request;
  adapter: ProtocolAdapter;
}): Promise<Response> => {
  const { getModel, getToken, protocolType, transformer, createErrorResponse } = adapter;

  try {
    pipe(request, getToken, authByToken);

    const model = await getModel(request);
    const providers = await getProviders();
    const matchProviders = pipe(providers, forEnabled, forProtocol(protocolType), forModel(model));
    const provider = selectProvider(matchProviders, {
      name: request.headers.get("x-provider-name"),
    });
    const { baseUrl, token, protocols } = provider;
    const response = await fetch(
      transformer({
        request,
        options: {
          baseUrl: baseUrl || undefined,
          endpoint: protocols[protocolType]?.endpoint || undefined,
          token,
        },
      }),
    );
    trackUsage(request, response, adapter, provider);
    return response;
  } catch (error) {
    return pipe(error, normalizeGatewayError, createErrorResponse);
  }
};
